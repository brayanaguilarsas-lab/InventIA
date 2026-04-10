import { createClient } from '@/lib/supabase/client';

export async function logAuditClient(
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {}
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
