export type TemplateKey =
  | 'email_entrega'
  | 'email_devolucion'
  | 'pdf_clausula_entrega'
  | 'pdf_paz_salvo';

export interface TemplateVariable {
  name: string;
  description: string;
}

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  description: string;
  category: 'email' | 'pdf';
  subject?: string;
  body: string;
  variables: TemplateVariable[];
}

export interface TemplateRecord extends TemplateDefinition {
  updated_at: string;
  updated_by: string | null;
  is_default: boolean;
}

const COMMON_VARS: TemplateVariable[] = [
  { name: 'personName', description: 'Nombre completo del responsable' },
  { name: 'personIdType', description: 'Tipo de documento (CC, CE, ...)' },
  { name: 'personIdNumber', description: 'Número de identificación' },
  { name: 'assetCode', description: 'Código del activo' },
  { name: 'assetName', description: 'Nombre del activo' },
  { name: 'date', description: 'Fecha (formato es-CO)' },
];

const RETURN_VARS: TemplateVariable[] = [
  ...COMMON_VARS,
  { name: 'condition', description: 'Estado de devolución (Bueno / Con daños)' },
];

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  email_entrega: {
    key: 'email_entrega',
    name: 'Email — Acta de Entrega',
    description: 'Correo enviado al responsable cuando se le entrega un activo.',
    category: 'email',
    subject: 'Acta de Entrega — {{assetCode}} ({{assetName}})',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
    Acta de Entrega de Activo
  </h2>
  <p>Estimado/a <strong>{{personName}}</strong>,</p>
  <p>Se le ha asignado el siguiente activo de Saleads Corp:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px 12px; font-weight: bold;">Código</td>
      <td style="padding: 8px 12px;">{{assetCode}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: bold;">Activo</td>
      <td style="padding: 8px 12px;">{{assetName}}</td>
    </tr>
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px 12px; font-weight: bold;">Fecha</td>
      <td style="padding: 8px 12px;">{{date}}</td>
    </tr>
  </table>
  <p>Adjunto encontrará el acta de entrega con los detalles completos del activo.</p>
  <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e5e5; padding-top: 10px;">
    Este es un correo automático de InventIA — Saleads Corp
  </p>
</div>`,
    variables: COMMON_VARS,
  },
  email_devolucion: {
    key: 'email_devolucion',
    name: 'Email — Acta de Devolución',
    description: 'Correo enviado al responsable cuando devuelve un activo.',
    category: 'email',
    subject: 'Acta de Devolución y Paz y Salvo — {{assetCode}} ({{assetName}})',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
    Acta de Devolución y Paz y Salvo
  </h2>
  <p>Estimado/a <strong>{{personName}}</strong>,</p>
  <p>Se ha registrado la devolución del siguiente activo:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px 12px; font-weight: bold;">Código</td>
      <td style="padding: 8px 12px;">{{assetCode}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: bold;">Activo</td>
      <td style="padding: 8px 12px;">{{assetName}}</td>
    </tr>
    <tr style="background: #f5f5f5;">
      <td style="padding: 8px 12px; font-weight: bold;">Fecha</td>
      <td style="padding: 8px 12px;">{{date}}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: bold;">Estado</td>
      <td style="padding: 8px 12px;">{{condition}}</td>
    </tr>
  </table>
  <p>Adjunto encontrará el acta de devolución y paz y salvo.</p>
  <p>Queda a <strong>paz y salvo</strong> respecto a este activo.</p>
  <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e5e5; padding-top: 10px;">
    Este es un correo automático de InventIA — Saleads Corp
  </p>
</div>`,
    variables: RETURN_VARS,
  },
  pdf_clausula_entrega: {
    key: 'pdf_clausula_entrega',
    name: 'PDF — Cláusula de responsabilidad (Entrega)',
    description: 'Texto del compromiso de responsabilidad que aparece en el acta de entrega estándar.',
    category: 'pdf',
    body: `{{personName}}, identificado(a) con {{personIdType}} {{personIdNumber}}, declara recibir el activo {{assetCode}} ({{assetName}}) en las condiciones descritas, comprometiéndose a darle uso adecuado y a devolverlo en buen estado cuando sea requerido por Saleads Corp.`,
    variables: COMMON_VARS,
  },
  pdf_paz_salvo: {
    key: 'pdf_paz_salvo',
    name: 'PDF — Texto de Paz y Salvo (Devolución)',
    description: 'Texto del paz y salvo que aparece en el acta de devolución.',
    category: 'pdf',
    body: `Se certifica que {{personName}}, identificado(a) con {{personIdType}} {{personIdNumber}}, ha realizado la devolución del activo {{assetCode}} ({{assetName}}) a Saleads Corp, quedando a paz y salvo respecto a este activo.`,
    variables: COMMON_VARS,
  },
};

export const TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATES) as TemplateKey[];

/**
 * Reemplaza {{var}} por el valor correspondiente. Variables ausentes quedan vacías.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? '' : String(v);
  });
}
