import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback } from 'react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const WalletBalance = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (walletAddress: PublicKey) => {
    try {
      // Use confirmed commitment for Devnet
      const balance = await connection.getBalance(walletAddress, 'confirmed');
      setBalance(balance / LAMPORTS_PER_SOL);
      setError(null);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
      // Keep the last known balance instead of setting to null
    }
  }, [connection]);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      setError(null);
      return;
    }

    // Initial fetch
    fetchBalance(publicKey);

    // Set up WebSocket subscription for real-time updates
    const subscriptionId = connection.onAccountChange(
      publicKey,
      (account) => {
        setBalance(account.lamports / LAMPORTS_PER_SOL);
        setError(null);
      },
      'confirmed'
    );

    // Polling as backup, but with a longer interval since we have WebSocket
    const intervalId = setInterval(() => {
      fetchBalance(publicKey);
    }, 5000); // Reduced polling frequency to 5 seconds

    return () => {
      clearInterval(intervalId);
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [publicKey, connection, fetchBalance]);

  if (!publicKey) return null;

  return (
    <div className="bg-gradient-to-r from-blue-400 to-purple-400 dark:from-blue-500 dark:to-purple-500 p-6 rounded-lg shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-800 dark:text-white text-sm font-medium mb-1 transition-colors">Current Balance</p>
          <p className="text-gray-900 dark:text-white text-3xl font-bold transition-colors">
            {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
          </p>
        </div>
        <div className="bg-white/20 dark:bg-black/20 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-800 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-red-700 dark:text-red-300 text-sm mt-2 transition-colors">{error}</p>
      )}
    </div>
  );
}; 