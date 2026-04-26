'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createAssignmentSchema,
  returnAssignmentSchema,
  type CreateAssignmentInput,
  type ReturnAssignmentInput,
} from '@/lib/validations';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { generateActaPDF } from '@/lib/pdf/generate-acta';
import { sendActaEmail, buildDevolucionEmail } from '@/lib/email';
import { uploadActaToDrive } from '@/lib/google-drive';
import { deliverEntregaActa } from '@/lib/acta-delivery';

export async function getAssignments(activeOnly = false) {
  const supabase = await createClient();
  let query = supabase
    .from('assignments')
    .select('id, asset_id, person_id, assigned_by, assigned_at, returned_at, return_condition, damage_description, acta_url, is_active, asset:assets(id, code, name, category:categories(name)), person:people(id, full_name, email, area, position, is_spartian)')
    .order('assigned_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createAssignment(input: CreateAssignmentInput) {
  const parsed = createAssignmentSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

  // Validar que la persona destino existe y está activa antes de claim del activo.
  const { data: destPerson, error: pErr } = await supabase
    .from('people')
    .select('id, is_active')
    .eq('id', parsed.person_id)
    .single();
  if (pErr || !destPerson) throw new Error('La persona seleccionada no existe');
  if (!destPerson.is_active) throw new Error('No se puede asignar a una persona inactiva');

  // Claim atómico: solo pasa a 'asignado' si sigue 'disponible'.
  // Evita la race condition donde dos asignaciones concurrentes toman el mismo activo.
  const { data: claimed, error: claimError } = await supabase
    .from('assets')
    .update({ status: 'asignado' })
    .eq('id', parsed.asset_id)
    .eq('status', 'disponible')
    .select('name, code')
    .single();

  if (claimError || !claimed) {
    throw new Error('El activo no está disponible para asignación');
  }
  const asset = claimed;

  // Crear asignación. Si falla, revertir el status.
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      ...parsed,
      assigned_by: user.id,
    })
    .select('*, asset:assets(*, category:categories(*)), person:people(*)')
    .single();

  if (error) {
    await supabase
      .from('assets')
      .update({ status: 'disponible' })
      .eq('id', parsed.asset_id);
    throw new Error(error.message);
  }

  const person = data.person as unknown as {
    full_name: string; id_type: string; id_number: string;
    area: string; position: string; email: string;
    is_spartian?: boolean;
  };
  const fullAsset = data.asset as unknown as {
    code: string; name: string; commercial_value: number;
    specific_fields: Record<string, unknown>;
    drive_folder_url: string | null;
    category: { name: string } | null;
  };

  // Genera PDF(s), sube a Drive y envía email. Spartian recibe ambas actas.
  try {
    await deliverEntregaActa(supabase, data, person, fullAsset);
  } catch (e) {
    console.error('[Assignment] PDF/Drive/Email error:', e);
  }

  await logAudit('asignar_activo', 'assignments', data.id, {
    asset_code: asset.code,
    asset_name: asset.name,
    person_name: person.full_name,
  });

  revalidatePath('/asignaciones');
  revalidatePath('/activos');
  return data;
}

export async function updateAssignmentPerson(assignmentId: string, newPersonId: string) {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('assignments')
    .select('*, asset:assets(code, name), person:people(full_name)')
    .eq('id', assignmentId)
    .single();

  if (!assignment || !assignment.is_active) {
    throw new Error('Solo se pueden editar asignaciones activas');
  }

  const { data: newPerson, error: pErr } = await supabase
    .from('people')
    .select('id, full_name, is_active')
    .eq('id', newPersonId)
    .single();

  if (pErr || !newPerson) throw new Error('La persona seleccionada no existe');
  if (!newPerson.is_active) throw new Error('No se puede asignar a una persona inactiva');

  const { data, error } = await supabase
    .from('assignments')
    .update({ person_id: newPersonId })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const oldPerson = assignment.person as unknown as { full_name: string } | null;
  const asset = assignment.asset as unknown as { code: string; name: string } | null;

  await logAudit('editar_asignacion', 'assignments', assignmentId, {
    asset_code: asset?.code,
    asset_name: asset?.name,
    previous_person: oldPerson?.full_name,
    new_person: newPerson.full_name,
  });

  revalidatePath('/asignaciones');
  revalidatePath('/activos');
  revalidatePath('/personas');
  return data;
}

export async function deleteAssignment(assignmentId: string) {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('assignments')
    .select('asset_id, is_active, asset:assets(code, name), person:people(full_name)')
    .eq('id', assignmentId)
    .single();

  if (!assignment) throw new Error('Asignación no encontrada');

  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw new Error(error.message);

  // Si la asignación estaba activa, liberar el activo a 'disponible'
  if (assignment.is_active) {
    await supabase.from('assets').update({ status: 'disponible' }).eq('id', assignment.asset_id);
  }

  const asset = assignment.asset as unknown as { code: string; name: string } | null;
  const person = assignment.person as unknown as { full_name: string } | null;

  await logAudit('eliminar_asignacion', 'assignments', assignmentId, {
    asset_code: asset?.code,
    asset_name: asset?.name,
    person_name: person?.full_name,
    was_active: assignment.is_active,
  });

  revalidatePath('/asignaciones');
  revalidatePath('/activos');
}

