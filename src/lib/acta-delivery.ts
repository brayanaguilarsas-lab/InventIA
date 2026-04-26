import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateActaPDF } from '@/lib/pdf/generate-acta';
import { generateActaSpartianPDF } from '@/lib/pdf/generate-acta-spartian';
import { buildEntregaEmail, sendActaEmail, type ActaAttachment } from '@/lib/email';
import { uploadActaToDrive } from '@/lib/google-drive';

interface AssignmentLike {
  id: string;
  assigned_at: string;
  assigned_by: string | null;
}

interface PersonLike {
  full_name: string;
  id_type: string;
  id_number: string;
  area: string;
  position: string;
  email: string;
  is_spartian?: boolean;
}

interface AssetLike {
  code: string;
  name: string;
  commercial_value: number;
  specific_fields: Record<string, unknown>;
  drive_folder_url: string | null;
  category: { name: string } | null;
}

interface DeliverEntregaResult {
  emailSent: boolean;
  emailError: string | null;
  driveUrl: string | null;
  driveError: string | null;
  recipient: string;
  attachmentCount: number;
}

async function getAdminName(supabase: SupabaseClient, userId: string | null): Promise<string> {
  if (!userId) return 'Administración SaleADS';
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', userId)
    .single();
  return profile?.full_name ?? 'Administración SaleADS';
}

function safeFileName(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Genera el/los PDF(s) de entrega para una asignación, sube a Drive (si está
 * configurado) y envía el correo. Si la persona es Spartian, adjunta TANTO
 * el acta de entrega normal como el acta de comodato Spartian.
 *
 * Es idempotente desde el punto de vista del usuario: puede invocarse al crear
 * la asignación o cuando se reenvía manualmente.
 */
export async function deliverEntregaActa(
  supabase: SupabaseClient,
  assignment: AssignmentLike,
  person: PersonLike,
  asset: AssetLike
): Promise<DeliverEntregaResult> {
  const result: DeliverEntregaResult = {
    emailSent: false,
    emailError: null,
    driveUrl: null,
    driveError: null,
    recipient: person.email,
    attachmentCount: 0,
  };

  const adminName = await getAdminName(supabase, assignment.assigned_by);
  const sf = (asset.specific_fields ?? {}) as Record<string, unknown>;
  const safeCode = safeFileName(asset.code);
  const safePerson = safeFileName(person.full_name);
  const isSpartian = !!person.is_spartian;

  const attachments: ActaAttachment[] = [];

  // Para entrega normal y para Spartian: SIEMPRE generamos el acta de entrega.
  const entregaPdf = await generateActaPDF({
    tipo: 'entrega',
    assetCode: asset.code,
    assetName: asset.name,
    categoryName: asset.category?.name ?? '',
    commercialValue: Number(asset.commercial_value),
    specificFields: asset.specific_fields ?? {},
    personName: person.full_name,
    personIdType: person.id_type,
    personIdNumber: person.id_number,
    personArea: person.area,
    personPosition: person.position,
    personEmail: person.email,
    date: assignment.assigned_at,
    assignedBy: adminName,
  });
  attachments.push({
    filename: `Acta_Entrega_${safeCode}_${safePerson}.pdf`,
    bytes: entregaPdf,
  });

  // Si es Spartian, agregamos también el acta de comodato.
  let spartianPdf: Uint8Array | null = null;
  if (isSpartian) {
    spartianPdf = await generateActaSpartianPDF({
      assetCode: asset.code,
      assetName: asset.name,
      assetType: asset.category?.name ?? 'Equipo tecnológico',
      brand: sf.marca as string | undefined,
      model: sf.modelo as string | undefined,
      serial: sf.serial as string | undefined,
      ram: sf.ram as string | undefined,
      storage: sf.almacenamiento as string | undefined,
      accessories: sf.accesorios as string | undefined,
      commercialValue: Number(asset.commercial_value),
      personName: person.full_name,
      personIdType: person.id_type,
      personIdNumber: person.id_number,
      personPosition: person.position,
      date: assignment.assigned_at,
      assignedBy: adminName,
    });
    attachments.push({
      filename: `Acta_Comodato_Spartian_${safeCode}_${safePerson}.pdf`,
      bytes: spartianPdf,
    });
  }

  result.attachmentCount = attachments.length;

  // Subir el(los) PDF(s) a Drive si hay carpeta configurada.
  if (asset.drive_folder_url) {
    for (const att of attachments) {
      try {
        const url = await uploadActaToDrive(asset.drive_folder_url, att.filename, att.bytes);
        // Guardamos solo la URL del primero (entrega) para retro-compatibilidad.
        if (!result.driveUrl) {
          result.driveUrl = url;
          await supabase.from('assignments').update({ acta_url: url }).eq('id', assignment.id);
        }
      } catch (e) {
        console.error('[Drive] Upload error:', e);
        result.driveError = (e as Error).message;
      }
    }
  }

  // Construir el correo desde la plantilla DB.
  const { subject: tplSubject, html } = await buildEntregaEmail({
    personName: person.full_name,
    personIdType: person.id_type,
    personIdNumber: person.id_number,
    assetCode: asset.code,
    assetName: asset.name,
    date: assignment.assigned_at,
  });

  const subject = isSpartian
    ? `Acta de Entrega y Comodato — ${asset.code} (${asset.name})`
    : tplSubject;

  try {
    await sendActaEmail({
      to: person.email,
      subject,
      htmlBody: html,
      attachments,
    });
    result.emailSent = true;
  } catch (e) {
    console.error('[Email] Send error:', e);
    result.emailError = (e as Error).message;
  }

  return result;
}
