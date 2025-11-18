import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Gift, X } from 'lucide-react';
import { Comic } from '../../types';
import { solanaService } from '../../services/solanaService';
import { useSolana } from '../../contexts/SolanaContext';
import { WalletButton } from '../wallet/WalletButton';
import { formatSOL } from '../../utils/format';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  comic: Comic;
  onSuccess: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  comic,
  onSuccess
}) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { isConnected, balance } = useSolana();
  const [amount, setAmount] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate fee breakdown
  const { recipientAmount, platformFee } = solanaService.calculateFee(amount);

  if (!isOpen) return null;

  const handleSupport = async () => {
    if (!isConnected || !publicKey || !comic.creatorWallet) {
      setError('Please connect your wallet first');
      return;
    }

    if (amount > balance) {
      setError('Insufficient balance');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setIsCompleted(false);

    try {
      const recipientPubKey = new PublicKey(comic.creatorWallet);
      
      const signature = await solanaService.sendSol(
        connection,
        publicKey,
        recipientPubKey,
        amount,
        sendTransaction
      );

      console.log('Support transaction successful:', signature);
      setIsCompleted(true);
      onSuccess();
      // Wait 2 seconds before closing to show the success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Support transaction failed:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Support Creator</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-white mb-2">{comic.title || 'Untitled'}</h3>
            <p className="text-gray-400">by {comic.creator || 'Anonymous'}</p>
          </div>

          {!isConnected ? (
            <div className="text-center">
              <p className="text-gray-300 mb-4">Connect your wallet to support this creator</p>
              <WalletButton />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Amount (SOL)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={amount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setAmount(value);
                      if (value > balance) {
                        setError('Insufficient balance');
                      } else if (value <= 0) {
                        setError('Amount must be greater than 0');
                      } else {
                        setError(null);
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    disabled={isProcessing}
                  />
                  <span className="text-sm text-gray-400">SOL</span>
                </div>

                {/* Fee Breakdown */}
                <div className="mt-4 p-3 bg-gray-700/50 rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Creator receives:</span>
                    <span className="text-white">{formatSOL(recipientAmount)} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Platform fee (1.8%):</span>
                    <span className="text-white">{formatSOL(platformFee)} SOL</span>
                  </div>
                  <div className="border-t border-gray-600 mt-2 pt-2 flex justify-between font-medium">
                    <span className="text-gray-300">Total:</span>
                    <span className="text-white">{formatSOL(amount)} SOL</span>
                  </div>
                </div>

                <p className="text-sm text-gray-400">
                  Balance: {formatSOL(balance)} SOL
                </p>
              </div>

              <button
                onClick={handleSupport}
                disabled={isProcessing || !!error || isCompleted}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-md space-x-2
                  ${isProcessing || !!error
                    ? 'bg-gray-600 cursor-not-allowed'
                    : isCompleted
                    ? 'bg-green-600'
                    : 'bg-purple-600 hover:bg-purple-700'} text-white`}
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin mr-2">⚡</span>
                    <span>Processing...</span>
                  </>
                ) : isCompleted ? (
                  <>
                    <span className="mr-2">🎉</span>
                    <span>Support Appreciated!</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    <span>Support Creator</span>
                  </>
                )}
              </button>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 