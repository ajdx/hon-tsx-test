import React, { useState, useEffect } from 'react';
import { useComicStore } from '../../store/useComicStore';
import { Edit2, Home, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import MediaContent from './MediaContent';
import type { Template, Panel } from '../../types';
import { NarrationBubble } from '../reader/NarrationBubble';
import { LikeButton } from '../reader/LikeButton';
import { CommentWidget } from '../reader/CommentWidget';
import { BookmarkButton } from '../reader/BookmarkButton';
import { SubscribeButton } from '../reader/SubscribeButton';
import { useTheme } from '../../contexts/ThemeContext';

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

  if (!currentComic) {
    return (
      <div className="min-h-screen bg-indigo-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white font-medium">No comic selected</div>
      </div>
    );
  }

  const currentPage = currentComic.pages[currentPageIndex] || [];
  const currentTemplate = currentComic.pageTemplates?.[currentPageIndex] || defaultTemplate;
  
  // Get narration for the current page
  const pageNarration = currentComic.narrations?.[currentPageIndex];
  const narrationText = pageNarration?.text || '';
  const narrationVoiceId = pageNarration?.voiceId || 'fCxG8OHm4STbIsWe4aT9'; // Default to Harrison Gale

  console.log('Media Reader - Current page index:', currentPageIndex);
  console.log('Media Reader - Page narration:', pageNarration);
  console.log('Media Reader - Narration text:', narrationText);
  console.log('Media Reader - Narration voice ID:', narrationVoiceId);

  return (
    <div className="min-h-screen bg-indigo-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentComic(null)}
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
                      className="absolute p-2 rounded shadow-lg"
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
                    >
                      {panel.caption}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600" />
            )}
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