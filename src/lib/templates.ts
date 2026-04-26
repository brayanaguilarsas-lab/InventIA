import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  type TemplateDefinition,
  type TemplateKey,
  type TemplateRecord,
} from '@/lib/templates-shared';

export {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  renderTemplate,
} from '@/lib/templates-shared';
export type {
  TemplateDefinition,
  TemplateKey,
  TemplateRecord,
  TemplateVariable,
} from '@/lib/templates-shared';

/**
 * Carga la plantilla desde DB. Si no existe (tabla nueva o sin override),
 * devuelve el default hardcoded.
 */
export async function getTemplate(key: TemplateKey): Promise<TemplateDefinition> {
  const fallback = DEFAULT_TEMPLATES[key];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('document_templates')
      .select('subject, body')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return fallback;
    return {
      ...fallback,
      subject: data.subject ?? fallback.subject,
      body: data.body ?? fallback.body,
    };
  } catch {
    return fallback;
  }
}

/**
 * Lista todas las plantillas con su estado (override o default).
 */
export async function listTemplates(): Promise<TemplateRecord[]> {
  let overrides: Record<
    string,
    { subject: string | null; body: string; updated_at: string; updated_by: string | null }
  > = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('document_templates')
      .select('key, subject, body, updated_at, updated_by');
    if (data) {
      overrides = Object.fromEntries(
        data.map((row: { key: string; subject: string | null; body: string; updated_at: string; updated_by: string | null }) => [
          row.key,
          row,
        ])
      );
    }
  } catch {
    overrides = {};
  }

  return TEMPLATE_KEYS.map((key) => {
    const def = DEFAULT_TEMPLATES[key];
    const override = overrides[key];
    return {
      ...def,
      subject: override?.subject ?? def.subject,
      body: override?.body ?? def.body,
      updated_at: override?.updated_at ?? '',
      updated_by: override?.updated_by ?? null,
      is_default: !override,
    };
  });
}
