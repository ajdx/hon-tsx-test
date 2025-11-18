import { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../utils/supabaseClient';

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id: string | null;
    username: string | null;
    wallet: string | null;
    authMethod: 'discord' | 'twitter' | 'google' | 'wallet' | null;
  } | null;
  loading: boolean;
  error: string | null;
  updateUsername?: (username: string) => Promise<void>;
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
  const [walletProfile, setWalletProfile] = useState<any>(null);

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

  // Handle wallet authentication
  useEffect(() => {
    const handleWalletAuth = async () => {
      if (!publicKey) {
        setWalletProfile(null);
        return;
      }

      try {
        // Profile check (debug logs removed for production)
        if (session?.user) {
          // Check if this user already has a profile
          const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (userProfileError && userProfileError.code !== 'PGRST116') {
            console.error('Error checking user profile:', userProfileError);
            throw userProfileError;
          }

          if (userProfile) {
            // Update existing profile with wallet address
            const { data: updatedProfile, error: updateError } = await supabase
              .from('profiles')
              .update({
                solana_wallet: publicKey.toString(),
                wallet_connected: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', session.user.id)
              .select()
              .single();

            if (updateError) {
              console.error('Error linking wallet to user profile:', updateError);
              throw updateError;
            }
            
            // console.log('Wallet linked to existing user profile:', updatedProfile);
            setWalletProfile(updatedProfile);
            return;
          }
        }
        
        // Check if a profile exists with this wallet address
        const { data: existingWalletProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('solana_wallet', publicKey.toString())
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile query error:', profileError);
          throw profileError;
        }

        // console.log('Existing wallet profile:', existingWalletProfile);

        if (!existingWalletProfile) {
          // console.log('Creating new profile for wallet');
          
          const profileData: any = {
            solana_wallet: publicKey.toString(),
            wallet_connected: true,
            auth_method: 'wallet',
            is_creator: false,
            notification_preferences: {
              support_received: true,
              new_stories: true
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // If user has active session, use their user ID, otherwise generate a wallet ID
          if (session?.user) {
            profileData.id = session.user.id;
            profileData.email = session.user.email;
            
            // Extract username from session metadata
            const provider = session.user.app_metadata?.provider || 'email';
            if (provider === 'discord') {
              profileData.username = session.user.user_metadata?.preferred_username || 
                                   session.user.user_metadata?.username;
            } else if (provider === 'google') {
              profileData.username = session.user.user_metadata?.name;
            } else {
              profileData.username = session.user.user_metadata?.username;
            }
                     } else {
             // Wallet-only authentication - create profile with wallet_id
             profileData.wallet_id = crypto.randomUUID();
           }

          // Create a new profile for the wallet
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single();

          if (insertError) {
            console.error('Profile creation error:', insertError);
            throw insertError;
          }
          
          // console.log('New profile created:', newProfile);
          setWalletProfile(newProfile);
        } else {
          // console.log('Using existing wallet profile');
          setWalletProfile(existingWalletProfile);
        }
      } catch (err) {
        console.error('Error handling wallet auth:', err);
        setError(err instanceof Error ? err.message : 'Failed to authenticate wallet');
      }
    };

    handleWalletAuth();
  }, [publicKey, session]);

  const updateUsername = async (username: string) => {
    try {
      if (!publicKey) throw new Error('No wallet connected');

      // console.log('Attempting to update username for wallet:', publicKey.toString());

      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('solana_wallet', publicKey.toString())
        .maybeSingle();

      if (checkError) {
        console.error('Error checking profile:', checkError);
        throw checkError;
      }

      // console.log('Existing profile check result:', existingProfile);

      if (!existingProfile) {
        // console.log('Creating new profile with username');
        // Create profile if it doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            wallet_id: crypto.randomUUID(),
            solana_wallet: publicKey.toString(),
            username,
            wallet_connected: true,
            auth_method: 'wallet',
            is_creator: false,
            notification_preferences: {
              support_received: true,
              new_stories: true
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }

        // console.log('New profile created:', newProfile);
        setWalletProfile(newProfile);
        return;
      }

      // console.log('Updating existing profile with new username');
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username,
          updated_at: new Date().toISOString()
        })
        .eq('solana_wallet', publicKey.toString())
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      // console.log('Profile updated successfully:', updatedProfile);
      setWalletProfile(updatedProfile);
    } catch (err) {
      console.error('Error updating username:', err);
      throw new Error('Failed to update username. Please try again.');
    }
  };

  const value = {
    isAuthenticated: !!session || !!publicKey,
    user: session?.user ? {
      id: session.user.id,
      username: session.user.user_metadata?.username || walletProfile?.username,
      wallet: publicKey?.toString() || walletProfile?.solana_wallet || null,
      authMethod: session.user.app_metadata?.provider || (publicKey ? 'wallet' : null),
    } : publicKey && walletProfile ? {
      id: walletProfile.id || walletProfile.wallet_id,
      username: walletProfile.username,
      wallet: publicKey.toString(),
      authMethod: 'wallet',
    } : null,
    loading,
    error,
    updateUsername,
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