export async function returnAssignment(assignmentId: string, input: ReturnAssignmentInput) {
  const parsed = returnAssignmentSchema.parse(input);
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('assignments')
    .select('*, asset:assets(code, name)')
    .eq('id', assignmentId)
    .single();

  if (!assignment || !assignment.is_active) {
    throw new Error('La asignación no está activa');
  }

  const { data, error } = await supabase
    .from('assignments')
    .update({
      returned_at: new Date().toISOString(),
      return_condition: parsed.return_condition,
      damage_description: parsed.damage_description,
      is_active: false,
    })
    .eq('id', assignmentId)
    .select('*, asset:assets(*, category:categories(*)), person:people(*)')
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from('assets')
    .update({ status: 'disponible' })
    .eq('id', assignment.asset_id);

  const person = data.person as unknown as {
    full_name: string; id_type: string; id_number: string;
    area: string; position: string; email: string;
  };
  const fullAsset = data.asset as unknown as {
    code: string; name: string; commercial_value: number;
    specific_fields: Record<string, unknown>;
    drive_folder_url: string | null;
    category: { name: string } | null;
  };

  let adminName = 'Administración SaleADS';
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    if (profile) adminName = profile.full_name;
  }

  // Background: Generate PDF, upload, email
  try {
    const pdfBytes = await generateActaPDF({
      tipo: 'devolucion',
      assetCode: fullAsset.code,
      assetName: fullAsset.name,
      categoryName: fullAsset.category?.name ?? '',
      commercialValue: Number(fullAsset.commercial_value),
      specificFields: fullAsset.specific_fields ?? {},
      personName: person.full_name,
      personIdType: person.id_type,
      personIdNumber: person.id_number,
      personArea: person.area,
      personPosition: person.position,
      personEmail: person.email,
      date: data.returned_at ?? new Date().toISOString(),
      assignedBy: adminName,
      returnCondition: parsed.return_condition,
      damageDescription: parsed.damage_description ?? undefined,
    });

    if (fullAsset.drive_folder_url) {
      try {
        await uploadActaToDrive(
          fullAsset.drive_folder_url,
          `Acta_Devolucion_${fullAsset.code}_${person.full_name.replace(/\s/g, '_')}.pdf`,
          pdfBytes
        );
      } catch (e) {
        console.error('[Drive] Upload error:', e);
      }
    }

    try {
      const { subject, html } = await buildDevolucionEmail({
        personName: person.full_name,
        personIdType: person.id_type,
        personIdNumber: person.id_number,
        assetCode: fullAsset.code,
        assetName: fullAsset.name,
        date: data.returned_at ?? new Date().toISOString(),
        condition: parsed.return_condition,
      });
      await sendActaEmail({
        to: person.email,
        subject,
        htmlBody: html,
        attachments: [
          { filename: `Acta_Devolucion_${fullAsset.code}.pdf`, bytes: pdfBytes },
        ],
      });
    } catch (e) {
      console.error('[Email] Send error:', e);
    }
  } catch (e) {
    console.error('[Return] PDF/Drive/Email error:', e);
  }

  await logAudit('devolver_activo', 'assignments', assignmentId, {
    asset_code: assignment.asset?.code,
    return_condition: parsed.return_condition,
    damage_description: parsed.damage_description,
  });

  revalidatePath('/asignaciones');
  revalidatePath('/activos');
  return data;
}

export interface ResendResult {
  ok: boolean;
  recipient: string | null;
  attachmentCount: number;
  error: string | null;
}

/**
 * Reenvía manualmente el acta de entrega (y la de comodato Spartian si aplica)
 * de una asignación activa. Útil cuando el destinatario no recibe el correo,
 * cambia de email, o se actualiza una plantilla y se quiere reemitir.
 */
export async function resendAssignmentEmail(assignmentId: string): Promise<ResendResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, recipient: null, attachmentCount: 0, error: 'Sesión inválida' };
  }

  const { data: assignment, error } = await supabase
    .from('assignments')
    .select('*, asset:assets(*, category:categories(*)), person:people(*)')
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) {
    return { ok: false, recipient: null, attachmentCount: 0, error: 'Asignación no encontrada' };
  }
  if (!assignment.is_active) {
    return {
      ok: false,
      recipient: null,
      attachmentCount: 0,
      error: 'No se puede reenviar: la asignación ya fue cerrada',
    };
  }

  const person = assignment.person as unknown as {
    full_name: string; id_type: string; id_number: string;
    area: string; position: string; email: string;
    is_spartian?: boolean;
  };
  const fullAsset = assignment.asset as unknown as {
    code: string; name: string; commercial_value: number;
    specific_fields: Record<string, unknown>;
    drive_folder_url: string | null;
    category: { name: string } | null;
  };

  let result;
  try {
    result = await deliverEntregaActa(supabase, assignment, person, fullAsset);
  } catch (e) {
    return {
      ok: false,
      recipient: person.email,
      attachmentCount: 0,
      error: (e as Error).message,
    };
  }

  await logAudit('reenviar_acta', 'assignments', assignmentId, {
    asset_code: fullAsset.code,
    person_name: person.full_name,
    recipient: result.recipient,
    is_spartian: !!person.is_spartian,
    attachments: result.attachmentCount,
  });

  // El acta_url puede haber cambiado tras el upload a Drive — invalidar caches.
  revalidatePath('/asignaciones');
  revalidatePath('/activos');

  return {
    ok: result.emailSent,
    recipient: result.recipient,
    attachmentCount: result.attachmentCount,
    error: result.emailError,
  };
}
