'use server';

import { createClient } from '@/lib/supabase/server';
import { createPersonSchema, type CreatePersonInput } from '@/lib/validations';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getPeople(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('people')
    .select('*', { count: 'exact' })
    .order('full_name')
    .range(from, to);

  if (filters?.search) {
    const pattern = `%${filters.search}%`;
    query = query.or(`full_name.ilike.${pattern},id_number.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: count ?? 0 };
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

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

export interface BulkImportRow {
  full_name?: string;
  id_number?: string;
  id_type?: string;
  person_type?: string;
  area?: string;
  position?: string;
  email?: string;
}

export async function bulkImportPeople(rows: BulkImportRow[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');
  const skipped: { id_number: string; reason: string }[] = [];
  const errors: { id_number: string; reason: string }[] = [];

  const ID_TYPES = ['CC', 'CE', 'Pasaporte', 'NIT'];
  const PERSON_TYPES = ['empleado', 'contratista'];

  // Normalizar y separar filas válidas de inválidas
  const validRows: Array<{
    full_name: string; id_number: string; id_type: string;
    person_type: string; area: string; position: string; email: string;
  }> = [];

  for (const raw of rows) {
    const full_name = (raw.full_name ?? '').trim();
    const id_number = (raw.id_number ?? '').trim();
    const email = (raw.email ?? '').trim();

    if (!full_name || !id_number) {
      errors.push({
        id_number: id_number || '(sin id)',
        reason: 'Nombre e identificación son obligatorios',
      });
      continue;
    }

    const id_type_raw = (raw.id_type ?? '').trim();
    const id_type = ID_TYPES.includes(id_type_raw) ? id_type_raw : 'CC';
    const person_type_raw = (raw.person_type ?? '').trim().toLowerCase();
    const person_type = PERSON_TYPES.includes(person_type_raw) ? person_type_raw : 'empleado';

    validRows.push({
      full_name,
      id_number,
      id_type,
      person_type,
      area: (raw.area ?? '').trim() || 'Sin asignar',
      position: (raw.position ?? '').trim() || 'Sin asignar',
      email: email || `${id_number}@pendiente.saleads.local`,
    });
  }

  // Detectar duplicados ya existentes en una sola query
  const existingIds = new Set<string>();
  if (validRows.length > 0) {
    const { data: existing } = await supabase
      .from('people')
      .select('id_number')
      .in('id_number', validRows.map((r) => r.id_number));
    for (const e of existing ?? []) existingIds.add((e as { id_number: string }).id_number);
  }

  const toInsert = validRows.filter((r) => {
    if (existingIds.has(r.id_number)) {
      skipped.push({ id_number: r.id_number, reason: 'Ya existe' });
      return false;
    }
    return true;
  });

  // Insert en batch (una sola query)
  let inserted: Array<{ id: string; full_name: string; id_number: string }> = [];
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('people')
      .insert(toInsert)
      .select('id, full_name, id_number');
    if (error) {
      errors.push({ id_number: '(batch)', reason: error.message });
    } else {
      inserted = data ?? [];
    }
  }

  // Auditoría en paralelo
  await Promise.all(
    inserted.map((p) =>
      logAudit('importar_persona', 'people', p.id, {
        full_name: p.full_name,
        id_number: p.id_number,
        source: 'csv_bulk_import',
      })
    )
  );

  revalidatePath('/personas');
  return { created: inserted.length, skipped, errors, total: rows.length };
}

export async function togglePersonSpartian(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

  const person = await getPersonById(id);
  const next = !person.is_spartian;

  const { data, error } = await supabase
    .from('people')
    .update({ is_spartian: next })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(
    next ? 'marcar_spartian' : 'desmarcar_spartian',
    'people',
    data.id,
    { full_name: data.full_name }
  );
  revalidatePath('/personas');
  revalidatePath('/asignaciones');
  return data;
}

export async function togglePersonActive(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesión inválida');

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
