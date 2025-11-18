export interface SocialLink {
  id: string;
  platform: 'twitter' | 'instagram' | 'website';
  url: string;
}

export interface UserProfile {
  username: string;
  socialLinks: SocialLink[];
} 