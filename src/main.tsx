import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// No longer needed as we're using standard wallet detection
// import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { SolanaProvider } from './contexts/SolanaContext';
import { AuthProvider } from './contexts/AuthContext';
import '@solana/wallet-adapter-react-ui/styles.css';
import { BrowserRouter } from 'react-router-dom';
import { checkEnvironmentVariables } from './utils/checkEnv';

// Performance measurement
console.time('app-initialization');

const endpoint = clusterApiUrl('devnet');

// Initialize wallet adapters - use empty array to rely on standard wallet detection
const wallets = [];

// Environment validation
checkEnvironmentVariables();

// Application initialization (debug logs removed for production)

// Define a wallet error handler to help with debugging
const onError = (error: Error) => {
  console.error('Wallet error:', error);
};

// The order matters! The correct nesting order is:
// BrowserRouter (outer) -> ConnectionProvider -> WalletProvider -> WalletModalProvider -> SolanaProvider -> AuthProvider -> App (inner)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider 
          wallets={wallets} 
          autoConnect={true} 
          onError={onError}>
          <WalletModalProvider>
            <SolanaProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </SolanaProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  </React.StrictMode>
);

console.timeEnd('app-initialization');