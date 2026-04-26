import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { UserProfile } from '@/types/database';

// getUser() memoizado por request: múltiples páginas/acciones que lo llamen
// comparten una sola respuesta. Evita N llamadas a /auth/v1/user.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

// Memoizado también: se usa en layout y en acciones.
export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) return profile as UserProfile;

  // Auto-create profile si no existe
  const { data: newProfile } = await supabase
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email!,
      full_name: user.email!.split('@')[0],
      role: 'admin',
    })
    .select()
    .single();

  return newProfile as UserProfile;
});

export async function getAdminUsers(): Promise<UserProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .order('full_name');

  return (data ?? []) as UserProfile[];
}
