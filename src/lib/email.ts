import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Escape HTML para evitar XSS en email templates
function esc(s: string | undefined | null): string {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

// Admin emails that should receive copies of all actas
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter(Boolean) as string[];

const FROM_EMAIL_RAW = process.env.FROM_EMAIL ?? 'inventario@saleads.com';
const FROM_EMAIL = FROM_EMAIL_RAW.includes('<') ? FROM_EMAIL_RAW : `InventIA <${FROM_EMAIL_RAW}>`;

interface SendActaEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  pdfBytes: Uint8Array;
  pdfFilename: string;
}

export async function sendActaEmail({
  to,
  subject,
  htmlBody,
  pdfBytes,
  pdfFilename,
}: SendActaEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] Resend API key not configured, skipping email');
    return null;
  }

  const allRecipients = [to, ...ADMIN_EMAILS].filter(
    (email, index, self) => self.indexOf(email) === index
  );

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: allRecipients,
    subject,
    html: htmlBody,
    attachments: [
      {
        filename: pdfFilename,
        content: Buffer.from(pdfBytes),
      },
    ],
  });

  if (error) {
    console.error('[Email] Error sending:', error);
    throw new Error(`Error enviando correo: ${error.message}`);
  }

  return data;
}

export function buildEntregaEmailHtml(params: {
  personName: string;
  assetCode: string;
  assetName: string;
  date: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
        Acta de Entrega de Activo
      </h2>
      <p>Estimado/a <strong>${esc(params.personName)}</strong>,</p>
      <p>Se le ha asignado el siguiente activo de Saleads Corp:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px 12px; font-weight: bold;">Código</td>
          <td style="padding: 8px 12px;">${esc(params.assetCode)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold;">Activo</td>
          <td style="padding: 8px 12px;">${esc(params.assetName)}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px 12px; font-weight: bold;">Fecha</td>
          <td style="padding: 8px 12px;">${esc(new Date(params.date).toLocaleDateString('es-CO'))}</td>
        </tr>
      </table>
      <p>Adjunto encontrará el acta de entrega con los detalles completos del activo.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e5e5; padding-top: 10px;">
        Este es un correo automático de InventIA — Saleads Corp
      </p>
    </div>
  `;
}

export function buildDevolucionEmailHtml(params: {
  personName: string;
  assetCode: string;
  assetName: string;
  date: string;
  condition: string;
}) {
  const conditionText = params.condition === 'bueno' ? 'Bueno — Sin novedades' : 'Con daños';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
        Acta de Devolución y Paz y Salvo
      </h2>
      <p>Estimado/a <strong>${esc(params.personName)}</strong>,</p>
      <p>Se ha registrado la devolución del siguiente activo:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px 12px; font-weight: bold;">Código</td>
          <td style="padding: 8px 12px;">${esc(params.assetCode)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold;">Activo</td>
          <td style="padding: 8px 12px;">${esc(params.assetName)}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px 12px; font-weight: bold;">Fecha</td>
          <td style="padding: 8px 12px;">${esc(new Date(params.date).toLocaleDateString('es-CO'))}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold;">Estado</td>
          <td style="padding: 8px 12px;">${esc(conditionText)}</td>
        </tr>
      </table>
      <p>Adjunto encontrará el acta de devolución y paz y salvo.</p>
      <p>Queda a <strong>paz y salvo</strong> respecto a este activo.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e5e5; padding-top: 10px;">
        Este es un correo automático de InventIA — Saleads Corp
      </p>
    </div>
  `;
}
