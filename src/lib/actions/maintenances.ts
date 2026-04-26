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
  if (!user) throw new Error('Sesión inválida');

  // Capturar status anterior del activo para poder revertir correctamente si algo falla.
  const { data: prev } = await supabase
    .from('assets')
    .select('status, code, name')
    .eq('id', parsed.asset_id)
    .single();
  if (!prev) throw new Error('El activo no existe');
  const previousStatus = prev.status;

  // Claim atómico: solo pasa a 'mantenimiento' si estaba disponible o asignado.
  // Evita race condition con otra acción concurrente sobre el mismo activo.
  const { data: claimed, error: claimError } = await supabase
    .from('assets')
    .update({ status: 'mantenimiento' })
    .eq('id', parsed.asset_id)
    .in('status', ['disponible', 'asignado'])
    .select('name, code, status')
    .single();

  if (claimError || !claimed) {
    throw new Error('El activo no puede ir a mantenimiento en su estado actual');
  }
  const asset = claimed;

  const { data, error } = await supabase
    .from('maintenances')
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

  // Después del insert exitoso, cerrar la asignación activa (devolución implícita).
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

  // Solo vuelve a 'disponible' si quedó funcional. Si no, queda en mantenimiento
  // para que la Analista lo pase a Baja desde la UI (requiere motivo + destino + autorización).
  if (parsed.final_status === 'funcional') {
    await supabase
      .from('assets')
      .update({ status: 'disponible' })
      .eq('id', maintenance.asset_id);
  }

  await logAudit('retorno_mantenimiento', 'maintenances', maintenanceId, {
    asset_code: maintenance.asset?.code,
    final_status: parsed.final_status,
  });

  revalidatePath('/mantenimientos');
  revalidatePath('/activos');
  return data;
}
