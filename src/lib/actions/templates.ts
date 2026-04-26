'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import {
  DEFAULT_TEMPLATES,
  listTemplates,
  type TemplateKey,
  type TemplateRecord,
} from '@/lib/templates';

export async function getTemplatesForUI(): Promise<TemplateRecord[]> {
  return listTemplates();
}

export async function updateTemplate(
  key: TemplateKey,
  input: { subject?: string | null; body: string }
): Promise<TemplateRecord> {
  const def = DEFAULT_TEMPLATES[key];
  if (!def) throw new Error('Plantilla desconocida');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

  const body = (input.body ?? '').trim();
  if (!body) throw new Error('El cuerpo de la plantilla no puede estar vacío');

  const subject =
    def.category === 'email' ? (input.subject ?? '').trim() || null : null;
  if (def.category === 'email' && !subject) {
    throw new Error('El asunto del email es requerido');
  }

  const { error } = await supabase
    .from('document_templates')
    .upsert(
      {
        key,
        name: def.name,
        description: def.description,
        category: def.category,
        subject,
        body,
        variables: def.variables,
        updated_by: user.id,
      },
      { onConflict: 'key' }
    );

  if (error) {
    if (error.code === '42P01') {
      throw new Error(
        'La tabla document_templates aún no existe. Aplica la migración 002 en Supabase.'
      );
    }
    throw new Error(error.message);
  }

  await logAudit('actualizar_plantilla', 'document_templates', key, {
    name: def.name,
  });

  revalidatePath('/configuracion');
  const all = await listTemplates();
  return all.find((t) => t.key === key)!;
}

export async function resetTemplate(key: TemplateKey): Promise<TemplateRecord> {
  const def = DEFAULT_TEMPLATES[key];
  if (!def) throw new Error('Plantilla desconocida');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

  const { error } = await supabase
    .from('document_templates')
    .delete()
    .eq('key', key);

  if (error && error.code !== '42P01') {
    throw new Error(error.message);
  }

  await logAudit('restaurar_plantilla', 'document_templates', key, {
    name: def.name,
  });

  revalidatePath('/configuracion');
  const all = await listTemplates();
  return all.find((t) => t.key === key)!;
}
