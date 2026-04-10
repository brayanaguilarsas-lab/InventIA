import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const fieldsSchema = formData.get('fields_schema') as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 });
    }

    // Convert files to base64 for Claude Vision
    const imageContents: Anthropic.ImageBlockParam[] = [];
    for (const file of files.slice(0, 3)) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

      if (file.type.startsWith('image/')) {
        imageContents.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
      }
    }

    const schemaInfo = fieldsSchema
      ? `\n\nCampos específicos esperados: ${fieldsSchema}`
      : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: `Analiza las imágenes proporcionadas (pueden ser facturas, fotos de productos o fichas técnicas) y extrae la siguiente información para un sistema de inventario de activos empresariales.

Responde SIEMPRE en formato JSON con esta estructura:
{
  "name": "nombre descriptivo del activo",
  "category_suggestion": "Tecnología | Mobiliario | Vehículos | Electrodomésticos",
  "commercial_value": número o null,
  "purchase_date": "YYYY-MM-DD" o null,
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
    return NextResponse.json(
      { error: 'Error en la extracción con IA' },
      { status: 500 }
    );
  }
}
