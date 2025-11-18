import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '../utils/supabaseClient';

export const supportService = {
  async sendSupport(recipientId: string, comicId: string, amount: number) {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    if (!publicKey) throw new Error('Wallet not connected');

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(recipientId),
          lamports: amount * LAMPORTS_PER_SOL
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      if (signature) {
        await supabase.from('support_transactions').insert({
          recipient_id: recipientId,
          comic_id: comicId,
          amount: amount,
          signature: signature
        });
      }

      return signature;
    } catch (error) {
      console.error('Error sending support:', error);
      throw error;
    }
  }
}; 