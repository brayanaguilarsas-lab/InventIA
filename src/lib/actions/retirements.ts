'use server';

import { createClient } from '@/lib/supabase/server';
import { createRetirementSchema, type CreateRetirementInput } from '@/lib/validations';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getRetirements() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('asset_retirements')
    .select('*, asset:assets(*, category:categories(*))')
    .order('retired_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createRetirement(input: CreateRetirementInput) {
  const parsed = createRetirementSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: asset } = await supabase
    .from('assets')
    .select('status, name, code')
    .eq('id', parsed.asset_id)
    .single();

  if (!asset) {
    throw new Error('Activo no encontrado');
  }

  // If the asset is assigned, we need to return it first
  if (asset.status === 'asignado') {
    const { data: activeAssignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('asset_id', parsed.asset_id)
      .eq('is_active', true)
      .single();

    if (activeAssignment) {
      await supabase
        .from('assignments')
        .update({
          returned_at: new Date().toISOString(),
          return_condition: 'bueno',
          is_active: false,
        })
        .eq('id', activeAssignment.id);
    }
  }

  const { data, error } = await supabase
    .from('asset_retirements')
    .insert({
      ...parsed,
      registered_by: user?.id,
    })
    .select('*, asset:assets(*, category:categories(*))')
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from('assets')
    .update({ status: 'baja' })
    .eq('id', parsed.asset_id);

  await logAudit('dar_baja_activo', 'asset_retirements', data.id, {
    asset_code: asset.code,
    reason: parsed.reason,
    final_destination: parsed.final_destination,
  });

  revalidatePath('/bajas');
  revalidatePath('/activos');
  return data;
}
