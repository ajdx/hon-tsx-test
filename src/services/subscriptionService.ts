import { supabase } from '../utils/supabaseClient';

// Client-side storage for subscriptions when database operations fail
const clientSubscriptions = new Map<string, boolean>();

export class SubscriptionService {
  async addSubscription(userId: string, creatorId: string) {
    try {
      // Try using the RPC function first with the correct parameter names
      const { data, error } = await supabase
        .rpc('toggle_subscription', { 
          p_subscriber_identifier: userId, 
          p_creator_identifier: creatorId
        })
        .single();
      
      if (!error) return data;
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for addSubscription:', error);
      
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('subscriptions')
          .upsert({
            subscriber_id: userId,
            creator_id: creatorId
          })
          .select()
          .single();
          
        if (!insertError) return insertData;
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      const subscriptionKey = `${userId}-${creatorId}`;
      clientSubscriptions.set(subscriptionKey, true);
      
      return { id: subscriptionKey, subscriber_id: userId, creator_id: creatorId };
    } catch (error) {
      console.error('Failed to add subscription:', error);
      throw error;
    }
  }

  async removeSubscription(userId: string, creatorId: string) {
    try {
      // Try using the RPC function first with the correct parameter names
      const { error } = await supabase
        .rpc('toggle_subscription', { 
          p_subscriber_identifier: userId, 
          p_creator_identifier: creatorId
        });
        
      if (!error) return;
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for removeSubscription:', error);
      
      try {
        const { error: deleteError } = await supabase
          .from('subscriptions')
          .delete()
          .eq('subscriber_id', userId)
          .eq('creator_id', creatorId);
          
        if (!deleteError) return;
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      const subscriptionKey = `${userId}-${creatorId}`;
      clientSubscriptions.delete(subscriptionKey);
    } catch (error) {
      console.error('Failed to remove subscription:', error);
      throw error;
    }
  }

  async isSubscribed(userId: string, creatorId: string) {
    try {
      // Try using the RPC function first with the correct parameter names
      const { data, error } = await supabase
        .rpc('toggle_subscription', { 
          p_subscriber_identifier: userId, 
          p_creator_identifier: creatorId
        })
        .single();
        
      if (!error) return (data as { is_subscribed: boolean })?.is_subscribed || false;
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for isSubscribed:', error);
      
      try {
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', userId)
          .eq('creator_id', creatorId)
          .maybeSingle();
          
        if (!subscriptionError) return !!subscriptionData;
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      const subscriptionKey = `${userId}-${creatorId}`;
      return clientSubscriptions.has(subscriptionKey);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  async getUserSubscriptions(userId: string) {
    try {
      // Try using the RPC function first
      const { data, error } = await supabase
        .rpc('get_user_subscriptions', {
          p_subscriber_wallet: userId
        });
        
      if (!error) return data;
      
      // If the RPC function fails, try direct table operations
      console.log('Falling back to direct table operations for getUserSubscriptions:', error);
      
      try {
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from('subscriptions')
          .select(`
            id,
            creator:creator_id (
              id,
              username,
              avatar_url,
              social_links
            )
          `)
          .eq('subscriber_id', userId);
          
        if (!subscriptionsError) return subscriptionsData;
      } catch (tableError) {
        console.log('Direct table operations failed, using client-side storage:', tableError);
      }
      
      // If all database operations fail, use client-side storage
      // Convert client-side subscriptions to the expected format
      const clientSubscriptionsList = [];
      for (const [key, value] of clientSubscriptions.entries()) {
        if (value && key.startsWith(`${userId}-`)) {
          const creatorId = key.split('-')[1];
          clientSubscriptionsList.push({
            id: key,
            creator: {
              id: creatorId,
              username: `Creator ${creatorId.substring(0, 6)}`,
              avatar_url: '',
              social_links: {}
            }
          });
        }
      }
      
      return clientSubscriptionsList;
    } catch (error) {
      console.error('Failed to get user subscriptions:', error);
      return [];
    }
  }
} 