export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  
  // Auth state
  auth_method: 'discord' | 'twitter' | 'google' | null;
  solana_wallet: string | null;
  wallet_connected: boolean;
  
  // Auth IDs for social logins
  discord_id: string | null;
  twitter_id: string | null;
  google_id: string | null;
  
  // Social profile links
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  
  // Creator status
  is_creator: boolean;
  
  // Support notifications
  notification_preferences: {
    support_received: boolean;
    new_stories: boolean;
  };
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id'>>;
      };
    };
  };
} 