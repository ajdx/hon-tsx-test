import { useEffect, useState } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useAuth } from '../../contexts/AuthContext';
import MediaContent from '../MediaContent';
import { BookOpen, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useComicStore } from '../../store/useComicStore';
import type { Comic } from '../../types';
import { BookmarkService } from '../../services/bookmarkService';

interface BookmarkWithComic {
  id: string;
  comics: Comic;
}

interface Subscription {
  id: string;
  creator: {
    id: string;
    username: string;
    avatar_url: string;
    social_links?: {
      twitter?: string;
      instagram?: string;
      website?: string;
    };
    latest_comic?: Comic;
  };
}

// Sample data for demonstration
const sampleBookmark: BookmarkWithComic = {
  id: 'bookmark-1',
  comics: {
    id: 'comic-1',
    title: 'The Sommelier',
    creator: 'Anonymous',
    creatorWallet: 'wallet-123',
    coverImage: 'https://images.unsplash.com/photo-1567590997610-1edc1a497794?q=80&w=1974&auto=format&fit=crop',
    coverType: 'image',
    pages: [[], [], [], [], [], [], []],  // 7 pages
    pageTemplates: [],
    narrations: {},
    createdAt: new Date(),
    lastModified: new Date()
  }
};

const sampleSubscription: Subscription = {
  id: 'subscription-1',
  creator: {
    id: 'creator-1',
    username: 'Anonymous',
    avatar_url: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=1931&auto=format&fit=crop',
    social_links: {
      twitter: 'https://twitter.com/anonymous',
      instagram: 'https://instagram.com/anonymous',
      website: 'https://anonymous.art'
    },
    latest_comic: {
      id: 'comic-2',
      title: 'The Sommelier',
      creator: 'Anonymous',
      creatorWallet: 'wallet-456',
      coverImage: 'https://images.unsplash.com/photo-1567590997610-1edc1a497794?q=80&w=1974&auto=format&fit=crop',
      coverType: 'image',
      pages: [[], [], [], [], [], [], []],  // 7 pages
      pageTemplates: [],
      narrations: {},
      createdAt: new Date(),
      lastModified: new Date()
    }
  }
};

export const CollectionsSection: React.FC = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkWithComic[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { setCurrentComic } = useComicStore();
  const { getUserSubscriptions } = useSubscriptionStore();
  const bookmarkService = new BookmarkService();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (user) {
        try {
          // Load data in parallel
          const userSubscriptions = await getUserSubscriptions(user.id);
          
          // For bookmarks, use the service directly since there's an issue with the store
          let userBookmarks;
          try {
            userBookmarks = await bookmarkService.getBookmarkedComics();
          } catch (error) {
            console.error('Error fetching bookmarks:', error);
            userBookmarks = [sampleBookmark];
          }
          
          // If no bookmarks are returned, use the sample data
          if (!userBookmarks || userBookmarks.length === 0) {
            userBookmarks = [sampleBookmark];
          }
          
          setBookmarks(userBookmarks);
          
          // If no subscriptions are returned, use the sample data
          if (!userSubscriptions || userSubscriptions.length === 0) {
            setSubscriptions([sampleSubscription]);
          } else {
            // Process subscriptions to ensure they have latest_comic
            const enhancedSubscriptions = userSubscriptions.map(sub => ({
              ...sub,
              creator: {
                ...sub.creator,
                latest_comic: sub.creator.latest_comic || {
                  id: `latest-${sub.creator.id}`,
                  title: `${sub.creator.username}'s Latest Story`,
                  creator: sub.creator.username,
                  creatorWallet: sub.creator.id,
                  coverImage: sub.creator.avatar_url || 'https://via.placeholder.com/300x400?text=Latest+Story',
                  coverType: 'image',
                  pages: [[]],
                  pageTemplates: [],
                  narrations: {},
                  createdAt: new Date(),
                  lastModified: new Date()
                }
              }
            }));
            
            setSubscriptions(enhancedSubscriptions);
          }
        } catch (error) {
          console.error('Error loading collections data:', error);
          // Use sample data as fallback in case of error
          setBookmarks([sampleBookmark]);
          setSubscriptions([sampleSubscription]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Use sample data for demonstration even when not logged in
        setBookmarks([sampleBookmark]);
        setSubscriptions([sampleSubscription]);
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, getUserSubscriptions]);

  const handleComicClick = (comic: Comic) => {
    setCurrentComic(comic);
    navigate('/reader');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loading skeleton for Collections */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">My Collection</h3>
          <div className="animate-pulse h-80 bg-gray-700 rounded-lg"></div>
        </div>
        
        {/* Loading skeleton for Subscriptions */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Creator Subscriptions</h3>
          <div className="animate-pulse h-80 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Collections Section */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">My Collection</h3>
        
        {bookmarks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {bookmarks.slice(0, 4).map((bookmark) => (
              <div 
                key={bookmark.id} 
                className="relative h-80 bg-gray-800 rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => handleComicClick(bookmark.comics)}
              >
                <MediaContent
                  url={bookmark.comics.coverImage}
                  type={bookmark.comics.coverType}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="text-xl font-bold text-white mb-1">{bookmark.comics.title}</h2>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>{bookmark.comics.creator}</span>
                      <span>{bookmark.comics.pages?.length || 0} pages</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-800 rounded-lg h-80">
            <div className="bg-gray-700/50 p-3 rounded-full mb-3">
              <BookOpen className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm mb-2">No stories in your collection yet.</p>
            <button 
              onClick={() => navigate('/feed')}
              className="mt-1 px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
            >
              Explore Stories
            </button>
          </div>
        )}
      </div>

      {/* Subscriptions Section */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Creator Subscriptions</h3>
        
        {subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {subscriptions.slice(0, 4).map((subscription) => (
              <div 
                key={subscription.id} 
                className="relative h-80 bg-gray-800 rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => subscription.creator.latest_comic && handleComicClick(subscription.creator.latest_comic)}
              >
                <MediaContent
                  url={subscription.creator.latest_comic?.coverImage || subscription.creator.avatar_url || 'https://via.placeholder.com/300x400?text=No+Stories+Yet'}
                  type="image"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="text-xl font-bold text-white mb-1">
                      {subscription.creator.latest_comic?.title || 'No Stories Yet'}
                    </h2>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>{subscription.creator.username}</span>
                      <span>{subscription.creator.latest_comic?.pages?.length || 0} pages</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-800 rounded-lg h-80">
            <div className="bg-gray-700/50 p-3 rounded-full mb-3">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm mb-2">You haven't subscribed to any creators yet.</p>
            <button 
              onClick={() => navigate('/feed')}
              className="mt-1 px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
            >
              Explore Creators
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 