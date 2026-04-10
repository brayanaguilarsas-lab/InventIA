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
import { sendActaEmail, buildEntregaEmailHtml, buildDevolucionEmailHtml } from '@/lib/email';
import { uploadActaToDrive } from '@/lib/google-drive';

export async function getAssignments(activeOnly = false) {
  const supabase = await createClient();
  let query = supabase
    .from('assignments')
    .select('*, asset:assets(*, category:categories(*)), person:people(*)')
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

  // Verify asset is available
  const { data: asset } = await supabase
    .from('assets')
    .select('status, name, code')
    .eq('id', parsed.asset_id)
    .single();

  if (!asset || asset.status !== 'disponible') {
    throw new Error('El activo no está disponible para asignación');
  }

  // Create assignment
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      ...parsed,
      assigned_by: user?.id,
    })
    .select('*, asset:assets(*, category:categories(*)), person:people(*)')
    .single();

  if (error) throw new Error(error.message);

  // Update asset status
  await supabase
    .from('assets')
    .update({ status: 'asignado' })
    .eq('id', parsed.asset_id);

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

  // Get admin name
  let adminName = 'Administración SaleADS';
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    if (profile) adminName = profile.full_name;
  }

  // Background: Generate PDF, upload to Drive, send email
  try {
    const pdfBytes = await generateActaPDF({
      tipo: 'entrega',
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
      date: data.assigned_at,
      assignedBy: adminName,
    });

    // Upload to Drive if configured
    if (fullAsset.drive_folder_url) {
      try {
        const actaUrl = await uploadActaToDrive(
          fullAsset.drive_folder_url,
          `Acta_Entrega_${fullAsset.code}_${person.full_name.replace(/\s/g, '_')}.pdf`,
          pdfBytes
        );
        await supabase.from('assignments').update({ acta_url: actaUrl }).eq('id', data.id);
      } catch (e) {
        console.error('[Drive] Upload error:', e);
      }
    }

    // Send email
    try {
      await sendActaEmail({
        to: person.email,
        subject: `Acta de Entrega — ${fullAsset.code} (${fullAsset.name})`,
        htmlBody: buildEntregaEmailHtml({
          personName: person.full_name,
          assetCode: fullAsset.code,
          assetName: fullAsset.name,
          date: data.assigned_at,
        }),
        pdfBytes,
        pdfFilename: `Acta_Entrega_${fullAsset.code}.pdf`,
      });
    } catch (e) {
      console.error('[Email] Send error:', e);
    }
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
      await sendActaEmail({
        to: person.email,
        subject: `Acta de Devolución y Paz y Salvo — ${fullAsset.code} (${fullAsset.name})`,
        htmlBody: buildDevolucionEmailHtml({
          personName: person.full_name,
          assetCode: fullAsset.code,
          assetName: fullAsset.name,
          date: data.returned_at ?? new Date().toISOString(),
          condition: parsed.return_condition,
        }),
        pdfBytes,
        pdfFilename: `Acta_Devolucion_${fullAsset.code}.pdf`,
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
