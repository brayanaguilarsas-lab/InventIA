'use server';

import { createClient } from '@/lib/supabase/server';
import { createPersonSchema, type CreatePersonInput } from '@/lib/validations';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getPeople() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('full_name');

  if (error) throw new Error(error.message);
  return data;
}

export async function getActivePeople() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw new Error(error.message);
  return data;
}

export async function getPersonById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createPerson(input: CreatePersonInput) {
  const parsed = createPersonSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('people')
    .insert(parsed)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe una persona con ese número de identificación');
    }
    throw new Error(error.message);
  }

  await logAudit('crear_persona', 'people', data.id, { full_name: data.full_name });
  revalidatePath('/personas');
  return data;
}

export async function updatePerson(id: string, input: Partial<CreatePersonInput>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('people')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit('actualizar_persona', 'people', data.id, { full_name: data.full_name });
  revalidatePath('/personas');
  return data;
}

export async function togglePersonActive(id: string) {
  const supabase = await createClient();

  const person = await getPersonById(id);
  const { data, error } = await supabase
    .from('people')
    .update({ is_active: !person.is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(
    data.is_active ? 'activar_persona' : 'desactivar_persona',
    'people',
    data.id,
    { full_name: data.full_name }
  );
  revalidatePath('/personas');
  return data;
}
