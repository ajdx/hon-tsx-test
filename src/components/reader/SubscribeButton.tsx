import { UserPlus, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useAuth } from '../../contexts/AuthContext';

interface SubscribeButtonProps {
  creatorId: string;
}

export const SubscribeButton: React.FC<SubscribeButtonProps> = ({ creatorId }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { addSubscription, removeSubscription, isSubscribed: checkSubscription } = useSubscriptionStore();

  useEffect(() => {
    // Authentication check (debug logs removed for production)
    if (!user || !isAuthenticated || !user.id || !creatorId) {
      return;
    }
    
    const checkSubscriptionStatus = async () => {
      if (!user?.id) {
        console.log('Not checking subscription - not authenticated');
        setIsSubscribed(false);
        return;
      }
      
      try {
        const status = await checkSubscription(user.id, creatorId);
        setIsSubscribed(status);
      } catch (error) {
        console.error('Failed to check subscription status:', error);
        setError('Failed to check subscription status');
      }
    };
    
    checkSubscriptionStatus();
  }, [user, creatorId, checkSubscription, isAuthenticated]);

  const handleToggleSubscription = async () => {
    if (isLoading) return;
    
    if (!user?.id) {
      console.log('Cannot subscribe - not authenticated');
      setError('Please sign in to subscribe');
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isSubscribed) {
        await removeSubscription(user.id, creatorId);
        setIsSubscribed(false);
      } else {
        await addSubscription(user.id, creatorId);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      setError('Failed to update subscription');
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleToggleSubscription}
        className={`flex items-center justify-center p-1 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isLoading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !error && setShowTooltip(false)}
      >
        {isSubscribed ? (
          <UserCheck className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
        ) : (
          <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300" />
        )}
      </button>
      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-indigo-500 rounded transition-opacity whitespace-nowrap ${showTooltip || error ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {error || (isSubscribed ? 'Subscribed' : 'Subscribe')}
      </div>
    </div>
  );
}; 