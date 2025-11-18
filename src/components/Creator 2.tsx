import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Send, BookOpen, PenLine, Users } from 'lucide-react';
import { useComicStore } from '../store/useComicStore';
import { CreatorSideMenu } from './creator/CreatorSideMenu';
import { PanelGrid } from './creator/PanelGrid';
import { PageManager } from './creator/PageManager';
import { ConversationalAIWidget } from './common/ConversationalAIWidget';
import type { Template, Panel, Comic, Collaborator as ComicCollaborator } from '../types';
import { nanoid } from 'nanoid';
import { fluxService } from '../services/fluxService';
import { ideogramService } from '../services/ideogramService';
import { CollaboratorAvatars } from './creator/CollaboratorAvatars';
import { collaboratorService, Collaborator } from '../services/collaboratorService';
import { lumaService } from '../services/lumaService';
import { CollaborationActivity } from './creator/CollaborationActivity';

// Define the ImageGeneration type
interface ImageGeneration {
  url: string;
  prompt: string;
  timestamp: Date;
}

export const Creator: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [selectedPanelForEdit, setSelectedPanelForEdit] = useState<Panel | null>(null);
  const [collaborators, setCollaborators] = useState<ComicCollaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<ImageGeneration[]>([]);
  
  // Infinite canvas state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  
  const { 
    currentComic: storeComic,
    currentPageIndex,
    setCurrentPageIndex,
    updatePanel, 
    removePanel, 
    reorderPanels,
    setCurrentComic,
    toggleCreatorMode,
    setShowMyComics,
    setPageTemplate,
    savePage,
    saveDraft,
    publishComic,
    addPage,
    removePage
  } = useComicStore();
  
  const currentComic = storeComic as Comic | null;

  // Critical fix: Initialize local comic state from currentComic
  useEffect(() => {
    if (currentComic) {
      setCurrentComic(currentComic);
    }
  }, [currentComic]);

  // Load collaborators when the comic changes
  useEffect(() => {
    if (currentComic?.id) {
      setIsLoadingCollaborators(true);

      // Load collaborators
      collaboratorService.getCollaborators(currentComic.id)
        .then(data => {
          // Map service collaborators to ComicCollaborator type
          const mappedCollaborators: ComicCollaborator[] = data.map(collab => ({
            id: collab.id,
            username: collab.username,
            avatar_url: collab.avatar_url || collab.avatarUrl || '',
            status: collab.status || 'online'
          }));
          setCollaborators(mappedCollaborators);
        })
        .catch(error => {
          console.error('Failed to load collaborators:', error);
        })
        .finally(() => {
          setIsLoadingCollaborators(false);
        });
    } else {
      setCollaborators([]);
    }
  }, [currentComic?.id]);

  // Initialize canvas zoom and pan functionality
  useEffect(() => {
    if (!canvasRef.current || !zoomContainerRef.current) return;
    
    const canvas = canvasRef.current;
    const zoomContainer = zoomContainerRef.current;
    
    // Zoom with mouse wheel
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Calculate new scale - zoom in/out based on wheel direction
      const delta = -Math.sign(e.deltaY) * 0.1;
      const newScale = Math.max(0.5, Math.min(3, scale + delta));
      
      setScale(newScale);
      
      // Update zoom container transform
      zoomContainer.style.transform = `scale(${newScale}) translate(${position.x}px, ${position.y}px)`;
    };
    
    // Handle mouse down for panning
    const handleMouseDown = (e: MouseEvent) => {
      // Only start dragging on middle mouse button or when holding space
      if (e.button === 1 || (e.button === 0 && e.getModifierState('Space'))) {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };
    
    // Handle mouse move for panning
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      
      const newPosition = {
        x: position.x + dx,
        y: position.y + dy
      };
      
      setPosition(newPosition);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // Update zoom container transform
      zoomContainer.style.transform = `scale(${scale}) translate(${newPosition.x}px, ${newPosition.y}px)`;
    };
    
    // Handle mouse up to stop panning
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    // Listen for custom events for zoom controls
    const handleZoomIn = () => {
      const newScale = Math.min(3, scale + 0.2);
      setScale(newScale);
      zoomContainer.style.transform = `scale(${newScale}) translate(${position.x}px, ${position.y}px)`;
    };
    
    const handleZoomOut = () => {
      const newScale = Math.max(0.5, scale - 0.2);
      setScale(newScale);
      zoomContainer.style.transform = `scale(${newScale}) translate(${position.x}px, ${position.y}px)`;
    };
    
    const handleReset = () => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      zoomContainer.style.transform = `scale(1) translate(0px, 0px)`;
    };
    
    // Prevent context menu on canvas to allow for better right-click handling
    const preventContextMenu = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    
    // Event listeners
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', preventContextMenu);
    
    // Custom events for zoom controls
    document.addEventListener('canvas-zoom-in', handleZoomIn as EventListener);
    document.addEventListener('canvas-zoom-out', handleZoomOut as EventListener);
    document.addEventListener('canvas-reset', handleReset as EventListener);
    
    // Clean up event listeners
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', preventContextMenu);
      
      document.removeEventListener('canvas-zoom-in', handleZoomIn as EventListener);
      document.removeEventListener('canvas-zoom-out', handleZoomOut as EventListener);
      document.removeEventListener('canvas-reset', handleReset as EventListener);
    };
  }, [scale, position, isDragging, dragStart]);

  // Add useEffect to log recentGenerations state when component mounts
  useEffect(() => {
    console.log('Creator component mounted, recentGenerations:', recentGenerations);
  }, []);
  
  // Add useEffect to log when recentGenerations changes
  useEffect(() => {
    console.log('Creator: recentGenerations changed:', recentGenerations);
  }, [recentGenerations]);

  // Add useEffect to check for duplicates when recentGenerations changes
  useEffect(() => {
    // Look for any duplicates in recentGenerations
    if (recentGenerations.length > 0) {
      const urls = recentGenerations.map(gen => gen.url);
      const uniqueUrls = new Set(urls);
      
      if (uniqueUrls.size < urls.length) {
        console.log('Creator: Detected duplicate URLs in recentGenerations, cleaning up...');
        // Remove duplicates, keeping the first occurrence
        const uniqueGenerations = recentGenerations.filter(
          (gen, index, self) => index === self.findIndex(g => g.url === gen.url)
        );
        
        if (uniqueGenerations.length !== recentGenerations.length) {
          console.log('Creator: Removed duplicates, new count:', uniqueGenerations.length);
          setRecentGenerations(uniqueGenerations);
        }
      }
    }
  }, [recentGenerations]);

  // Add state for collaboration activity panel
  const [showCollaborationActivity, setShowCollaborationActivity] = useState(false);

  const handleViewComics = () => {
    toggleCreatorMode();
    setCurrentComic(null);
    navigate('/feed');
  };

  const handlePublish = async () => {
    if (!currentComic) return;
    setIsPublishing(true);
    try {
      console.log('🔄 Publishing comic...');
      await publishComic(currentComic);
      console.log('✅ Comic published successfully');
      navigate('/feed');
    } catch (error) {
      console.error('❌ Failed to publish comic:', error);
      alert('Failed to publish comic. Please try again.');
    } finally {
      setTimeout(() => setIsPublishing(false), 500);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setPageTemplate(template, currentPageIndex);
  };

  const handleSavePage = async () => {
    if (!currentComic || !currentComic.pageTemplates[currentPageIndex]) return;
    setIsSavingPage(true);
    try {
      console.log('🔄 Saving page...');
      const currentPanels = currentComic.pages[currentPageIndex] || [];
      await savePage(currentPageIndex, currentPanels, currentComic.pageTemplates[currentPageIndex]);
      console.log('✅ Page saved successfully');
    } catch (error) {
      console.error('❌ Failed to save page:', error);
    } finally {
      setTimeout(() => setIsSavingPage(false), 500);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentComic) return;
    setIsSaving(true);
    try {
      console.log('🔄 Saving draft...');
      await saveDraft(currentComic);
      console.log('✅ Draft saved successfully');
    } catch (error) {
      console.error('❌ Failed to save draft:', error);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleGenerateImage = async (prompt: string, model: 'flux' | 'ideogram'): Promise<string> => {
    try {
      // Use the appropriate service based on the model parameter
      let generatedUrl: string;
      
      if (model === 'flux') {
        // Use Flux API
        generatedUrl = await fluxService.generateImage(prompt);
      } else if (model === 'ideogram') {
        // Use Ideogram API
        generatedUrl = await ideogramService.generateImage(prompt);
      } else {
        // Should never happen, but use Flux as a fallback
        generatedUrl = await fluxService.generateImage(prompt);
      }
      
      console.log('Creator: Generated image URL:', generatedUrl);
      
      // Add to recent generations
      const newGeneration = { url: generatedUrl, prompt, timestamp: new Date() };
      console.log('Creator: Adding new generation to recentGenerations:', newGeneration);
      
      // Check if this URL already exists in recentGenerations
      setRecentGenerations(prev => {
        // Check if the URL already exists
        if (prev.some(gen => gen.url === generatedUrl)) {
          console.log('Creator: This URL already exists in recentGenerations, not adding duplicate');
          return prev;
        }
        
        // Add the new generation at the beginning
        const newState = [newGeneration, ...prev];
        console.log('Creator: New recentGenerations state:', newState);
        return newState;
      });
      
      return generatedUrl;
    } catch (error) {
      console.error('Failed to generate image:', error);
      throw error;
    }
  };

  const handleEdit = async (prompt: string, imageUrl: string) => {
    try {
      console.log('Editing image with prompt:', prompt);
      const url = await fluxService.editImage(prompt, imageUrl);
      if (selectedPanelForEdit) {
        updatePanel({
          ...selectedPanelForEdit,
          url
        }, currentPageIndex);
      }
    } catch (error) {
      console.error('Failed to edit image:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to edit image: ${error.message}`);
      } else {
        throw new Error('Failed to edit image');
      }
    }
  };

  const handleGenerateStory = async (prompt: string, generatedUrl: string, type: 'image' | 'video' | 'gif', panel?: Panel) => {
    if (!currentComic?.pageTemplates[currentPageIndex]) return;
    
    if (panel) {
      // If a panel object is provided, make sure it doesn't use the prompt as caption
      const updatedPanel = {
        ...panel,
        caption: panel.caption || '' // Ensure caption is empty or preserved if already set
      };
      updatePanel(updatedPanel, currentPageIndex);
    } else {
      // Create a new panel for subsequent generations
      const newPanel: Panel = {
        id: nanoid(),
        type,
        url: generatedUrl,
        size: 'medium',
        aspectRatio: 1,
        position: { row: 0, col: type === 'video' ? 2 : 1 },
        caption: '' // Always set empty caption for new panels
      };
      updatePanel(newPanel, currentPageIndex);
    }
  };

  const handleUpdatePanel = (panel: Panel, pageIndex: number) => {
    if (!currentComic) return;
    // Find the panel index in the current page
    const currentPage = (currentComic as Comic).pages[pageIndex] || [];
    const panelIndex = currentPage.findIndex((p: Panel) => p.id === panel.id);
    
    // If panel exists, update it; otherwise add it
    if (panelIndex !== -1) {
      updatePanel(panel, pageIndex);
    } else {
      const newPanel = {
        ...panel,
        id: nanoid()
      };
      updatePanel(newPanel, pageIndex);
    }
  };

  const handlePageChange = (index: number) => {
    setCurrentPageIndex(index);
  };

  const handleAddPage = () => {
    addPage();
    // Navigate to the new page
    if (currentComic) {
      setCurrentPageIndex(currentComic.pages.length);
    }
  };

  const handleDeletePage = (index: number) => {
    removePage(index);
  };

  // Add a toggle function for the collaboration activity panel
  const toggleCollaborationActivity = () => {
    setShowCollaborationActivity(prev => !prev);
  };

  if (!currentComic) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Comic Selected</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please select a comic to edit or create a new one.</p>
          <button
            onClick={handleViewComics}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            View Comics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Sub-header */}
      <div className="fixed top-16 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-40">
        <div className="px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Removing title editor section that appears when side menu is collapsed */}
            {/* <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                {currentComic?.title || 'Untitled Comic'}
              </h1>
              <button
                onClick={() => {}}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <PenLine className="w-4 h-4" />
              </button>
            </div> */}
            
            <div className="flex items-center space-x-4 ml-auto">
              {/* Display collaborator avatars */}
              {!isLoadingCollaborators && collaborators.length > 0 && (
                <CollaboratorAvatars collaborators={collaborators} />
              )}
              
              <button
                onClick={handleViewComics}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center space-x-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>View Stories</span>
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>
              
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
              </button>
              
              <button
                onClick={handleSavePage}
                disabled={isSavingPage}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingPage ? 'Saving...' : 'Save Page'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="flex h-full">
          {/* Left Side Menu */}
          <CreatorSideMenu
            onTemplateSelect={handleTemplateSelect}
            currentTemplate={currentComic?.pageTemplates[currentPageIndex] || null}
            onUpdateTitle={() => {}}
            comic={currentComic}
            onGenerate={(prompt: string, model: 'flux' | 'ideogram') => handleGenerateImage(prompt, model)}
            recentGenerations={recentGenerations}
            onSelectGeneration={() => {}}
            onGenerateStory={handleGenerateStory}
          />

          {/* Main Content */}
          <main className="flex-1 relative ml-96 dark:bg-gray-900">
            <div className="absolute inset-0 overflow-hidden pt-20">
              <div 
                ref={canvasRef}
                id="infinite-canvas"
                className="w-full h-full flex items-center justify-center"
                style={{ 
                  touchAction: "none",
                  backgroundImage: "radial-gradient(circle, #444 1px, transparent 1px)", 
                  backgroundSize: "40px 40px",
                  backgroundPosition: "center",
                  cursor: isDragging ? "grabbing" : "default"
                }}
              >
                <div 
                  ref={zoomContainerRef}
                  id="zoom-container"
                  className="relative transform-gpu"
                  style={{ 
                    transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: "center",
                    transition: isDragging ? "none" : "transform 0.1s ease-out" 
                  }}
                >
                  <div className="max-w-5xl mx-auto">
                    {currentComic?.pageTemplates[currentPageIndex] ? (
                      <PanelGrid
                        panels={currentComic.pages[currentPageIndex] || []}
                        template={currentComic.pageTemplates[currentPageIndex]}
                        onUpdatePanel={handleUpdatePanel}
                        onRemovePanel={(panelId) => removePanel(panelId, currentPageIndex)}
                        onReorderPanels={reorderPanels}
                        pageIndex={currentPageIndex}
                      />
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                        Please select a template to begin
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Collaboration Activity Button */}
              <div className="absolute top-6 right-6 z-50">
                <button
                  onClick={toggleCollaborationActivity}
                  className={`flex items-center justify-center w-10 h-10 rounded-full shadow-lg ${
                    showCollaborationActivity ? 'bg-blue-500 text-white' : 'bg-gray-800/50 backdrop-blur-sm text-white hover:bg-gray-700/50'
                  }`}
                  title="Show collaboration activity"
                >
                  <Users className="w-5 h-5" />
                  {collaborators.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {collaborators.length}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Zoom Controls */}
              <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-2 z-50">
                {/* Canvas Instructions Tooltip - Now positioned above the control buttons */}
                <div className="bg-gray-800/50 backdrop-blur-sm p-2 rounded-lg text-white text-xs mb-2">
                  <p className="mb-1">Scroll to zoom in/out</p>
                  <p>Hold Space + drag to pan</p>
                </div>
                
                <div className="flex space-x-2 bg-gray-800/50 backdrop-blur-sm p-2 rounded-lg">
                  <button 
                    className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center"
                    onClick={() => document.dispatchEvent(new CustomEvent('canvas-zoom-in'))}
                    aria-label="Zoom in"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <button 
                    className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center"
                    onClick={() => document.dispatchEvent(new CustomEvent('canvas-reset'))}
                    aria-label="Reset zoom"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                  </button>
                  <button 
                    className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center"
                    onClick={() => document.dispatchEvent(new CustomEvent('canvas-zoom-out'))}
                    aria-label="Zoom out"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Collaboration Activity Panel */}
            <CollaborationActivity 
              isVisible={showCollaborationActivity}
              onClose={() => setShowCollaborationActivity(false)}
            />
          </main>
        </div>
      </div>

      {/* Page Manager and AI Widget Container */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center pb-4">
        <div className="flex-1 flex justify-center">
          <PageManager
            currentPageIndex={currentPageIndex}
            totalPages={currentComic?.pages.length || 0}
            onPageChange={handlePageChange}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
          />
        </div>
      </div>
    </div>
  );
};