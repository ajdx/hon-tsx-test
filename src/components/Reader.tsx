import React, { useState, useEffect } from 'react';
import { useComicStore } from '../store/useComicStore';
import { Edit2, Home, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import MediaContent from './MediaContent';
import type { Template, Panel } from '../types';
import { NarrationBubble } from './reader/NarrationBubble';
import { BookmarkButton } from './reader/BookmarkButton';
import { SubscribeButton } from './reader/SubscribeButton';
import { CommentWidget } from './reader/CommentWidget';
import { LikeButton } from './reader/LikeButton';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

// Fallback template in case a page doesn't have one
const defaultTemplate: Template = {
  id: 'classic',
  name: 'Classic Strip',
  description: '3x1 grid, perfect for traditional comic strips',
  icon: 'Columns',
  layout: {
    rows: 1,
    cols: 3,
    areas: [
      { size: 'medium', position: { row: 0, col: 0 } },
      { size: 'medium', position: { row: 0, col: 1 } },
      { size: 'medium', position: { row: 0, col: 2 } },
    ],
  },
};

export const Reader: React.FC = () => {
  const { currentComic, editComic, setCurrentComic } = useComicStore();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handlePrevPage = () => {
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if (!currentComic) return;
    setCurrentPageIndex(prev => Math.min(currentComic.pages.length - 1, prev + 1));
  };

  useEffect(() => {
    if (currentComic?.pages[currentPageIndex]?.length > 0) {
      setActivePanelId(currentComic.pages[currentPageIndex][0].id);
    } else {
      setActivePanelId(null);
    }
  }, [currentPageIndex, currentComic]);

  // Handle home button click
  const handleHomeClick = () => {
    setCurrentComic(null); // Clear the current comic
    navigate('/feed'); // Navigate to feed
  };

  if (!currentComic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Comic Selected</h1>
          <button
            onClick={() => navigate('/feed')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const currentPage = currentComic.pages[currentPageIndex] || [];
  const currentTemplate = currentComic.pageTemplates?.[currentPageIndex] || defaultTemplate;
  
  // Check if this is a custom canvas template (has empty areas)
  const isCustomCanvas = currentTemplate.id === 'custom' || !currentTemplate.layout.areas.length;
  
  // Get narration for the current page
  const pageNarration = currentComic.narrations?.[currentPageIndex];
  const narrationText = pageNarration?.text || '';
  const narrationVoiceId = pageNarration?.voiceId || 'fCxG8OHm4STbIsWe4aT9'; // Default to Harrison Gale

  console.log('Main Reader - Current page index:', currentPageIndex);
  console.log('Main Reader - Page narration:', pageNarration);
  console.log('Main Reader - Narration text:', narrationText);
  console.log('Main Reader - Narration voice ID:', narrationVoiceId);

  return (
    <div className="min-h-screen bg-indigo-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleHomeClick}
              className="p-2 bg-white/80 dark:bg-white/10 rounded-full hover:bg-indigo-100 dark:hover:bg-white/20 transition-colors shadow-sm"
            >
              <Home className="w-5 h-5 text-indigo-600 dark:text-white" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{currentComic.title}</h1>
          </div>
          <button
            onClick={() => editComic(currentComic)}
            className="p-2 bg-white/80 dark:bg-white/10 rounded-full hover:bg-indigo-100 dark:hover:bg-white/20 transition-colors shadow-sm"
          >
            <Edit2 className="w-5 h-5 text-indigo-600 dark:text-white" />
          </button>
        </header>

        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-4 mb-8 shadow-lg">
          {isCustomCanvas ? (
            // Custom Canvas: Use panel positions directly
            <div 
              className="relative"
              style={{
                minHeight: '70vh',
                height: 'calc(100vh - 300px)',
                display: 'grid',
                gap: '1rem',
                // Calculate grid size based on panel positions
                gridTemplateRows: currentPage.length > 0 
                  ? `repeat(${Math.max(...currentPage.map(p => (p.position.row || 0) + (p.position.rowSpan || 1)))}, minmax(0, 1fr))`
                  : 'repeat(2, minmax(0, 1fr))',
                gridTemplateColumns: currentPage.length > 0
                  ? `repeat(${Math.max(...currentPage.map(p => (p.position.col || 0) + (p.position.colSpan || 1)))}, minmax(0, 1fr))`
                  : 'repeat(2, minmax(0, 1fr))'
              }}
            >
              {currentPage.map((panel: Panel) => (
                <div
                  key={panel.id}
                  className="relative w-full h-full"
                  style={{
                    gridRow: `${(panel.position.row || 0) + 1} / span ${panel.position.rowSpan || 1}`,
                    gridColumn: `${(panel.position.col || 0) + 1} / span ${panel.position.colSpan || 1}`,
                  }}
                >
                  <MediaContent
                    url={panel.url}
                    type={panel.type}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Caption support for CustomCanvas */}
                  {panel.caption && (
                    <div
                      className={`absolute p-2 rounded shadow-lg ${panel.captionLink ? 'cursor-pointer hover:brightness-110' : ''}`}
                      style={{
                        left: `${panel.captionPosition?.x ?? 50}%`,
                        top: `${panel.captionPosition?.y ?? 90}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: panel.captionStyle?.backgroundColor === 'white' 
                          ? `rgba(255,255,255,${panel.captionStyle?.opacity ?? 0.8})`
                          : `rgba(0,0,0,${panel.captionStyle?.opacity ?? 0.8})`,
                        color: panel.captionStyle?.backgroundColor === 'white' ? 'black' : 'white',
                        fontFamily: panel.captionStyle?.fontFamily || 'system-ui',
                        fontSize: panel.captionStyle?.fontSize || '1rem',
                        textAlign: panel.captionPosition?.align || 'center',
                        maxWidth: '90%',
                        wordBreak: 'break-word'
                      }}
                      onClick={() => panel.captionLink && window.open(panel.captionLink, '_blank', 'noopener,noreferrer')}
                    >
                      <div>
                        {panel.caption}
                        {panel.captionLink && (
                          <div className="mt-1 flex items-center text-xs" style={{ 
                            color: panel.captionStyle?.backgroundColor === 'white' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            <span className="truncate" style={{ maxWidth: '150px' }}>View product</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Regular Templates: Use template areas
          <div 
            className="grid gap-4"
            style={{
              gridTemplateRows: `repeat(${currentTemplate.layout.rows}, minmax(0, 1fr))`,
              gridTemplateColumns: `repeat(${currentTemplate.layout.cols}, minmax(0, 1fr))`,
              minHeight: '70vh',
              height: 'calc(100vh - 300px)'
            }}
          >
            {currentPage.map((panel: Panel, index: number) => {
              const area = currentTemplate.layout.areas[index];
              if (!area) return null;

              return (
                <div
                  key={panel.id}
                  className="relative w-full h-full"
                  style={{
                    gridRow: `${area.position.row + 1} / span ${area.position.rowSpan || 1}`,
                    gridColumn: `${area.position.col + 1} / span ${area.position.colSpan || 1}`,
                    height: '100%',
                    width: '100%'
                  }}
                >
                  <MediaContent
                    url={panel.url}
                    type={panel.type}
                    className="w-full h-full"
                  />
                  {panel.caption && (
                    <div
                      className={`absolute p-2 rounded shadow-lg ${panel.captionLink ? 'cursor-pointer hover:brightness-110' : ''}`}
                      style={{
                        left: `${panel.captionPosition?.x ?? 50}%`,
                        top: `${panel.captionPosition?.y ?? 90}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: panel.captionStyle?.backgroundColor === 'white' 
                          ? `rgba(255,255,255,${panel.captionStyle?.opacity ?? 0.8})`
                          : `rgba(0,0,0,${panel.captionStyle?.opacity ?? 0.8})`,
                        color: panel.captionStyle?.backgroundColor === 'white' ? 'black' : 'white',
                        fontFamily: panel.captionStyle?.fontFamily || 'system-ui',
                        fontSize: panel.captionStyle?.fontSize || '1rem',
                        textAlign: panel.captionPosition?.align || 'center',
                        maxWidth: '90%',
                        wordBreak: 'break-word'
                      }}
                      onClick={() => panel.captionLink && window.open(panel.captionLink, '_blank', 'noopener,noreferrer')}
                    >
                      <div>
                        {panel.caption}
                        {panel.captionLink && (
                          <div className="mt-1 flex items-center text-xs" style={{ 
                            color: panel.captionStyle?.backgroundColor === 'white' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            <span className="truncate" style={{ maxWidth: '150px' }}>View product</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-white dark:bg-gray-800 backdrop-blur-sm rounded-full shadow-lg px-6 py-3 border border-gray-200 dark:border-gray-700 z-50">
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex === 0}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {currentPageIndex + 1} of {currentComic.pages.length}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPageIndex === currentComic.pages.length - 1}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          {currentComic?.id && (
            <>
              <BookmarkButton comicId={currentComic.id} />
              <LikeButton comicId={currentComic.id} />
            </>
          )}
          {currentComic?.creatorWallet && (
            <SubscribeButton creatorId={currentComic.creatorWallet} />
          )}
          
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors overflow-hidden"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <div className="transition-transform duration-500 transform rotate-0 dark:rotate-180">
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </div>
          </button>
        </div>
      </div>
      
      {/* Only show narration bubble if there's narration text */}
      {narrationText && (
        <NarrationBubble
          text={narrationText}
          voiceId={narrationVoiceId}
          pageIndex={currentPageIndex}
          isActive={true}
        />
      )}
      
      <CommentWidget comicId={currentComic.id} />
    </div>
  );
};