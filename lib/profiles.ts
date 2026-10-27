import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at?: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!userId || userId === 'unknown') {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; role?: Role }
) {
  if (!userId || userId === 'unknown') {
    return { error: 'User required' };
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error?.message ?? null };
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Profile[];
}

export async function setUserRole(
  userId: string,
  role: Role
): Promise<{ error: string | null }> {
  if (!userId) {
    return { error: 'User required' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  return { error: error?.message ?? null };
}
