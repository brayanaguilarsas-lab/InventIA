import { createClient } from '@/lib/supabase/server';

/**
 * Registra una entrada en `audit_log`. NUNCA propaga errores: si la inserción
 * falla (RLS, schema mismatch, sesión perdida, etc.) lo registra en console
 * pero deja que la server action que lo llamó complete con éxito.
 *
 * `entityId` puede ser un UUID o un string corto (key de plantilla, etc.).
 * El schema admite TEXT a partir de la migración 003.
 */
export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn(`[Audit] no user — skipping ${action} on ${entityType}:${entityId}`);
      return;
    }

    const { error } = await supabase.from('audit_log').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });

    if (error) {
      console.error(
        `[Audit] insert failed (${action}/${entityType}/${entityId}): ${error.code} ${error.message}`
      );
    }
  } catch (err) {
    console.error('[Audit] unexpected error:', err);
  }
}
