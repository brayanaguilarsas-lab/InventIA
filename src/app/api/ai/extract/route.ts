import { NextResponse } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';
import { jsonrepair } from 'jsonrepair';
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

// Modelo de Gemini para extracción multimodal. Flash es muy barato y soporta
// vision + responseMimeType:'application/json'. gemini-2.0-flash quedó
// deprecado para cuentas nuevas — usamos 2.5-flash que es el sucesor directo.
const GEMINI_MODEL = 'gemini-2.5-flash';

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

const SYSTEM_INSTRUCTION = `Eres un asistente experto en extraer datos de facturas, fotos de productos y fichas técnicas para un sistema de inventario de activos empresariales colombiano (moneda COP).

REGLAS:
- Lee TODO el documento con atención. Las facturas colombianas suelen tener: razón social del proveedor, NIT, fecha de expedición, descripción del producto, valor unitario, valor total, IVA.
- "name": describe el activo concreto (ej. "MacBook Pro 14 M3", "Silla ejecutiva ergonómica", no "Equipo" genérico).
- "commercial_value": el valor TOTAL del activo en pesos colombianos como número entero, sin separadores. Ej: 7500000. Si la factura tiene varios items, suma o usa el más relevante.
- "purchase_date": fecha de compra/expedición de la factura en formato YYYY-MM-DD.
- "supplier": razón social del PROVEEDOR (quien vende), no del comprador.
- "category_suggestion": elige UNA de: "Tecnología", "Mobiliario", "Vehículos", "Electrodomésticos".
- "specific_fields": objeto con marca, modelo, serial y demás datos específicos del activo.
- "alerts": lista de campos que NO pudiste extraer y por qué. Si un campo se extrajo correctamente NO debe estar en alerts.

NUNCA devuelvas todos los campos como null sin explicar en alerts. Si el documento no es legible, di explícitamente "documento no legible" en alerts.`;

const PROMPT = `Extrae los datos del/los documento(s) adjunto(s) y devuelve UN ÚNICO JSON con esta estructura exacta:

{
  "name": "nombre descriptivo del activo principal de la factura (ej: 'Celular Xiaomi Redmi 15C 256GB Verde Menta')",
  "category_suggestion": "Tecnología | Mobiliario | Vehículos | Electrodomésticos",
  "commercial_value": 3700125,
  "purchase_date": "2025-10-17",
  "supplier": "TEKNOSTAR SAS",
  "specific_fields": {
    "marca": "Xiaomi",
    "modelo": "Redmi 15C",
    "serial": "primer IMEI o serial del documento"
  },
  "alerts": ["solo si NO pudiste extraer algún campo, explica por qué aquí"]
}

Importante:
- Llena CADA campo con el dato extraído. Solo usa null si el dato realmente NO existe en el documento.
- commercial_value: número entero en pesos colombianos (sin separadores, sin símbolo $, sin comillas). Usa el TOTAL A PAGAR.
- purchase_date: formato YYYY-MM-DD desde la fecha de expedición de la factura.
- supplier: razón social del PROVEEDOR (quien emite la factura, NO el cliente).
- Si la factura tiene varios productos, describe el más relevante en "name".

Devuelve SOLO el JSON, sin markdown ni texto adicional.`;

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
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1, // baja para extracción determinística
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
        // Gemini 2.5 Flash trae "thinking" activado por defecto y consume
        // tokens del output. Para extracción estructurada no aporta y arruina
        // la respuesta — lo desactivamos.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const responseText = (response.text ?? '').trim();
    const finishReason = response.candidates?.[0]?.finishReason;

    if (!responseText) {
      console.error('[AI] Respuesta vacía de Gemini', {
        finishReason,
        promptFeedback: response.promptFeedback,
      });
      const reasonMsg =
        finishReason === 'SAFETY'
          ? 'La IA bloqueó el contenido por filtros de seguridad'
          : finishReason === 'MAX_TOKENS'
            ? 'La respuesta superó el límite de tokens (intenta con menos páginas)'
            : 'La IA no devolvió respuesta';
      return NextResponse.json(
        { error: reasonMsg, alerts: [reasonMsg] },
        { status: 200 }
      );
    }

    // Aunque pedimos JSON, defendemos parseo si vino con markdown fence.
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AI] Sin JSON parseable en respuesta:', responseText.slice(0, 1000));
      return NextResponse.json(
        {
          error: 'La IA no devolvió datos estructurados',
          alerts: ['Reintenta con una imagen más nítida o ingresa los datos manualmente'],
        },
        { status: 200 }
      );
    }

    // 1) Intento estricto. 2) Si falla, intento jsonrepair (arregla comillas
    // tipográficas, trailing commas, fences markdown, comentarios, strings sin
    // cerrar, etc. — los errores típicos de salida de LLMs).
    let extracted: unknown;
    try {
      extracted = JSON.parse(jsonMatch[0]);
    } catch (strictErr) {
      try {
        const repaired = jsonrepair(jsonMatch[0]);
        extracted = JSON.parse(repaired);
        console.warn('[AI] JSON requirió jsonrepair — respuesta original:', jsonMatch[0].slice(0, 500));
      } catch (repairErr) {
        console.error('[AI] JSON irrecuperable. Strict:', strictErr);
        console.error('[AI] Repair:', repairErr);
        console.error('[AI] Bruto:', jsonMatch[0].slice(0, 1500));
        return NextResponse.json(
          {
            error: 'La IA devolvió un JSON inválido',
            alerts: ['Reintenta con una imagen más legible o ingresa los datos manualmente'],
          },
          { status: 200 }
        );
      }
    }

    // Log del resultado para diagnosticar extracciones vacías o parciales.
    const summary = (() => {
      const x = extracted as Record<string, unknown>;
      return {
        name: typeof x.name === 'string' ? x.name.slice(0, 60) : x.name,
        category_suggestion: x.category_suggestion,
        commercial_value: x.commercial_value,
        purchase_date: x.purchase_date,
        supplier: typeof x.supplier === 'string' ? x.supplier.slice(0, 60) : x.supplier,
        specific_fields_keys: x.specific_fields ? Object.keys(x.specific_fields as object) : [],
        alerts_count: Array.isArray(x.alerts) ? x.alerts.length : 0,
      };
    })();
    console.log('[AI] extracción OK', summary);

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
    } else if (
      lower.includes('no longer available') ||
      lower.includes('deprecated') ||
      (lower.includes('model') && lower.includes('not found')) ||
      (lower.includes('model') && lower.includes('not supported')) ||
      lower.includes('404')
    ) {
      friendly = `El modelo "${GEMINI_MODEL}" no está disponible. Es probable que Google lo haya deprecado — contacta al administrador para actualizarlo.`;
      status = 500;
    }

    return NextResponse.json({ error: friendly }, { status });
  }
}
