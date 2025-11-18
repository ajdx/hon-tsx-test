import React, { useState, useEffect } from 'react';
import { useComicStore } from '../../store/useComicStore';
import MediaContent from '../MediaContent';
import { Gift, Eye, TrendingUp, Clock, Filter, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SupportModal } from './SupportModal';
import { Comic } from '../../types';
import { formatViewCount } from '../../utils/formatNumber';
import { comicService } from '../../services/comicService';

export const Feed: React.FC = () => {
  const { publishedComics, setCurrentComic } = useComicStore();
  const navigate = useNavigate();
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loadedCovers, setLoadedCovers] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'popular' | 'agents'>('trending');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const loadViewCounts = async () => {
      const counts = await Promise.all(
        publishedComics.map(async (comic) => {
          const count = await comicService.getComicStats(comic.id);
          return [comic.id, count];
        })
      );
      setViewCounts(Object.fromEntries(counts));
    };
    loadViewCounts();
  }, [publishedComics]);

  // Load covers in batches to prevent too many simultaneous requests
  useEffect(() => {
    const loadCovers = async () => {
      // Prioritize images over videos to reduce network congestion
      const comics = [...publishedComics].sort((a, b) => {
        // Images first, then videos
        const aIsVideo = a.coverType === 'video' || a.coverType === 'gif';
        const bIsVideo = b.coverType === 'video' || b.coverType === 'gif';
        return aIsVideo === bIsVideo ? 0 : aIsVideo ? 1 : -1;
      });
      
      // Smaller batch size for videos
      const imageBatchSize = 4; // 4 images at a time
      const videoBatchSize = 1; // 1 video at a time
      
      // Process images first
      const images = comics.filter(c => !loadedCovers[c.id] && c.coverImage && 
        c.coverType !== 'video' && c.coverType !== 'gif');
      
      for (let i = 0; i < images.length; i += imageBatchSize) {
        const batch = images.slice(i, i + imageBatchSize);
        await Promise.all(
          batch.map(async (comic) => {
            try {
              const img = new Image();
              await new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                  img.src = '';
                  console.warn('Cover load timeout:', comic.id);
                  resolve(false);
                }, 8000);

                img.onload = () => {
                  clearTimeout(timeoutId);
                  setLoadedCovers(prev => ({ ...prev, [comic.id]: true }));
                  resolve(true);
                };

                img.onerror = () => {
                  clearTimeout(timeoutId);
                  console.warn('Cover load error:', comic.id);
                  resolve(false);
                };

                // Optimize image URL for thumbnails to reduce size
                if (comic.coverImage.includes('cloudinary.com')) {
                  const parts = comic.coverImage.split('/upload/');
                  if (parts.length === 2) {
                    img.src = `${parts[0]}/upload/c_thumb,w_600,q_auto:low/${parts[1]}`;
                  } else {
                    img.src = comic.coverImage;
                  }
                } else {
                  img.src = comic.coverImage;
                }
              });
            } catch (error) {
              console.warn('Failed to load image cover:', comic.id, error);
            }
          })
        );
        // Small delay between image batches
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Then process videos with longer delays
      const videos = comics.filter(c => !loadedCovers[c.id] && c.coverImage && 
        (c.coverType === 'video' || c.coverType === 'gif'));
      
      for (let i = 0; i < videos.length; i += videoBatchSize) {
        const batch = videos.slice(i, i + videoBatchSize);
        await Promise.all(
          batch.map(async (comic) => {
            try {
              const video = document.createElement('video');
              video.muted = true;
              video.playsInline = true;
              video.preload = 'metadata';

              await new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                  video.src = '';
                  console.warn('Video cover load timeout:', comic.id);
                  resolve(false);
                }, 10000);

                video.onloadedmetadata = () => {
                  clearTimeout(timeoutId);
                  setLoadedCovers(prev => ({ ...prev, [comic.id]: true }));
                  resolve(true);
                };

                video.onerror = () => {
                  clearTimeout(timeoutId);
                  console.warn('Video cover load error:', comic.id);
                  resolve(false);
                };

                // Optimize video URL with Cloudinary transformation parameters
                if (comic.coverImage.includes('cloudinary.com')) {
                  const parts = comic.coverImage.split('/upload/');
                  if (parts.length === 2) {
                    video.poster = `${parts[0]}/upload/f_jpg,q_auto:low,so_0/${parts[1]}`;
                    video.src = `${parts[0]}/upload/q_auto:low,f_auto,vs_25,dl_300/${parts[1]}`;
                  } else {
                    video.src = comic.coverImage;
                  }
                } else {
                  video.src = comic.coverImage;
                }
                
                video.load();
              });
            } catch (error) {
              console.warn('Failed to load video cover:', comic.id, error);
            }
          })
        );
        // Longer delay between video batches
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    };

    loadCovers();
  }, [publishedComics, loadedCovers]);

  const handleComicClick = async (comic: Comic) => {
    try {
      // Log the full comic object
      console.log('Full comic object:', comic);
      
      // Don't increment views for draft comics
      if (!comic.id.startsWith('draft')) {
        console.log('Incrementing views for published comic:', comic.id);
        await comicService.incrementComicViews(comic.id);
        
        // Log the view counts before and after update
        console.log('Previous view counts:', viewCounts);
        setViewCounts(prev => {
          const newCount = (prev[comic.id] || 0) + 1;
          console.log('Setting new view count for', comic.id, 'to', newCount);
          return {
            ...prev,
            [comic.id]: newCount
          };
        });
      } else {
        console.log('Skipping view increment for draft comic:', comic.id);
      }
      
      setCurrentComic(comic);
      navigate('/reader');
    } catch (error) {
      console.error('Failed to increment view count:', error);
      console.error('Error details:', error);
      setCurrentComic(comic);
      navigate('/reader');
    }
  };

  const handleSupportClick = (comic: Comic, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedComic(comic);
  };

  const sortedComics = [...publishedComics].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'popular') {
      return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
    } else if (sortBy === 'agents') {
      // Sort by AI-generated content first
      const aIsAI = a.isAIGenerated || false;
      const bIsAI = b.isAIGenerated || false;
      if (aIsAI && !bIsAI) return -1;
      if (!aIsAI && bIsAI) return 1;
      // If both are AI or both are not AI, sort by recency
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // Trending - combination of recency and popularity
      const aScore = (viewCounts[a.id] || 0) * (1 + 1 / (new Date().getTime() - new Date(a.createdAt).getTime()));
      const bScore = (viewCounts[b.id] || 0) * (1 + 1 / (new Date().getTime() - new Date(b.createdAt).getTime()));
      return bScore - aScore;
    }
  });

  return (
    <div className="min-h-screen bg-indigo-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">Discover Stories</h1>
          
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Filter className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="text-gray-700 dark:text-gray-300">Sort by: {sortBy}</span>
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 overflow-hidden">
                <button 
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'trending' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => {
                    setSortBy('trending');
                    setIsFilterOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Trending</span>
                  </div>
                </button>
                <button 
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'newest' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => {
                    setSortBy('newest');
                    setIsFilterOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Newest</span>
                  </div>
                </button>
                <button 
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'popular' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => {
                    setSortBy('popular');
                    setIsFilterOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Most Popular</span>
                  </div>
                </button>
                <button 
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${sortBy === 'agents' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => {
                    setSortBy('agents');
                    setIsFilterOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4" />
                    <span>Agents</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedComics.map((comic) => (
            <div 
              key={comic.id} 
              className="group relative h-80 bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              onClick={() => handleComicClick(comic)}
            >
              <div className="absolute inset-0">
                {comic.coverImage ? (
                  loadedCovers[comic.id] ? (
                    <MediaContent
                      url={comic.coverImage}
                      type={comic.coverType || 'image'}
                      className="w-full h-full object-cover"
                      style={comic.coverPosition ? {
                        objectPosition: `${comic.coverPosition.x}% ${comic.coverPosition.y}%`,
                        transform: `scale(${comic.coverPosition.scale || 1})`,
                      } : undefined}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading cover...</div>
                    </div>
                  )
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <p className="text-gray-400">No cover image</p>
                  </div>
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-xl font-bold text-white mb-1">{comic.title}</h2>
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>{comic.creator}</span>
                    <span>{comic.pages?.length || 0} pages</span>
                  </div>
                  {comic.lastModified && (
                    <div className="text-xs text-gray-400 mt-1">
                      Updated: {new Date(comic.lastModified).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Top bar with view count and support button */}
              <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center space-x-1 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white/90">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {formatViewCount(viewCounts[comic.id] || 0)}
                  </span>
                </div>

                <button
                  onClick={(e) => handleSupportClick(comic, e)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition-colors"
                >
                  <Gift className="w-4 h-4" />
                  <span className="text-sm">Support</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedComic && (
          <SupportModal
            isOpen={!!selectedComic}
            onClose={() => setSelectedComic(null)}
            comic={selectedComic}
            onSuccess={() => {
              // Handle success action
              setSelectedComic(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
