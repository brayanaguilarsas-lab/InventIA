import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getTemplate, renderTemplate } from '@/lib/templates';

interface ActaEntregaData {
  tipo: 'entrega' | 'devolucion';
  // Activo
  assetCode: string;
  assetName: string;
  categoryName: string;
  commercialValue: number;
  specificFields: Record<string, unknown>;
  // Persona
  personName: string;
  personIdType: string;
  personIdNumber: string;
  personArea: string;
  personPosition: string;
  personEmail: string;
  // Asignación
  date: string;
  assignedBy: string;
  // Devolución
  returnCondition?: string;
  damageDescription?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateActaPDF(data: ActaEntregaData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Letter size
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 60;
  let y = height - margin;
  const lineHeight = 18;
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  function drawText(text: string, x: number, yPos: number, options?: { font?: typeof font; size?: number; color?: typeof black }) {
    page.drawText(text, {
      x,
      y: yPos,
      font: options?.font ?? font,
      size: options?.size ?? 10,
      color: options?.color ?? black,
    });
  }

  function drawLine(yPos: number) {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  // Header
  const title = data.tipo === 'entrega'
    ? 'ACTA DE ENTREGA DE ACTIVO'
    : 'ACTA DE DEVOLUCIÓN Y PAZ Y SALVO';

  drawText('SALEADS CORP', margin, y, { font: fontBold, size: 14 });
  y -= lineHeight;
  drawText('InventIA — Gestión inteligente de activos', margin, y, { size: 9, color: gray });
  y -= lineHeight * 2;

  drawText(title, margin, y, { font: fontBold, size: 13 });
  y -= lineHeight;
  drawLine(y);
  y -= lineHeight;

  // Date and reference
  drawText(`Fecha: ${formatDate(data.date)}`, margin, y, { size: 10 });
  drawText(`Código Activo: ${data.assetCode}`, width / 2, y, { font: fontBold, size: 10 });
  y -= lineHeight * 2;

  // Asset section
  drawText('INFORMACIÓN DEL ACTIVO', margin, y, { font: fontBold, size: 11 });
  y -= lineHeight;
  drawLine(y);
  y -= lineHeight;

  const fields = [
    ['Nombre', data.assetName],
    ['Categoría', data.categoryName],
    ['Código', data.assetCode],
    ['Valor Comercial', formatCurrency(data.commercialValue)],
  ];

  // Add specific fields
  for (const [key, value] of Object.entries(data.specificFields)) {
    if (value) {
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      fields.push([label, String(value)]);
    }
  }

  for (const [label, value] of fields) {
    drawText(`${label}:`, margin, y, { font: fontBold, size: 9 });
    drawText(String(value), margin + 130, y, { size: 9 });
    y -= lineHeight;
  }

  y -= lineHeight;

  // Person section
  const personTitle = data.tipo === 'entrega' ? 'RECEPTOR DEL ACTIVO' : 'PERSONA QUE DEVUELVE';
  drawText(personTitle, margin, y, { font: fontBold, size: 11 });
  y -= lineHeight;
  drawLine(y);
  y -= lineHeight;

  const personFields = [
    ['Nombre Completo', data.personName],
    ['Identificación', `${data.personIdType} ${data.personIdNumber}`],
    ['Área', data.personArea],
    ['Cargo', data.personPosition],
    ['Correo', data.personEmail],
  ];

  for (const [label, value] of personFields) {
    drawText(`${label}:`, margin, y, { font: fontBold, size: 9 });
    drawText(value, margin + 130, y, { size: 9 });
    y -= lineHeight;
  }

  y -= lineHeight;

  // Return condition (for devolucion only)
  if (data.tipo === 'devolucion') {
    drawText('ESTADO DE DEVOLUCIÓN', margin, y, { font: fontBold, size: 11 });
    y -= lineHeight;
    drawLine(y);
    y -= lineHeight;

    const condition = data.returnCondition === 'bueno' ? 'Bueno — Sin novedades' : 'Con daños';
    drawText('Estado:', margin, y, { font: fontBold, size: 9 });
    drawText(condition, margin + 130, y, { size: 9 });
    y -= lineHeight;

    if (data.damageDescription) {
      drawText('Novedades:', margin, y, { font: fontBold, size: 9 });
      y -= lineHeight;

      // Word wrap for damage description
      const words = data.damageDescription.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        if (font.widthOfTextAtSize(testLine, 9) > width - margin * 2 - 20) {
          drawText(line, margin + 10, y, { size: 9 });
          y -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        drawText(line, margin + 10, y, { size: 9 });
        y -= lineHeight;
      }
    }

    y -= lineHeight;

    // Paz y salvo text (plantilla editable desde Configuración → Formatos)
    drawText('PAZ Y SALVO', margin, y, { font: fontBold, size: 11 });
    y -= lineHeight;
    drawLine(y);
    y -= lineHeight;

    const pazTpl = await getTemplate('pdf_paz_salvo');
    const pazText = renderTemplate(pazTpl.body, {
      personName: data.personName,
      personIdType: data.personIdType,
      personIdNumber: data.personIdNumber,
      assetCode: data.assetCode,
      assetName: data.assetName,
      date: formatDate(data.date),
    });

    const pazWords = pazText.split(' ');
    let pazLine = '';
    for (const word of pazWords) {
      const testLine = pazLine + (pazLine ? ' ' : '') + word;
      if (font.widthOfTextAtSize(testLine, 9) > width - margin * 2) {
        drawText(pazLine, margin, y, { size: 9 });
        y -= lineHeight;
        pazLine = word;
      } else {
        pazLine = testLine;
      }
    }
    if (pazLine) {
      drawText(pazLine, margin, y, { size: 9 });
      y -= lineHeight;
    }

    y -= lineHeight;
  }

  // Responsibility clause (plantilla editable desde Configuración → Formatos)
  if (data.tipo === 'entrega') {
    drawText('COMPROMISO DE RESPONSABILIDAD', margin, y, { font: fontBold, size: 11 });
    y -= lineHeight;
    drawLine(y);
    y -= lineHeight;

    const clauseTpl = await getTemplate('pdf_clausula_entrega');
    const clause = renderTemplate(clauseTpl.body, {
      personName: data.personName,
      personIdType: data.personIdType,
      personIdNumber: data.personIdNumber,
      assetCode: data.assetCode,
      assetName: data.assetName,
      date: formatDate(data.date),
    });

    const clauseWords = clause.split(' ');
    let clauseLine = '';
    for (const word of clauseWords) {
      const testLine = clauseLine + (clauseLine ? ' ' : '') + word;
      if (font.widthOfTextAtSize(testLine, 9) > width - margin * 2) {
        drawText(clauseLine, margin, y, { size: 9 });
        y -= lineHeight;
        clauseLine = word;
      } else {
        clauseLine = testLine;
      }
    }
    if (clauseLine) {
      drawText(clauseLine, margin, y, { size: 9 });
      y -= lineHeight;
    }

    y -= lineHeight;
  }

  // Signatures
  y -= lineHeight * 2;
  drawLine(y + lineHeight);

  const sigWidth = (width - margin * 2 - 40) / 2;

  // Left signature
  page.drawLine({
    start: { x: margin, y: y - 30 },
    end: { x: margin + sigWidth, y: y - 30 },
    thickness: 0.5,
    color: black,
  });
  drawText(data.tipo === 'entrega' ? 'Recibe — ' + data.personName : 'Devuelve — ' + data.personName, margin, y - 45, { size: 8 });
  drawText(`${data.personIdType} ${data.personIdNumber}`, margin, y - 57, { size: 8, color: gray });

  // Right signature
  const rightX = margin + sigWidth + 40;
  page.drawLine({
    start: { x: rightX, y: y - 30 },
    end: { x: rightX + sigWidth, y: y - 30 },
    thickness: 0.5,
    color: black,
  });
  drawText('Entrega — ' + data.assignedBy, rightX, y - 45, { size: 8 });
  drawText('Saleads Corp', rightX, y - 57, { size: 8, color: gray });

  // Footer
  drawText(
    `Documento generado automáticamente — InventIA — ${new Date().toLocaleDateString('es-CO')}`,
    margin,
    30,
    { size: 7, color: gray }
  );

  return doc.save();
}
