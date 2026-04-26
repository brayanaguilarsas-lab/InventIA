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
  if (!user) throw new Error('Sesión inválida');

  // Verificar que authorized_by sea un usuario real (no un UUID arbitrario)
  const { data: authorizer } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', parsed.authorized_by)
    .single();

  if (!authorizer) {
    throw new Error('El usuario que autoriza la baja no existe en el sistema');
  }

  // Capturar status anterior del activo para poder revertir correctamente si algo falla.
  const { data: prev } = await supabase
    .from('assets')
    .select('status')
    .eq('id', parsed.asset_id)
    .single();
  if (!prev) throw new Error('El activo no existe');
  const previousStatus = prev.status;

  // Claim atómico: marcar el activo como baja solo si aún no lo está.
  const { data: claimed, error: claimError } = await supabase
    .from('assets')
    .update({ status: 'baja' })
    .eq('id', parsed.asset_id)
    .neq('status', 'baja')
    .select('name, code, status')
    .single();

  if (claimError || !claimed) {
    throw new Error('El activo no existe o ya está dado de baja');
  }
  const asset = claimed;

  const { data, error } = await supabase
    .from('asset_retirements')
    .insert({
      ...parsed,
      registered_by: user.id,
    })
    .select('*, asset:assets(*, category:categories(*))')
    .single();

  if (error) {
    // Revertir claim del activo a su estado anterior real.
    await supabase.from('assets').update({ status: previousStatus }).eq('id', parsed.asset_id);
    throw new Error(error.message);
  }

  // Después del insert exitoso, cerrar la asignación activa si existía.
  if (previousStatus === 'asignado') {
    await supabase
      .from('assignments')
      .update({
        returned_at: new Date().toISOString(),
        return_condition: 'bueno',
        is_active: false,
      })
      .eq('asset_id', parsed.asset_id)
      .eq('is_active', true);
  }

  await logAudit('dar_baja_activo', 'asset_retirements', data.id, {
    asset_code: asset.code,
    reason: parsed.reason,
    final_destination: parsed.final_destination,
  });

  revalidatePath('/bajas');
  revalidatePath('/activos');
  return data;
}
