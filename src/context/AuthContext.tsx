import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  email?: string | null;
  role_id?: number | null;
  role?: string | null;
};

interface AuthContextType {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  isTeacher: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (uid?: string | null) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const id = uid ?? userData?.user?.id ?? null;
      setUserId(id);
      if (!id) {
        setProfile(null);
        return;
      }
      // fetch from profiles table
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (!error && data) {
        console.log('[AuthContext] profile loaded:', JSON.stringify(data));
        setProfile(data as Profile);
      } else {
        console.warn('[AuthContext] profile fetch error:', error);
        setProfile(null);
      }
    } catch (err) {
      console.warn('fetchProfile error', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchProfile(null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // when auth changes, refresh profile
      fetchProfile(session?.user?.id ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const isTeacher = Boolean(profile?.role_id === 2 || profile?.role === 'teacher' || profile?.role === 'instructor');
  console.log('[AuthContext] isTeacher:', isTeacher, '| role_id:', profile?.role_id, '| role:', profile?.role);

  return (
    <AuthContext.Provider value={{ loading, userId, profile, isTeacher, refreshProfile: () => fetchProfile(userId) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
