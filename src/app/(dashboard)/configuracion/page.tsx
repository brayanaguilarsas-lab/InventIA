import { Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CategoriesManager, type CategoryRow } from '@/components/configuracion/categories-manager';
import { FormatsManager } from '@/components/configuracion/formats-manager';
import { listTemplates } from '@/lib/templates';

export default async function ConfigPage() {
  const supabase = await createClient();
  const [{ data }, templates] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, code_prefix, fields_schema')
      .order('name'),
    listTemplates(),
  ]);
  const categories = (data ?? []) as CategoryRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Configuración</h1>
      </div>
      <CategoriesManager categories={categories} />
      <FormatsManager templates={templates} />
    </div>
  );
}
