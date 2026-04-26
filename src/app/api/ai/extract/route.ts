import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB por archivo
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB total
const MAX_FILES = 3;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);

// Rate limit en memoria por usuario (resetea con cada redeploy o tras 1h)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_MAX = 10; // 10 extracciones por hora

function checkRateLimit(userId: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return { ok: true, retryAfterSec: 0 };
  }
  if (entry.count >= RATE_MAX) {
    const retryAfterSec = Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000);
    return { ok: false, retryAfterSec };
  }
  entry.count++;
  return { ok: true, retryAfterSec: 0 };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 extracciones / hora / usuario
    const rl = checkRateLimit(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${RATE_MAX} extracciones por hora. Intenta de nuevo en ${Math.ceil(rl.retryAfterSec / 60)} min.`,
        },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const fieldsSchema = formData.get('fields_schema') as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES} archivos por extracción` },
        { status: 400 }
      );
    }

    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `"${file.name}" supera el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB por archivo` },
          { status: 413 }
        );
      }
      totalSize += file.size;
      const type = (file.type || '').toLowerCase();
      const isPdfByName = file.name.toLowerCase().endsWith('.pdf');
      if (!ALLOWED_MIME.has(type) && !isPdfByName) {
        return NextResponse.json(
          { error: `Formato no permitido para "${file.name}". Solo imágenes (JPG/PNG/WebP) y PDF.` },
          { status: 400 }
        );
      }
    }
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: `Tamaño total supera ${MAX_TOTAL_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // Convert files to base64 for Claude Vision (images + PDFs)
    const contentBlocks: (Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam)[] = [];
    for (const file of files.slice(0, 3)) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const type = file.type || '';
      if (type.startsWith('image/')) {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        });
      } else if (type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        contentBlocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        });
      }
    }

    if (contentBlocks.length === 0) {
      return NextResponse.json(
        { error: 'Formato no soportado. Sube imágenes (JPG/PNG) o PDFs.' },
        { status: 400 }
      );
    }

    const schemaInfo = fieldsSchema
      ? `\n\nCampos específicos esperados: ${fieldsSchema}`
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            ...contentBlocks,
            {
              type: 'text',
              text: `Analiza las imágenes proporcionadas (pueden ser facturas, fotos de productos o fichas técnicas) y extrae la siguiente información para un sistema de inventario de activos empresariales.

Responde SIEMPRE en formato JSON con esta estructura:
{
  "name": "nombre descriptivo del activo",
  "category_suggestion": "Tecnología | Mobiliario | Vehículos | Electrodomésticos",
  "commercial_value": número o null,
  "purchase_date": "YYYY-MM-DD" o null,
  "supplier": "nombre/razón social del proveedor tomado de la factura" o null,
  "specific_fields": {
    "marca": "...",
    "modelo": "...",
    "serial": "...",
    // otros campos según la categoría detectada
  },
  "alerts": ["campo X no identificado porque...", ...]
}

Si no puedes identificar un campo con certeza, inclúyelo en "alerts" explicando por qué no fue posible extraerlo.${schemaInfo}

Responde SOLO con el JSON, sin texto adicional.`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'No se pudo extraer información', alerts: ['La IA no pudo procesar los documentos'] },
        { status: 200 }
      );
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json(extracted);
  } catch (error) {
    console.error('AI extraction error:', error);
    const msg = error instanceof Error ? error.message : 'Error en la extracción con IA';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
