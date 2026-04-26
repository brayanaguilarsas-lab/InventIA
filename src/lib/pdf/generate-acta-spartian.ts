import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ActaSpartianData {
  // Activo
  assetCode: string;
  assetName: string;
  assetType: string;
  brand?: string;
  model?: string;
  serial?: string;
  ram?: string;
  storage?: string;
  accessories?: string;
  commercialValue: number;
  // Persona
  personName: string;
  personIdType: string;
  personIdNumber: string;
  personPosition: string;
  // Asignación
  date: string;
  assignedBy: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatLongDate(dateStr: string) {
  const d = new Date(dateStr);
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  void dayNames;
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${d.getDate()} días del mes de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
}

export async function generateActaSpartianPDF(data: ActaSpartianData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 60;
  const contentWidth = pageWidth - margin * 2;
  const black = rgb(0, 0, 0);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPageIfNeeded(requiredSpace: number) {
    if (y - requiredSpace < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function writeWrapped(text: string, opts?: { size?: number; bold?: boolean; indent?: number }) {
    const size = opts?.size ?? 10;
    const useFont = opts?.bold ? fontBold : font;
    const indent = opts?.indent ?? 0;
    const maxWidth = contentWidth - indent;
    const words = text.split(/\s+/);
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (useFont.widthOfTextAtSize(trial, size) > maxWidth) {
        newPageIfNeeded(size + 4);
        page.drawText(line, { x: margin + indent, y, size, font: useFont, color: black });
        y -= size + 4;
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) {
      newPageIfNeeded(size + 4);
      page.drawText(line, { x: margin + indent, y, size, font: useFont, color: black });
      y -= size + 4;
    }
  }

  function bullet(text: string) {
    const size = 10;
    newPageIfNeeded(size + 4);
    page.drawText('•', { x: margin + 6, y, size, font, color: black });
    writeWrapped(text, { size, indent: 18 });
  }

  function heading(text: string) {
    y -= 8;
    newPageIfNeeded(16);
    writeWrapped(text, { size: 11, bold: true });
    y -= 2;
  }

  function spacer(space = 10) {
    y -= space;
  }

  // Title
  writeWrapped('ACTA DE ENTREGA Y COMODATO DE EQUIPO TECNOLÓGICO', { size: 13, bold: true });
  spacer(12);

  // Encabezado
  writeWrapped(
    `Entre: SALEADS CORP, una sociedad constituida de conformidad con las leyes del estado de la Florida (USA), ` +
    `de carácter comercial, identificada con EIN 41-266137, en adelante LA EMPRESA, y ${data.personName}, ` +
    `identificado(a) con ${data.personIdType} ${data.personIdNumber} en adelante EL USUARIO, se celebra la presente ` +
    `Acta de Entrega y Comodato de Equipo Tecnológico, bajo las siguientes cláusulas:`
  );
  spacer(6);

  // 1. Objeto del comodato
  heading('1. Objeto del comodato');
  writeWrapped(
    'LA EMPRESA entrega a EL USUARIO, en calidad de comodato, el siguiente equipo tecnológico para uso ' +
    'exclusivo en el desarrollo de sus funciones contractuales como prestador de servicios:'
  );
  spacer(4);
  bullet(`Tipo de equipo: ${data.assetType}`);
  if (data.brand) bullet(`Marca: ${data.brand}`);
  if (data.model) bullet(`Modelo: ${data.model}`);
  if (data.serial) bullet(`Serial No: ${data.serial}`);
  if (data.ram) bullet(`Capacidad de memoria RAM: ${data.ram}`);
  if (data.storage) bullet(`Capacidad del disco duro: ${data.storage}`);
  if (data.accessories) bullet(`Accesorios incluidos: ${data.accessories}`);
  bullet('Estado de entrega: Se entrega un equipo nuevo en todas sus características de software y físicas, sin signos de uso, rayones o defectos estéticos.');
  bullet(`Valor comercial estimado: ${formatCurrency(data.commercialValue)}`);
  spacer(4);
  writeWrapped('El equipo es propiedad de LA EMPRESA hasta que se cumplan las condiciones establecidas en este documento.');

  // 2. Condiciones de uso
  heading('2. Condiciones de uso');
  bullet('El equipo deberá ser utilizado únicamente para fines laborales, relacionados con las funciones asignadas por LA EMPRESA.');
  bullet('No está permitido el uso personal, recreativo o ajeno a las actividades de la organización.');
  bullet('No está autorizado retirar el equipo de las instalaciones de LA EMPRESA bajo ninguna circunstancia.');
  bullet('EL USUARIO podrá utilizar el equipo fuera del horario laboral, siempre que permanezca dentro de las instalaciones y su uso sea estrictamente laboral.');

  // 3. Cuidado
  heading('3. Cuidado, conservación y mantenimiento');
  bullet('LA EMPRESA asume únicamente los mantenimientos preventivos.');
  bullet('Los mantenimientos correctivos, daños, fallas por mal uso, descuido o manipulación inadecuada serán asumidos en su totalidad por EL USUARIO.');
  bullet('EL USUARIO se compromete a conservar el equipo en óptimas condiciones de funcionamiento, limpieza y seguridad.');

  // 4. Auditorías
  heading('4. Auditorías y revisiones');
  writeWrapped('LA EMPRESA podrá realizar, en cualquier momento y sin previo aviso, auditorías:');
  bullet('Físicas: estado del equipo, inventario, accesorios, desgaste, integridad del hardware.');
  bullet('Digitales: software instalado, uso del equipo, registros, configuraciones, seguridad informática.');
  writeWrapped('EL USUARIO acepta estas auditorías como condición del comodato.');

  // 5. Software
  heading('5. Instalación de software');
  bullet('Solo podrá instalarse software autorizado por LA EMPRESA.');
  bullet('Está prohibida la instalación de programas personales, no licenciados o que comprometan la seguridad del sistema.');
  bullet('Cualquier solicitud de instalación deberá ser aprobada por el área administrativa o de tecnología.');

  // 6. Claves
  heading('6. Manejo de claves y accesos');
  bullet('EL USUARIO deberá reportar inmediatamente al jefe inmediato y al área administrativa cualquier creación, modificación o pérdida de claves de acceso.');
  bullet('Está prohibido compartir contraseñas o accesos con terceros.');

  // 7. Fallas
  heading('7. Procedimiento ante fallas, daños o novedades');
  bullet('LA EMPRESA solo responde por fallas cubiertas por garantía de fábrica.');
  bullet('Cualquier novedad, daño, falla o comportamiento anormal del equipo debe ser reportado de forma inmediata, verbal y por escrito.');
  bullet('Si EL USUARIO no reporta la novedad, se presume su responsabilidad directa.');
  bullet('EL USUARIO deberá llevar el equipo a un centro autorizado de la marca, obtener cotización y asumir el costo de reparación y repuestos cuando aplique.');
  bullet('Si se evidencia mal uso, negligencia o incumplimiento de las condiciones de cuidado, EL USUARIO deberá asumir los costos correspondientes.');

  // 8. Pérdida
  heading('8. Pérdida, hurto o daño grave');
  writeWrapped('En caso de pérdida, hurto o daño grave:');
  bullet('EL USUARIO deberá informar de inmediato a LA EMPRESA.');
  bullet('Deberá presentar copia de denuncia ante la autoridad competente cuando aplique.');
  bullet('EL USUARIO autoriza expresamente a LA EMPRESA a realizar descuentos de su salario, honorarios o pagos pendientes para cubrir el valor del equipo, sus accesorios o las reparaciones necesarias.');

  // 9. Permanencia
  heading('9. Permanencia y transferencia de propiedad');
  bullet('Si EL USUARIO cumple dos (2) años continuos de uso del equipo y mantiene un desempeño adecuado, podrá quedarse con el equipo como beneficio.');
  bullet('Si EL USUARIO se retira antes de cumplir los dos años, deberá devolver el equipo en excelentes condiciones de funcionamiento y presentación.');
  bullet('LA EMPRESA evaluará el estado del equipo antes de autorizar su transferencia definitiva.');

  // 10. Confidencialidad
  heading('10. Confidencialidad y protección de datos');
  writeWrapped(
    'EL USUARIO reconoce que el equipo contiene información sensible, estratégica y confidencial de LA ' +
    'EMPRESA y de sus clientes. Por tanto:'
  );
  bullet('Se compromete a proteger toda la información almacenada o accesible desde el equipo.');
  bullet('No podrá copiar, transferir, divulgar o almacenar información en dispositivos personales.');
  bullet('Deberá cumplir las políticas de seguridad, privacidad y protección de datos de LA EMPRESA.');
  bullet('La violación de esta cláusula constituye falta grave y puede generar acciones legales.');

  // 11. Devolución
  heading('11. Devolución del equipo');
  writeWrapped('EL USUARIO deberá devolver el equipo cuando:');
  bullet('Finalice su contrato laboral o de prestación de servicios.');
  bullet('LA EMPRESA lo solicite por razones operativas o disciplinarias.');
  bullet('Se incumplan las condiciones del comodato.');
  writeWrapped('La devolución debe hacerse con todos los accesorios, en perfecto estado de funcionamiento y limpieza.');

  // 12. Descuentos
  heading('12. Autorización de descuentos');
  writeWrapped('EL USUARIO autoriza de manera expresa, voluntaria e irrevocable a LA EMPRESA a realizar descuentos por:');
  bullet('Pérdida o hurto del equipo.');
  bullet('Daños por mal uso, negligencia o incumplimiento de las condiciones de cuidado.');
  bullet('Reparaciones, repuestos o mantenimientos correctivos atribuibles a su responsabilidad.');

  // 13. Aceptación
  heading('13. Aceptación');
  writeWrapped(
    `La presente acta se firma a los ${formatLongDate(data.date)}, por medio de la cual EL USUARIO declara ` +
    'haber recibido el equipo en buen estado, comprende todas las condiciones del comodato y acepta ' +
    'plenamente las obligaciones aquí descritas.'
  );
  spacer(16);

  // Firmas
  newPageIfNeeded(120);
  writeWrapped('Por LA EMPRESA,', { bold: true });
  spacer(24);
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 220, y },
    thickness: 0.5,
    color: black,
  });
  y -= 12;
  writeWrapped(`Nombre: ${data.assignedBy}`, { size: 9 });
  writeWrapped('CC: ____________________', { size: 9 });
  writeWrapped('Cargo: Administración SaleADS Corp', { size: 9 });

  spacer(16);
  newPageIfNeeded(100);
  writeWrapped('EL USUARIO,', { bold: true });
  spacer(24);
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 220, y },
    thickness: 0.5,
    color: black,
  });
  y -= 12;
  writeWrapped(`Nombre: ${data.personName}`, { size: 9 });
  writeWrapped(`CC: ${data.personIdNumber}`, { size: 9 });
  writeWrapped(`Cargo: ${data.personPosition}`, { size: 9 });

  return doc.save();
}
