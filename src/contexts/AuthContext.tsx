import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  /** The signed-in Supabase user, or null. */
  currentUser: User | null;
  /** Public profile (name + avatar from Google). */
  profile: Profile | null;
  /**
   * True when the signed-in account's email is on the admin allow-list.
   * This only controls which buttons are SHOWN. The database enforces the
   * real rule (Row Level Security), so flipping this in devtools gains nothing.
   */
  isAdmin: boolean;
  /** True until the initial session and admin check have resolved. */
  loading: boolean;
  /** Starts Google sign-in. New accounts are created automatically. */
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  /**
   * Email + password. Sign-up returns `needsConfirmation: true` when Supabase
   * is waiting for the person to click the link in their email.
   */
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
    returnTo?: string
  ) => Promise<{ needsConfirmation: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function profileFromUser(user: User): Profile {
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    fullName: meta.full_name || meta.name || null,
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckedFor, setAdminCheckedFor] = useState<string | null>(null);

  const currentUser = session?.user ?? null;
  const userId = currentUser?.id ?? null;

  // Track the session. Keep this callback synchronous: calling other
  // Supabase APIs inside onAuthStateChange can deadlock the auth client.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Ask the database whether this user is an admin, once per signed-in user.
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setAdminCheckedFor(null);
      return;
    }
    let active = true;
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('Could not check admin status:', error.message);
      setIsAdmin(!error && data === true);
      setAdminCheckedFor(userId);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const signInWithGoogle = useCallback(async (returnTo: string = '/') => {
    // Only ever return to a path on this site.
    const path = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${path}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string, returnTo: string = '/') => {
      const path = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Read by the handle_new_user trigger to fill in the profile name.
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}${path}`,
        },
      });
      if (error) throw error;
      // No session yet means the confirmation email must be clicked first.
      return { needsConfirmation: !data.session };
    },
    []
  );

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      profile: currentUser ? profileFromUser(currentUser) : null,
      isAdmin: Boolean(userId) && adminCheckedFor === userId && isAdmin,
      loading: !sessionLoaded || (Boolean(userId) && adminCheckedFor !== userId),
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout,
    }),
    [
      currentUser,
      userId,
      isAdmin,
      adminCheckedFor,
      sessionLoaded,
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
