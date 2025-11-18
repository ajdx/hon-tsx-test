import React, { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../utils/supabaseClient';

interface LoginDropdownProps {
  isNavbar?: boolean;
}

export const LoginDropdown: React.FC<LoginDropdownProps> = ({ isNavbar }) => {
  const { connected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const handleSocialLogin = async (provider: 'discord' | 'twitter' | 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const toggleDropdown = () => setIsOpen(!isOpen);

  if (connected) {
    return <WalletMultiButton className="block w-full text-left" />;
  }

  if (isNavbar) {
    return (
      <div className="relative inline-block text-left">
        <button
          onClick={toggleDropdown}
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
        >
          Sign In
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1 text-center">
              <button
                onClick={() => handleSocialLogin('google')}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
              >
                Google
              </button>
              <button
                onClick={() => handleSocialLogin('discord')}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
              >
                Discord
              </button>
              <button
                onClick={() => handleSocialLogin('twitter')}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
              >
                X (Twitter)
              </button>
              <div className="border-t border-gray-200"></div>
              <WalletMultiButton className="block w-full text-left bg-purple-600 hover:bg-purple-700 text-white" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return <WalletMultiButton className="block w-full text-left" />;
}; 