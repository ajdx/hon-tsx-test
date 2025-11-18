import { Connection, PublicKey, Transaction, SystemProgram, SendTransactionError, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Platform fee configuration
const PLATFORM_FEE_PERCENT = 1.8; // 1.8%
const PLATFORM_WALLET = new PublicKey('DTfS2QwBkXZKVMUmJ2eZo3d1enk7hyAcxfQGq4HNRZkp'); // Temporary platform wallet

class SolanaService {
  async sendSol(
    connection: Connection,
    senderPublicKey: PublicKey,
    recipientPublicKey: PublicKey,
    amount: number,
    sendTransaction: WalletContextState['sendTransaction']
  ): Promise<string> {
    try {
      const transaction = new Transaction();
      
      // Convert amount to lamports
      const totalLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const platformFeeLamports = Math.floor((totalLamports * PLATFORM_FEE_PERCENT) / 100);
      const recipientLamports = totalLamports - platformFeeLamports;

      // Add transfer instructions
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: recipientPublicKey,
          lamports: recipientLamports,
        }),
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: PLATFORM_WALLET,
          lamports: platformFeeLamports,
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      return signature;
      
    } catch (error) {
      if (error instanceof SendTransactionError) {
        // Handle wallet extension context errors
        if (error.message.includes('Extension context invalidated')) {
          throw new Error('Please refresh the page and try again');
        }
        throw new Error('Transaction was not confirmed');
      }
      console.error('Transaction error:', error);
      throw error;
    }
  }

  calculateFee(amount: number) {
    const platformFee = (amount * PLATFORM_FEE_PERCENT) / 100;
    const recipientAmount = amount - platformFee;
    return { recipientAmount, platformFee };
  }
}

export const solanaService = new SolanaService(); 