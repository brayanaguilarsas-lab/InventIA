'use server';

import { createClient } from '@/lib/supabase/server';
import { createAssetSchema, type CreateAssetInput } from '@/lib/validations';
import { logAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { createAssetFolder } from '@/lib/google-drive';

export async function getAssets(filters?: {
  status?: string;
  category_id?: string;
  search?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from('assets')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getAssetById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assets')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAvailableAssets() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assets')
    .select('*, category:categories(*)')
    .eq('status', 'disponible')
    .order('name');

  if (error) throw new Error(error.message);
  return data;
}

export async function createAsset(input: CreateAssetInput) {
  const parsed = createAssetSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('assets')
    .insert({
      ...parsed,
      created_by: user?.id,
    })
    .select('*, category:categories(*)')
    .single();

  if (error) throw new Error(error.message);

  // Create Google Drive folder (if configured)
  try {
    const folderUrl = await createAssetFolder(data.code, data.name);
    await supabase.from('assets').update({ drive_folder_url: folderUrl }).eq('id', data.id);
    data.drive_folder_url = folderUrl;
  } catch (e) {
    console.error('[Drive] Folder creation skipped:', (e as Error).message);
  }

  await logAudit('crear_activo', 'assets', data.id, {
    code: data.code,
    name: data.name,
  });
  revalidatePath('/activos');
  return data;
}

export async function updateAsset(id: string, input: Partial<CreateAssetInput>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('assets')
    .update(input)
    .eq('id', id)
    .select('*, category:categories(*)')
    .single();

  if (error) throw new Error(error.message);

  await logAudit('actualizar_activo', 'assets', data.id, {
    code: data.code,
    name: data.name,
  });
  revalidatePath('/activos');
  revalidatePath(`/activos/${id}`);
  return data;
}

export async function getAssetHistory(assetId: string) {
  const supabase = await createClient();

  const [assignments, maintenances, retirements] = await Promise.all([
    supabase
      .from('assignments')
      .select('*, person:people(*)')
      .eq('asset_id', assetId)
      .order('assigned_at', { ascending: false }),
    supabase
      .from('maintenances')
      .select('*')
      .eq('asset_id', assetId)
      .order('sent_at', { ascending: false }),
    supabase
      .from('asset_retirements')
      .select('*')
      .eq('asset_id', assetId),
  ]);

  return {
    assignments: assignments.data ?? [],
    maintenances: maintenances.data ?? [],
    retirements: retirements.data ?? [],
  };
}
