import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash, Move, HelpCircle } from 'lucide-react';
import { useComicStore } from '../../store/useComicStore';
import { HonAssistant } from './HonAssistant';
import { HonTooltips } from './HonTooltips';
import { ThemeToggle } from '../common/ThemeToggle';
import { Panel, Comic, Template } from '../../types';
import { nanoid } from 'nanoid';
import { ExportButton } from './ExportButton';
import { CollaborationButton } from './CollaborationButton';
import { CollaborationModal } from './CollaborationModal';
import { collaboratorService } from '../../services/collaboratorService';

interface PageManagerProps {
  currentPageIndex?: number;
  totalPages?: number;
  onPageChange?: (index: number) => void;
  onAddPage?: () => void;
  onDeletePage?: (index: number) => void;
}

export const PageManager: React.FC<PageManagerProps> = ({
  currentPageIndex: propCurrentPageIndex,
  totalPages,
  onPageChange,
  onAddPage: propOnAddPage,
  onDeletePage: propOnDeletePage
}) => {
  const { 
    currentComic, 
    currentPageIndex: storeCurrentPageIndex, 
    setCurrentPageIndex, 
    addPage,
    removePage,
    updatePanel
  } = useComicStore();

  // Use props if provided, otherwise use store values
  const currentPageIndex = propCurrentPageIndex !== undefined ? propCurrentPageIndex : storeCurrentPageIndex;
  
  const comic = currentComic as (Comic | null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showManualTip, setShowManualTip] = useState(false);
  
  // State for draggable functionality
  const [position, setPosition] = useState({ x: 50, y: 90 }); // Default position percentage
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const managerRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage on component mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('pageManagerPosition');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (error) {
        console.error('Error parsing saved position:', error);
      }
    }
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('pageManagerPosition', JSON.stringify(position));
    }
  }, [position, isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    // Only start dragging if clicking the move handle or its container
    if (!(e.target as HTMLElement).closest('.drag-handle')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const rect = managerRef.current?.getBoundingClientRect();
    if (rect) {
      setStartPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleDragMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate new position in viewport percentage
      const newX = ((e.clientX - startPos.x) / viewportWidth) * 100;
      const newY = ((e.clientY - startPos.y) / viewportHeight) * 100;
      
      // Constrain to viewport boundaries
      const boundedX = Math.max(0, Math.min(newX, 90));
      const boundedY = Math.max(0, Math.min(newY, 90));
      
      setPosition({ x: boundedX, y: boundedY });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      if (onPageChange) {
        onPageChange(currentPageIndex - 1);
      } else {
        setCurrentPageIndex(currentPageIndex - 1);
      }
    }
  };

  const handleNextPage = () => {
    if (comic && currentPageIndex < comic.pages.length - 1) {
      if (onPageChange) {
        onPageChange(currentPageIndex + 1);
      } else {
        setCurrentPageIndex(currentPageIndex + 1);
      }
    }
  };

  const handleAddPage = () => {
    if (propOnAddPage) {
      propOnAddPage();
    } else {
      addPage();
    }
  };

  const handleDeletePage = () => {
    if (propOnDeletePage && currentPageIndex !== undefined) {
      propOnDeletePage(currentPageIndex);
    } else {
      removePage(currentPageIndex);
    }
  };

  const handleGenerateStory = async (prompt: string, generatedUrl: string, type: 'image' | 'video' | 'gif', panel?: Panel) => {
    if (!comic || comic.pageTemplates[currentPageIndex] === undefined) return;
    
    try {
      const template = comic.pageTemplates[currentPageIndex] as Template;
      // Initialize empty page if it doesn't exist
      if (!comic.pages[currentPageIndex]) {
        comic.pages[currentPageIndex] = [];
      }

      if (panel) {
        // If a panel object is provided, use it directly
        console.log('Updating panel with:', panel);
        updatePanel(panel, currentPageIndex);
      } else {
        // Find next available position in template
        const usedPositions = comic.pages[currentPageIndex].map((p: Panel) => `${p.position.row}-${p.position.col}`);
        let nextPosition = template?.layout.areas.find((area: any) => 
          !usedPositions.includes(`${area.position.row}-${area.position.col}`)
        )?.position;

        // If no position found, use the first position
        if (!nextPosition && template?.layout.areas.length > 0) {
          nextPosition = template.layout.areas[0].position;
        }

        // Create a new panel for subsequent generations
        if (nextPosition) {
          const newPanel: Panel = {
            id: nanoid(),
            type,
            url: generatedUrl,
            size: 'medium',
            aspectRatio: 1,
            position: nextPosition,
            caption: prompt
          };
          console.log('Creating new panel:', newPanel);
          updatePanel(newPanel, currentPageIndex);
        }
      }
    } catch (error) {
      console.error('Failed to update panel:', error);
    }
  };

  const checkIs2x2Template = () => {
    if (!comic || comic.pageTemplates[currentPageIndex] === undefined) return false;
    const template = comic.pageTemplates[currentPageIndex] as Template;
    return template?.layout.areas.length === 4;
  };

  const handleOpenCollabModal = () => {
    setShowCollabModal(true);
  };

  const handleCloseCollabModal = () => {
    setShowCollabModal(false);
  };

  const handleInviteCollaborator = async (email: string) => {
    if (!comic?.id) return;
    
    setIsInviting(true);
    
    try {
      const invite = await collaboratorService.inviteCollaborator(comic.id, email);
      console.log('Invitation sent:', invite);
      setShowCollabModal(false);
    } catch (error) {
      console.error('Failed to send invitation:', error);
    } finally {
      setIsInviting(false);
    }
  };

  if (!comic) return null;

  return (
    <>
      {/* Hon Tooltips - positioned above PageManager */}
      <HonTooltips 
        pageManagerPosition={position} 
        manualTrigger={showManualTip}
        onManualClose={() => setShowManualTip(false)}
      />
      
      <div 
        ref={managerRef}
        className="fixed flex items-center space-x-3 bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg px-5 py-2.5 border border-gray-700 z-50 select-none scale-75 origin-top-left"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          cursor: isDragging ? 'grabbing' : 'auto'
        }}
        onMouseDown={handleDragStart}
        onMouseMove={(e) => isDragging && handleDragMove(e.nativeEvent)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <div 
          className="p-1.5 rounded-full hover:bg-gray-700 transition-colors cursor-grab active:cursor-grabbing drag-handle"
        >
          <Move className="w-4 h-4 text-gray-300" />
        </div>
        
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={handlePrevPage}
            className="p-1.5 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-300" />
          </button>
          
          <span className="text-xs font-medium text-gray-300">
            Page {currentPageIndex + 1} of {comic.pages.length}
          </span>
          
          <button 
            onClick={handleNextPage}
            className="p-1.5 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>

          <button 
            onClick={handleAddPage} 
            className="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
            title="Add page"
          >
            <Plus className="w-4 h-4 text-gray-300" />
          </button>

          <div className="w-px h-4 bg-gray-700 mx-2" />

          <HonAssistant 
            onGenerateStory={handleGenerateStory}
            referenceImage={referenceImage}
            onPanelContentGenerating={() => {}}
            onCheckTemplate={checkIs2x2Template}
          />

          <div className="w-px h-4 bg-gray-700 mx-2" />
          
          <button 
            onClick={() => setShowManualTip(true)}
            className="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
            title="Show Hon communication tips"
          >
            <HelpCircle className="w-4 h-4 text-gray-300" />
          </button>
          
          <button 
            onClick={handleDeletePage}
            className="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
            title="Delete page"
          >
            <Trash className="w-4 h-4 text-gray-300" />
          </button>
          
          <CollaborationButton onClick={handleOpenCollabModal} />
          
          <ExportButton containerId="comic-page-container" />
          
          <ThemeToggle />
        </div>
      </div>

      <CollaborationModal 
        isOpen={showCollabModal}
        onClose={handleCloseCollabModal}
        onInvite={handleInviteCollaborator}
        isInviting={isInviting}
      />
    </>
  );
};