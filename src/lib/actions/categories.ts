'use server';

import { createClient } from '@/lib/supabase/server';
import { createCategorySchema, type CreateCategoryInput } from '@/lib/validations';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(input: CreateCategoryInput) {
  const parsed = createCategorySchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

  const { data, error } = await supabase
    .from('categories')
    .insert(parsed)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit('crear_categoria', 'categories', data.id, { name: data.name });
  revalidatePath('/configuracion');
  return data;
}

export async function updateCategory(id: string, input: Partial<CreateCategoryInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit('actualizar_categoria', 'categories', data.id, { name: data.name });
  revalidatePath('/configuracion');
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

  const { count } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    throw new Error('No se puede eliminar una categoría con activos asociados');
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    // Cubre la race condition: si entre el count y el delete alguien creó
    // un activo con esta categoría, el FK constraint hará fallar el delete.
    if (error.code === '23503') {
      throw new Error('No se puede eliminar una categoría con activos asociados');
    }
    throw new Error(error.message);
  }

  await logAudit('eliminar_categoria', 'categories', id, {});
  revalidatePath('/configuracion');
}
