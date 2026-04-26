import { NextResponse } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB por archivo
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB total
const MAX_FILES = 3;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

// Modelo de Gemini para extracción multimodal. Flash es ~30x más barato que
// Claude Sonnet con calidad muy comparable para tareas estructuradas.
// Cambiar a 'gemini-2.5-flash' cuando esté disponible para mayor calidad.
const GEMINI_MODEL = 'gemini-2.0-flash';

// Rate limit en memoria por usuario (resetea con cada redeploy o tras 1h)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_MAX = 20; // 20 extracciones por hora (Gemini Flash es barato, podemos ser generosos)

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

const PROMPT = `Analiza las imágenes/PDFs proporcionadas (pueden ser facturas, fotos de productos o fichas técnicas) y extrae la siguiente información para un sistema de inventario de activos empresariales.

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "name": "nombre descriptivo del activo",
  "category_suggestion": "Tecnología | Mobiliario | Vehículos | Electrodomésticos",
  "commercial_value": número o null,
  "purchase_date": "YYYY-MM-DD" o null,
  "supplier": "nombre/razón social del proveedor tomado de la factura" o null,
  "specific_fields": {
    "marca": "...",
    "modelo": "...",
    "serial": "..."
  },
  "alerts": ["campo X no identificado porque...", ...]
}

Si no puedes identificar un campo con certeza, inclúyelo en "alerts" explicando por qué no fue posible extraerlo. Responde SOLO con el JSON, sin markdown ni texto adicional.`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit por usuario
    const rl = checkRateLimit(user.id);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${RATE_MAX} extracciones por hora. Intenta de nuevo en ${Math.ceil(rl.retryAfterSec / 60)} min.`,
        },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    // Acepta cualquiera de los tres nombres por flexibilidad de configuración.
    const apiKey =
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_GENAI_API_KEY ??
      process.env.API_GEMINAI_GOOGLE;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }
    const genai = new GoogleGenAI({ apiKey });

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

    // Convertir archivos a inline parts para Gemini (base64 + mime).
    const parts: Part[] = [];
    for (const file of files.slice(0, MAX_FILES)) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const mimeType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
      parts.push({ inlineData: { data: base64, mimeType } });
    }

    if (parts.length === 0) {
      return NextResponse.json(
        { error: 'Formato no soportado. Sube imágenes (JPG/PNG) o PDFs.' },
        { status: 400 }
      );
    }

    const schemaInfo = fieldsSchema
      ? `\n\nCampos específicos esperados: ${fieldsSchema}`
      : '';
    parts.push({ text: PROMPT + schemaInfo });

    const response = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0.1, // baja para extracción determinística
        maxOutputTokens: 2000,
        responseMimeType: 'application/json', // fuerza JSON, evita markdown
      },
    });

    const responseText = response.text ?? '';

    // Aunque pedimos JSON, defendemos parseo si vino con markdown fence.
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        {
          error: 'No se pudo extraer información',
          alerts: ['La IA no pudo procesar los documentos'],
        },
        { status: 200 }
      );
    }

    let extracted: unknown;
    try {
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        {
          error: 'La IA devolvió un JSON inválido',
          alerts: ['Reintenta con una imagen más legible o ingresa los datos manualmente'],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(extracted);
  } catch (error) {
    console.error('AI extraction error:', error);
    const raw = error instanceof Error ? error.message : 'Error en la extracción con IA';
    const lower = raw.toLowerCase();

    let friendly = raw;
    let status = 500;

    if (
      lower.includes('quota') ||
      lower.includes('billing') ||
      lower.includes('credit')
    ) {
      friendly =
        'La cuenta de Google AI no tiene cuota disponible. ' +
        'Habilita facturación en aistudio.google.com o console.cloud.google.com.';
      status = 402;
    } else if (
      lower.includes('api key') ||
      lower.includes('api_key') ||
      lower.includes('permission denied') ||
      lower.includes('401') ||
      lower.includes('403')
    ) {
      friendly =
        'La GEMINI_API_KEY no es válida o no tiene permisos. ' +
        'Genera una nueva en aistudio.google.com/apikey y actualízala en Vercel.';
      status = 401;
    } else if (lower.includes('rate limit') || lower.includes('429') || lower.includes('resource_exhausted')) {
      friendly =
        'La cuenta de Google AI alcanzó su límite de uso por minuto. Espera un momento y vuelve a intentar.';
      status = 429;
    } else if (
      lower.includes('unavailable') ||
      lower.includes('overloaded') ||
      lower.includes('503')
    ) {
      friendly = 'El servicio de Gemini está temporalmente saturado. Intenta de nuevo en unos minutos.';
      status = 503;
    } else if (lower.includes('model') && (lower.includes('not found') || lower.includes('not supported'))) {
      friendly = `El modelo "${GEMINI_MODEL}" no está disponible en esta región/cuenta. Contacta al administrador.`;
      status = 500;
    }

    return NextResponse.json({ error: friendly }, { status });
  }
}
