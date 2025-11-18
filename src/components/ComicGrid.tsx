import React, { useState } from 'react';
import { useComicStore } from '../store/useComicStore';
import { Book, Edit2, Trash2, Save, Send } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Comic } from '../types';
import MediaContent from './MediaContent';
import { useNavigate } from 'react-router-dom';

interface ComicGridProps {
  onCreateNew: () => void;
  setShowMyComics: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ComicGrid: React.FC<ComicGridProps> = ({ onCreateNew, setShowMyComics }) => {
  const { 
    publishedComics, 
    draftComics,
    setCurrentComic, 
    toggleCreatorMode,
    isCreatorMode,
    unpublishComic,
    deleteDraft
  } = useComicStore();
  const [activeTab, setActiveTab] = useState<'published' | 'drafts'>('published');
  const navigate = useNavigate();

  const comics = activeTab === 'published' ? publishedComics : draftComics;

  const handleCreateNew = () => {
    const newComic: Comic = {
      id: `draft-${nanoid()}`,
      title: 'Untitled Comic',
      creator: 'Anonymous',
      creatorWallet: '',
      coverImage: '',
      coverType: 'image',
      pages: [[]],
      pageTemplates: [],
      narrations: {},
      createdAt: new Date(),
      lastModified: new Date()
    };
    
    setCurrentComic(newComic);
    toggleCreatorMode();
  };

  const handleComicClick = (comic: Comic) => {
    if (!comic.id.startsWith('draft')) {
      setCurrentComic(comic);
      navigate('/reader');
    }
  };

  const handleDelete = async (e: React.MouseEvent, comic: Comic) => {
    e.preventDefault();
    e.stopPropagation();
    
    const message = activeTab === 'published' 
      ? `Are you sure you want to unpublish "${comic.title}"?`
      : `Are you sure you want to delete "${comic.title}"?`;
    
    if (window.confirm(message)) {
      try {
        if (activeTab === 'published') {
          await unpublishComic(comic.id);
        } else {
          await deleteDraft(comic.id);
        }
      } catch (error) {
        console.error('Failed to delete comic:', error);
        alert('Failed to delete comic. Please try again.');
      }
    }
  };

  const handleEdit = (e: React.MouseEvent, comic: Comic) => {
    e.preventDefault();
    e.stopPropagation();
    
    setCurrentComic({
      ...comic,
      pages: comic.pages || [[]],
      pageTemplates: comic.pageTemplates || [],
    });

    setShowMyComics(false);

    if (!isCreatorMode) {
      toggleCreatorMode();
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">My Stories</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('published')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'published'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <Send className="w-4 h-4 inline-block mr-2" />
              Published
            </button>
            <button
              onClick={() => setActiveTab('drafts')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'drafts'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <Save className="w-4 h-4 inline-block mr-2" />
              Drafts
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Comic Card */}
          <div
            onClick={onCreateNew}
            className="relative h-80 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors group cursor-pointer shadow-sm hover:shadow-md"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCreateNew();
              }
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-indigo-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <Book className="w-8 h-8 text-indigo-500 dark:text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors">
                Create New Story
              </p>
            </div>
          </div>

          {/* Comics Grid */}
          {comics.map((comic) => (
            <div
              key={comic.id}
              className="relative h-80 bg-gray-800 rounded-lg overflow-hidden group cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              onClick={() => handleComicClick(comic)}
            >
              {/* Comic Cover */}
              <div className="absolute inset-0">
                {comic.coverImage && (
                  <MediaContent
                    url={comic.coverImage}
                    type={comic.coverType}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Comic Info Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-xl font-bold text-white mb-1">{comic.title}</h2>
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>{comic.creator}</span>
                    <span>{comic.pages.length} pages</span>
                  </div>
                  {comic.lastModified && (
                    <div className="text-xs text-gray-400 mt-1">
                      Last modified: {new Date(comic.lastModified).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleEdit(e, comic)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="Edit Comic"
                >
                  <Edit2 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, comic)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white hover:text-red-500 transition-colors"
                  title={activeTab === 'published' ? 'Unpublish Comic' : 'Delete Draft'}
                >
                  <Trash2 className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};