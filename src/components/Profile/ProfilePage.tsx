import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { X as XIcon, Instagram, Globe, Eye, EyeOff } from 'lucide-react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { SocialLink } from '../../types/profile';
import { WalletBalance } from './WalletBalance';
import { TransactionAnalytics } from './TransactionAnalytics';
import { UsernameInput } from './UsernameInput';
import { useAuth } from '../../contexts/AuthContext';

export const ProfilePage: React.FC = () => {
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [showWallet, setShowWallet] = useState(true);
  
  const addSocialLink = (platform: SocialLink['platform']) => {
    const newLinks = [
      ...profile.socialLinks,
      { id: Math.random().toString(), platform, url: '' }
    ];
    updateProfile({ socialLinks: newLinks });
  };

  const updateSocialLink = (id: string, url: string) => {
    const newLinks = profile.socialLinks.map(link => 
      link.id === id ? { ...link, url } : link
    );
    updateProfile({ socialLinks: newLinks });
  };

  const removeSocialLink = (id: string) => {
    const newLinks = profile.socialLinks.filter(link => link.id !== id);
    updateProfile({ socialLinks: newLinks });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <XIcon className="w-5 h-5" />;
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'website': return <Globe className="w-5 h-5" />;
      default: return null;
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!showWallet) return '••••••••••••';
    const start = address.slice(0, 4);
    const end = address.slice(-4);
    return `${start}...${end}`;
  };

  return (
    <div className="min-h-screen bg-indigo-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
          {/* Profile Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">User Profile</h1>
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 transition-colors">
              <p>
                {publicKey 
                  ? formatWalletAddress(publicKey.toString()) 
                  : 'Connect your wallet to view profile'}
              </p>
              {publicKey && (
                <button
                  onClick={() => setShowWallet(!showWallet)}
                  className="p-1 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
                  aria-label={showWallet ? 'Hide wallet address' : 'Show wallet address'}
                >
                  {showWallet ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Username Section */}
          <div className="mb-8">
            <UsernameInput />
          </div>

          {/* Social Links Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Social Links</h2>
            <div className="space-y-4">
              {profile.socialLinks.map(link => (
                <div key={link.id} className="flex items-center space-x-3">
                  <div className="text-gray-600 dark:text-gray-400 transition-colors">
                    {getPlatformIcon(link.platform)}
                  </div>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateSocialLink(link.id, e.target.value)}
                    placeholder={`Enter your ${link.platform} URL`}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-md flex-grow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeSocialLink(link.id)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => addSocialLink('twitter')}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Add X (formerly Twitter)"
                >
                  <XIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => addSocialLink('instagram')}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Add Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </button>
                <button
                  onClick={() => addSocialLink('website')}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Add Website"
                >
                  <Globe className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Wallet Balance Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 transition-colors">Wallet Balance</h2>
            <WalletBalance />
          </div>

          {/* Transaction Analytics Section */}
          <div>
            <TransactionAnalytics />
          </div>
        </div>
      </div>
    </div>
  );
}; 