import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function setAuth(session: Session | null) {
  globalSession = session;
  notify();
}

/**
 * Restore a persisted session once on app start, then keep the store in sync
 * with sign-in / sign-out / token refresh via `onAuthStateChange`.
 *
 * A timeout guards against `getSession()` never resolving (a known issue when
 * running in Expo Go); after 3s we fall back to a logged-out state so the app
 * never gets stuck on the loading spinner.
 */
async function initAuth() {
  if (initialized) return;
  initialized = true;

  const restore = async (): Promise<Session | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session ?? null;
    } catch {
      return null;
    }
  };

  const session = await Promise.race([
    restore(),
    new Promise<Session | null>((resolve) =>
      setTimeout(() => resolve(null), 3000)
    ),
  ]);

  setAuth(session);

  supabase.auth.onAuthStateChange((_event, session) => {
    setAuth(session);
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: globalSession,
    user: globalSession?.user ?? null,
    loading: !initialized,
  });

  useEffect(() => {
    const update = () => {
      setState({
        session: globalSession,
        user: globalSession?.user ?? null,
        loading: false,
      });
    };

    listeners.add(update);
    initAuth();

    return () => {
      listeners.delete(update);
    };
  }, []);

  return state;
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signIn(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({ email, password });

  if (!result.error && result.data.session) {
    setAuth(result.data.session);
  }

  return result;
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: profile,
    },
  });

  if (!result.error && result.data.session && profile) {
    const user = result.data.session.user;

    await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role,
      })
      .eq('id', user.id);

    setAuth(result.data.session);
  }

  return result;
}

export async function signOut() {
  setAuth(null);

  await supabase.auth.signOut().catch(() => undefined);

  return { error: null };
}
