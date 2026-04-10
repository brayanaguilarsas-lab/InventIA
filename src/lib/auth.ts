import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserProfile } from '@/types/database';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) return profile as UserProfile;

  // Auto-create profile if it doesn't exist
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
}

export async function getAdminUsers(): Promise<UserProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .order('full_name');

  return (data ?? []) as UserProfile[];
}
