import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Gift } from 'lucide-react';
import { solanaService } from '../../services/solanaService';
import { useSolana } from '../../contexts/SolanaContext';
import { WalletButton } from './WalletButton';

interface SupportCreatorProps {
  creatorWallet: string;
  comicId: string;
  onSuccess?: () => void;
}

export const SupportCreator: React.FC<SupportCreatorProps> = ({
  creatorWallet,
  comicId,
  onSuccess
}) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { isConnected } = useSolana();
  const [amount, setAmount] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSupport = async () => {
    if (!isConnected || !publicKey || !creatorWallet) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const recipientPubKey = new PublicKey(creatorWallet);
      
      const signature = await solanaService.sendSol(
        connection,
        publicKey,
        recipientPubKey,
        amount,
        sendTransaction
      );

      console.log('Support transaction successful:', signature);
      onSuccess?.();
    } catch (err) {
      console.error('Support transaction failed:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!creatorWallet) return null;

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      {!isConnected ? (
        <div className="text-center">
          <p className="text-gray-300 mb-4">Connect your wallet to support this creator</p>
          <WalletButton />
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md w-24 text-white"
              disabled={isProcessing}
            />
            <span className="text-sm text-gray-400">SOL</span>
          </div>

          <button
            onClick={handleSupport}
            disabled={isProcessing}
            className={`flex items-center justify-center px-4 py-2 rounded-md space-x-2
              ${isProcessing 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700'} text-white`}
          >
            <Gift className="w-4 h-4" />
            <span>
              {isProcessing ? 'Processing...' : 'Support Creator'}
            </span>
          </button>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}; 