'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createMaintenanceSchema,
  returnMaintenanceSchema,
  type CreateMaintenanceInput,
  type ReturnMaintenanceInput,
} from '@/lib/validations';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getMaintenances() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('maintenances')
    .select('*, asset:assets(*, category:categories(*))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createMaintenance(input: CreateMaintenanceInput) {
  const parsed = createMaintenanceSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: asset } = await supabase
    .from('assets')
    .select('status, name, code')
    .eq('id', parsed.asset_id)
    .single();

  if (!asset || (asset.status !== 'disponible' && asset.status !== 'asignado')) {
    throw new Error('El activo no puede ir a mantenimiento en su estado actual');
  }

  const { data, error } = await supabase
    .from('maintenances')
    .insert({
      ...parsed,
      registered_by: user?.id,
    })
    .select('*, asset:assets(*, category:categories(*))')
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from('assets')
    .update({ status: 'mantenimiento' })
    .eq('id', parsed.asset_id);

  await logAudit('enviar_mantenimiento', 'maintenances', data.id, {
    asset_code: asset.code,
    reason: parsed.reason,
  });

  revalidatePath('/mantenimientos');
  revalidatePath('/activos');
  return data;
}

export async function returnMaintenance(maintenanceId: string, input: ReturnMaintenanceInput) {
  const parsed = returnMaintenanceSchema.parse(input);
  const supabase = await createClient();

  const { data: maintenance } = await supabase
    .from('maintenances')
    .select('*, asset:assets(code, name)')
    .eq('id', maintenanceId)
    .single();

  if (!maintenance || maintenance.returned_at) {
    throw new Error('Este mantenimiento ya fue procesado');
  }

  const { data, error } = await supabase
    .from('maintenances')
    .update({
      returned_at: parsed.returned_at,
      final_status: parsed.final_status,
    })
    .eq('id', maintenanceId)
    .select('*, asset:assets(*, category:categories(*))')
    .single();

  if (error) throw new Error(error.message);

  const newStatus = parsed.final_status === 'funcional' ? 'disponible' : 'disponible';
  await supabase
    .from('assets')
    .update({ status: newStatus })
    .eq('id', maintenance.asset_id);

  await logAudit('retorno_mantenimiento', 'maintenances', maintenanceId, {
    asset_code: maintenance.asset?.code,
    final_status: parsed.final_status,
  });

  revalidatePath('/mantenimientos');
  revalidatePath('/activos');
  return data;
}
