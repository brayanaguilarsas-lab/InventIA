import { Resend } from 'resend';
import { getTemplate, renderTemplate } from '@/lib/templates';

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

export interface ActaAttachment {
  filename: string;
  bytes: Uint8Array;
}

interface SendActaEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  /** Soporta uno o múltiples adjuntos (ej. Spartian = entrega + comodato). */
  attachments: ActaAttachment[];
}

export async function sendActaEmail({
  to,
  subject,
  htmlBody,
  attachments,
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
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.bytes),
    })),
  });

  if (error) {
    console.error('[Email] Error sending:', error);
    throw new Error(`Error enviando correo: ${error.message}`);
  }

  return data;
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

export async function buildEntregaEmail(params: {
  personName: string;
  personIdType?: string;
  personIdNumber?: string;
  assetCode: string;
  assetName: string;
  date: string;
}): Promise<BuiltEmail> {
  const tpl = await getTemplate('email_entrega');
  const vars = {
    personName: esc(params.personName),
    personIdType: esc(params.personIdType ?? ''),
    personIdNumber: esc(params.personIdNumber ?? ''),
    assetCode: esc(params.assetCode),
    assetName: esc(params.assetName),
    date: esc(new Date(params.date).toLocaleDateString('es-CO')),
  };
  return {
    subject: renderTemplate(tpl.subject ?? '', vars),
    html: renderTemplate(tpl.body, vars),
  };
}

export async function buildDevolucionEmail(params: {
  personName: string;
  personIdType?: string;
  personIdNumber?: string;
  assetCode: string;
  assetName: string;
  date: string;
  condition: string;
}): Promise<BuiltEmail> {
  const tpl = await getTemplate('email_devolucion');
  const conditionText = params.condition === 'bueno' ? 'Bueno — Sin novedades' : 'Con daños';
  const vars = {
    personName: esc(params.personName),
    personIdType: esc(params.personIdType ?? ''),
    personIdNumber: esc(params.personIdNumber ?? ''),
    assetCode: esc(params.assetCode),
    assetName: esc(params.assetName),
    date: esc(new Date(params.date).toLocaleDateString('es-CO')),
    condition: esc(conditionText),
  };
  return {
    subject: renderTemplate(tpl.subject ?? '', vars),
    html: renderTemplate(tpl.body, vars),
  };
}
