import { create } from 'zustand';
import { SubscriptionService } from '../services/subscriptionService';

const subscriptionService = new SubscriptionService();

interface SubscriptionStore {
  addSubscription: (userId: string, creatorId: string) => Promise<void>;
  removeSubscription: (userId: string, creatorId: string) => Promise<void>;
  isSubscribed: (userId: string, creatorId: string) => Promise<boolean>;
  getUserSubscriptions: (userId: string) => Promise<any[]>;
}

export const useSubscriptionStore = create<SubscriptionStore>(() => ({
  addSubscription: async (userId: string, creatorId: string) => {
    await subscriptionService.addSubscription(userId, creatorId);
  },
  removeSubscription: async (userId: string, creatorId: string) => {
    await subscriptionService.removeSubscription(userId, creatorId);
  },
  isSubscribed: async (userId: string, creatorId: string) => {
    return await subscriptionService.isSubscribed(userId, creatorId);
  },
  getUserSubscriptions: async (userId: string) => {
    return await subscriptionService.getUserSubscriptions(userId);
  }
})); 