import { useState } from 'react';
import { UserProfile } from '../types/profile';

const defaultProfile: UserProfile = {
  username: '',
  socialLinks: []
};

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({
      ...prev,
      ...updates
    }));
  };

  return { profile, updateProfile };
}; 