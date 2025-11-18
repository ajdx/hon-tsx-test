import React, { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { useComicStore } from '../store/useComicStore';
import { Comic } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { ComicGrid } from './ComicGrid';

export const Feed: React.FC = () => {
  const { publishedComics, setCurrentComic, fetchPublishedComics } = useComicStore();
  const navigate = useNavigate();
  const [supportedComics, setSupportedComics] = useState<Set<string>>(new Set());
  const [loadedCovers, setLoadedCovers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPublishedComics();
  }, [fetchPublishedComics]);

  // Load covers in batches to prevent too many simultaneous requests
  useEffect(() => {
    const loadCovers = async () => {
      const batchSize = 3; // Load 3 covers at a time
      const comics = [...publishedComics];
      
      while (comics.length > 0) {
        const batch = comics.splice(0, batchSize);
        await Promise.all(
          batch.map(async (comic) => {
            if (!comic.coverImage || loadedCovers[comic.id]) return;

            try {
              const element = comic.coverType === 'video' || comic.coverType === 'gif'
                ? document.createElement('video')
                : new Image();

              await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                  element.src = '';
                  console.warn('Cover load timeout:', comic.id);
                  resolve(false);
                }, 10000);

                const handleLoad = () => {
                  clearTimeout(timeoutId);
                  setLoadedCovers(prev => ({ ...prev, [comic.id]: true }));
                  resolve(true);
                };

                const handleError = () => {
                  clearTimeout(timeoutId);
                  console.warn('Cover load error:', comic.id);
                  resolve(false);
                };

                if (element instanceof HTMLVideoElement) {
                  element.onloadeddata = handleLoad;
                  element.onerror = handleError;
                } else {
                  element.onload = handleLoad;
                  element.onerror = handleError;
                }

                element.src = comic.coverImage;
                if (element instanceof HTMLVideoElement) {
                  element.load();
                }
              });
            } catch (error) {
              console.warn('Failed to load cover:', comic.id, error);
            }
          })
        );
        // Add a small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    loadCovers();
  }, [publishedComics]);

  const handleComicClick = (comic: Comic) => {
    setCurrentComic(comic);
    navigate(`/reader/${comic.id}`);
  };

  const handleSupportClick = (e: React.MouseEvent, comic: Comic) => {
    e.stopPropagation();
    setSupportedComics(prev => {
      const newSet = new Set(prev);
      newSet.has(comic.id) ? newSet.delete(comic.id) : newSet.add(comic.id);
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Discover Stories</h1>
        <div className="mb-6">
          <Link 
            to="/cloudinary-tester"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Cloudinary Tester
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {publishedComics.map((comic) => (
            <div
              key={comic.id}
              className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform transition hover:scale-105 relative aspect-[3/4]"
              onClick={() => handleComicClick(comic)}
            >
              <div className="absolute inset-0">
                {comic.coverImage ? (
                  loadedCovers[comic.id] ? (
                    comic.coverType === 'video' || comic.coverType === 'gif' ? (
                      <video
                        src={comic.coverImage}
                        className="w-full h-full object-cover"
                        style={comic.coverPosition ? {
                          objectPosition: `${comic.coverPosition.x}% ${comic.coverPosition.y}%`,
                          transform: `scale(${comic.coverPosition.scale})`,
                        } : undefined}
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={comic.coverImage}
                        alt={comic.title}
                        className="w-full h-full object-cover"
                        style={comic.coverPosition ? {
                          objectPosition: `${comic.coverPosition.x}% ${comic.coverPosition.y}%`,
                          transform: `scale(${comic.coverPosition.scale})`,
                        } : undefined}
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading cover...</div>
                    </div>
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <div className="text-gray-400">No cover image</div>
                  </div>
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-xl font-bold text-white">{comic.title}</h2>
                      <p className="text-sm text-gray-300">by {comic.creator}</p>
                    </div>
                    <button
                      onClick={(e) => handleSupportClick(e, comic)}
                      className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                        supportedComics.has(comic.id)
                          ? 'bg-green-500 text-white'
                          : 'bg-white/90 text-gray-700 hover:bg-green-500 hover:text-white'
                      }`}
                      title="Support Creator"
                    >
                      <Gift className={`w-5 h-5 ${supportedComics.has(comic.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ComicGrid comics={publishedComics} onComicClick={handleComicClick} />
    </div>
  );
};
