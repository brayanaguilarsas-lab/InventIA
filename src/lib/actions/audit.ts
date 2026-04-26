'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export interface AuditDiagnostic {
  ok: boolean;
  userId: string | null;
  userEmail: string | null;
  hasUserProfile: boolean;
  totalRows: number;
  insertedTestRow: boolean;
  insertError: string | null;
  selectError: string | null;
}

/**
 * Server action para verificar end-to-end que la auditoría funciona:
 * 1. Confirma que hay usuario en la sesión.
 * 2. Verifica que existe un registro en `user_profiles` (necesario para el JOIN de la UI).
 * 3. Cuenta los registros visibles bajo RLS.
 * 4. Inserta un evento `diagnostico_auditoria` y vuelve a contar.
 */
export async function runAuditDiagnostic(): Promise<AuditDiagnostic> {
  const supabase = await createClient();
  const result: AuditDiagnostic = {
    ok: false,
    userId: null,
    userEmail: null,
    hasUserProfile: false,
    totalRows: 0,
    insertedTestRow: false,
    insertError: null,
    selectError: null,
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.selectError = 'No hay sesión activa en el server action';
    return result;
  }
  result.userId = user.id;
  result.userEmail = user.email ?? null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  result.hasUserProfile = !!profile;

  // Conteo previo (si SELECT falla por RLS, lo capturamos).
  const before = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true });
  if (before.error) {
    result.selectError = `${before.error.code}: ${before.error.message}`;
    return result;
  }
  const beforeCount = before.count ?? 0;

  // Insertar el evento de diagnóstico directamente (sin pasar por logAudit
  // para que cualquier error del INSERT salga aquí en vez de ser silenciado).
  const { error: insertErr } = await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'diagnostico_auditoria',
    entity_type: 'system',
    entity_id: user.id,
    details: { source: 'admin_diagnostic', at: new Date().toISOString() },
  });
  if (insertErr) {
    result.insertError = `${insertErr.code}: ${insertErr.message}`;
    result.totalRows = beforeCount;
    return result;
  }
  result.insertedTestRow = true;

  // Conteo posterior.
  const after = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true });
  result.totalRows = after.count ?? beforeCount + 1;
  result.ok = result.totalRows > beforeCount;

  // También probamos la API pública para verificar que no rompe acciones.
  await logAudit('diagnostico_auditoria', 'system', user.id, {
    via: 'logAudit_helper',
  });

  revalidatePath('/auditoria');
  return result;
}
