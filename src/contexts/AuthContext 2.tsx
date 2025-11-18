import { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../utils/supabaseClient';

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id: string | null;
    username: string | null;
    wallet: string | null;
    authMethod: 'discord' | 'twitter' | 'google' | null;
  } | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { publicKey } = useWallet();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Link wallet to existing account if needed
  useEffect(() => {
    if (session?.user && publicKey) {
      supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          solana_wallet: publicKey.toString(),
          wallet_connected: true,
        })
        .then(({ error }) => {
          if (error) setError(error.message);
        });
    }
  }, [session?.user, publicKey]);

  const value = {
    isAuthenticated: !!session || !!publicKey,
    user: session?.user ? {
      id: session.user.id,
      username: session.user.user_metadata?.username,
      wallet: publicKey?.toString() || null,
      authMethod: session.user.app_metadata?.provider,
    } : null,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 