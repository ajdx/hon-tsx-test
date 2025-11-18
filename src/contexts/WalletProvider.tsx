import { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SOLANA_CONFIG } from '../config/solana';
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletError } from '@solana/wallet-adapter-base';

interface Props {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  // Initialize wallet adapters (debug logs removed for production)
  const wallets = useMemo(() => {
    // More robust detection options
    const detectionOptions = { 
      iframe: false,
      timeout: 3000 // Give more time for wallet detection
    };
    
    const walletList = [
      new PhantomWalletAdapter(detectionOptions),
      new SolflareWalletAdapter(detectionOptions),
      new BackpackWalletAdapter(detectionOptions)
    ];
    
    return walletList;
  }, []);

  const onError = (error: WalletError) => {
    console.error('🚨 Wallet error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  };

  useEffect(() => {
    console.log('🔗 Starting wallet provider initialization...');
    
    // Wait for DOM and wallet extensions to be ready
    const readyCheck = setTimeout(() => {
      console.log('🔗 Wallet provider ready');
      setIsReady(true);
    }, 500); // Increased timeout for better wallet detection

    return () => clearTimeout(readyCheck);
  }, []);

  useEffect(() => {
    if (isReady) {
      console.log('🔗 Available wallets after initialization:', wallets.map(w => w.name));
    }
  }, [isReady, wallets]);

  if (!isReady) {
    return <div style={{ display: 'none' }}>Initializing wallets...</div>;
  }

  return (
    <ConnectionProvider endpoint={SOLANA_CONFIG.endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={SOLANA_CONFIG.autoConnect}
        onError={onError}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}; 