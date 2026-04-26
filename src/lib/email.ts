import { BrevoClient } from '@getbrevo/brevo';
import { getTemplate, renderTemplate } from '@/lib/templates';

function getBrevo() {
  const apiKey =
    process.env.BREVO_API_KEY ?? process.env.SENDINBLUE_API_KEY ?? '';
  return new BrevoClient({ apiKey });
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

// Admin emails que reciben copia (BCC) de todos los actas.
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter((e): e is string => !!e);

// FROM_EMAIL puede venir como "Nombre <correo@dominio>" o solo "correo@dominio".
// En Brevo, el sender debe estar verificado: verifica el correo en
// https://app.brevo.com/senders → Add a sender. Sin verificar, el envío falla
// con una respuesta clara que se traduce en el handler de errores.
const FROM_RAW = (process.env.FROM_EMAIL ?? 'inventario@saleads.com').trim();
const FROM = parseFromAddress(FROM_RAW);

function parseFromAddress(raw: string): { email: string; name?: string } {
  const m = raw.match(/^\s*(.+?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1], email: m[2] };
  return { email: raw, name: 'InventIA' };
}

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
  const apiKey = process.env.BREVO_API_KEY ?? process.env.SENDINBLUE_API_KEY;
  if (!apiKey) {
    console.warn('[Email] BREVO_API_KEY no configurada, salteando envío');
    return null;
  }

  // Modo de prueba: redirige todos los correos a una sola dirección con
  // prefijo en el subject. Acepta tanto el nombre nuevo (EMAIL_TEST_REDIRECT_TO)
  // como el antiguo (RESEND_TEST_REDIRECT_TO) para no romper la migración.
  const testRedirect = (
    process.env.EMAIL_TEST_REDIRECT_TO ??
    process.env.RESEND_TEST_REDIRECT_TO ??
    ''
  ).trim();

  let recipients: { email: string }[];
  let bcc: { email: string }[] | undefined;
  let finalSubject: string;
  let finalHtml = htmlBody;

  if (testRedirect) {
    recipients = [{ email: testRedirect }];
    bcc = undefined;
    finalSubject = `[TEST → ${to}] ${subject}`;
    finalHtml =
      `<div style="background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:10px 14px;margin:0 0 16px;border-radius:6px;font-family:Arial,sans-serif;font-size:12px;">` +
      `<strong>Modo de prueba</strong>: este correo iba dirigido a <code>${esc(to)}</code> pero fue redirigido a <code>${esc(testRedirect)}</code> porque <code>EMAIL_TEST_REDIRECT_TO</code> está activa.` +
      `</div>` +
      htmlBody;
    console.log(`[Email] TEST mode — redirigiendo "${subject}" de ${to} → ${testRedirect}`);
  } else {
    recipients = [{ email: to }];
    const adminBcc = ADMIN_EMAILS.filter((e) => e !== to).map((e) => ({ email: e }));
    bcc = adminBcc.length > 0 ? adminBcc : undefined;
    finalSubject = subject;
  }

  try {
    const brevo = getBrevo();
    const response = await brevo.transactionalEmails.sendTransacEmail({
      sender: { email: FROM.email, name: FROM.name },
      to: recipients,
      bcc,
      subject: finalSubject,
      htmlContent: finalHtml,
      attachment: attachments.map((a) => ({
        name: a.filename,
        content: Buffer.from(a.bytes).toString('base64'),
      })),
    });
    return response;
  } catch (err) {
    // Errores de Brevo vienen como BrevoError con structure { statusCode, body, message }
    const e = err as { statusCode?: number; body?: { message?: string; code?: string }; message?: string };
    const apiMsg = e.body?.message ?? e.message ?? 'Error desconocido';
    const lower = apiMsg.toLowerCase();
    let friendly = `Error enviando correo: ${apiMsg}`;

    if (lower.includes('sender') && (lower.includes('not valid') || lower.includes('not found') || lower.includes('not allowed'))) {
      friendly =
        `El remitente "${FROM.email}" no está verificado en Brevo. ` +
        `Ve a app.brevo.com/senders → Add a sender, verifica el email y vuelve a intentar.`;
    } else if (e.statusCode === 401 || lower.includes('api key') || lower.includes('unauthorized')) {
      friendly = 'La BREVO_API_KEY no es válida o fue revocada. Genera una nueva en app.brevo.com/settings/keys/api.';
    } else if (e.statusCode === 402 || lower.includes('quota') || lower.includes('credit')) {
      friendly = 'La cuenta de Brevo agotó su cuota diaria/mensual. Espera al reset o sube de plan.';
    } else if (e.statusCode === 429 || lower.includes('rate limit')) {
      friendly = 'Brevo recibió demasiados envíos en poco tiempo. Espera un momento y vuelve a intentar.';
    }

    console.error('[Email] Brevo error:', e);
    throw new Error(friendly);
  }
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
