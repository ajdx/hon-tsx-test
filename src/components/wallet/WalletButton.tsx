import { useState, useEffect, useRef } from 'react';
import { CustomWalletButton } from './CustomWalletButton';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const WalletButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Try to access wallet but don't break if context not available
  let wallet: any = { publicKey: null, connected: false };
  try {
    wallet = useWallet();
    console.log('Wallet context available:', wallet);
  } catch (error) {
    console.log('Wallet context not available in button');
  }
  
  const { publicKey, connected, connecting, disconnect, select, wallets } = wallet;
  
  // Try to access wallet modal
  let walletModal: any = { setVisible: () => {} };
  try {
    walletModal = useWalletModal();
    console.log('Wallet modal available:', walletModal);
  } catch (error) {
    console.log('Wallet modal context not available');
  }
  
  // Try to access auth but handle if not available
  let auth: any = { isAuthenticated: false, user: null };
  try {
    auth = useAuth();
  } catch (error) {
    console.log('Auth context not available in button');
  }

  useEffect(() => {
    // Wallet context check (debug logs removed for production)
    if (!walletContext) {
      return;
    }

    setWalletConnected(!!publicKey && connected);
  }, [publicKey, connected]);

  // Add event listener to track wallet selection
  useEffect(() => {
    const handleWalletSelected = (event: any) => {
      console.log('Wallet selection event detected:', event);
    };
    
    window.addEventListener('wallet-standard:app:connectWallet', handleWalletSelected);
    window.addEventListener('wallet-connect', handleWalletSelected);
    
    return () => {
      window.removeEventListener('wallet-standard:app:connectWallet', handleWalletSelected);
      window.removeEventListener('wallet-connect', handleWalletSelected);
    };
  }, []);

  // Add an effect to detect Phantom wallet specifically
  useEffect(() => {
    const checkPhantomWallet = () => {
      if (typeof window !== 'undefined') {
        const phantom = (window as any).phantom;
        
        if (phantom?.solana?.isPhantom) {
          console.log('✅ Phantom wallet detected in window object');
          if (phantom.solana.isConnected) {
            console.log('✅ Phantom wallet is already connected');
          } else {
            console.log('ℹ️ Phantom wallet is available but not connected');
          }
        } else {
          console.log('❌ Phantom wallet not detected in window object');
        }
      }
    };
    
    // Check immediately
    checkPhantomWallet();
    
    // Check again when the component is focused
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkPhantomWallet();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      console.log('🔗 [WalletButton] Starting connection process...');
      console.log('🔗 [WalletButton] Available wallets:', wallets?.length || 0);
      console.log('🔗 [WalletButton] Wallet details:', wallets?.map(w => ({ name: w.adapter?.name, readyState: w.readyState })));

      // Check if wallets are available
      if (!wallets || wallets.length === 0) {
        console.warn('🔗 [WalletButton] No wallets available. Opening modal...');
        if (walletModal && typeof walletModal.setVisible === 'function') {
          walletModal.setVisible(true);
          setIsLoading(false);
          return;
        } else {
          throw new Error('No wallet adapters found and modal not available');
        }
      }

      // Use wallet modal for reliable connection - works for all wallet types
      console.log('🔗 [WalletButton] Available wallets:', wallets.map(w => w.adapter?.name).join(', '));
      
      // Fallback: Open the wallet modal
      console.log('🔗 [WalletButton] Using modal fallback...');
      if (walletModal && typeof walletModal.setVisible === 'function') {
        walletModal.setVisible(true);
      } else {
        throw new Error('Wallet modal not available');
      }
    } catch (error) {
      console.error('🔗 [WalletButton] ❌ Connection failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast.error(`Wallet connection failed: ${error instanceof Error ? error.message : 'Please check your wallet extension'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting to disconnect wallet...');
      
      // Force UI state update immediately
      setWalletConnected(false);
      setDropdownOpen(false);
      
      // Check which wallet is actually connected
      let connectedWalletType = '';
      
      // Check Magic Eden
      if (window && (window as any).magicEden) {
        try {
          const isConnected = await (window as any).magicEden.isConnected();
          if (isConnected) {
            connectedWalletType = 'MagicEden';
            console.log('Detected connected Magic Eden wallet');
          }
        } catch (e) {
          console.log('Error checking Magic Eden connection:', e);
        }
      }
      
      // Check Phantom
      if (window && (window as any).phantom?.solana) {
        try {
          const isConnected = await (window as any).phantom.solana.isConnected;
          if (isConnected) {
            connectedWalletType = 'Phantom';
            console.log('Detected connected Phantom wallet');
          }
        } catch (e) {
          console.log('Error checking Phantom connection:', e);
        }
      }
      
      console.log('Connected wallet type:', connectedWalletType || 'Unknown');
      
      // Try to disconnect from the detected wallet type first
      if (connectedWalletType === 'MagicEden') {
        try {
          console.log('Disconnecting from Magic Eden...');
          await (window as any).magicEden.disconnect();
          console.log('Successfully disconnected from Magic Eden');
        } catch (e) {
          console.error('Failed to disconnect from Magic Eden:', e);
        }
      } else if (connectedWalletType === 'Phantom') {
        try {
          console.log('Disconnecting from Phantom...');
          await (window as any).phantom.solana.disconnect();
          console.log('Successfully disconnected from Phantom');
        } catch (e) {
          console.error('Failed to disconnect from Phantom:', e);
        }
      }
      
      // If we couldn't detect the wallet type or disconnect failed, try all methods
      
      // Try adapter-based disconnect method
      if (typeof disconnect === 'function') {
        try {
          console.log('Trying adapter disconnect()...');
          await disconnect();
          console.log('Successfully disconnected via adapter');
        } catch (error) {
          console.error('Error disconnecting via adapter:', error);
        }
      }
      
      // Try direct window.solana method
      if (window && (window as any).solana) {
        try {
          console.log('Trying window.solana disconnect...');
          await (window as any).solana.disconnect();
          console.log('Successfully disconnected via window.solana');
        } catch (error) {
          console.error('Error disconnecting via window.solana:', error);
        }
      }
      
      // Clear local storage wallet data that might be persisted
      try {
        localStorage.removeItem('walletName');
        localStorage.removeItem('wallet');
        localStorage.removeItem('walletAdapter');
        // Clear any other wallet-related local storage items
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.toLowerCase().includes('wallet') || key.toLowerCase().includes('solana')) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error('Error clearing local storage:', e);
      }

      // Force a page refresh after a short delay to ensure UI updates
      setTimeout(() => {
        console.log('Refreshing page to ensure clean wallet state');
        window.location.reload();
      }, 300);
      
    } catch (error) {
      console.error('Error in disconnect handler:', error);
      // Force update UI state and refresh as last resort
      setWalletConnected(false);
      setTimeout(() => window.location.reload(), 300);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate('/profile');
  };

  return walletConnected ? (
    <div className="wallet-connected-container relative" ref={dropdownRef}>
      <CustomWalletButton 
        onClick={() => setDropdownOpen(!dropdownOpen)} 
        label={publicKey ? `${publicKey.toString().substring(0, 4)}...${publicKey.toString().substring(publicKey.toString().length - 4)}` : 'Wallet'}
        isConnected={true}
        isLoading={isLoading || connecting}
      />
      
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-700 overflow-hidden">
          <button
            onClick={handleProfileClick}
            className="flex items-center w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            <span className="mr-2">👤</span> Profile
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button
            onClick={handleDisconnect}
            className="flex items-center w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            <span className="mr-2">🔌</span> Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="wallet-buttons">
      <CustomWalletButton 
        onClick={handleConnect} 
        label="Connect Wallet"
        isConnected={false}
        isLoading={isLoading || connecting}
      />
      

      
      {isLoading && (
        <div className="wallet-connection-help">
          <small>
            If wallet doesn't connect, check your wallet extension is unlocked and try again.
          </small>
        </div>
      )}
    </div>
  );
}; 