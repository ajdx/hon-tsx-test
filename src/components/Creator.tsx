import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Send, BookOpen, PenLine, Users, Bot, MessageSquare } from 'lucide-react';
import { useComicStore } from '../store/useComicStore';
import { CreatorSideMenu } from './creator/CreatorSideMenu';
import { PanelGrid } from './creator/PanelGrid';
import { CustomCanvas } from './creator/CustomCanvas';
import { PageManager } from './creator/PageManager';
import { ConversationalAIWidget } from './common/ConversationalAIWidget';
import { UnifiedDropdown } from './creator/UnifiedDropdown';
import type { Template, Panel, Comic, Collaborator as ComicCollaborator } from '../types';
import { nanoid } from 'nanoid';
import { fluxService } from '../services/fluxService';
import { ideogramService } from '../services/ideogramService';
import { fluxDevService } from '../services/fluxDevService';
import { CollaboratorAvatars } from './creator/CollaboratorAvatars';
import { collaboratorService, Collaborator } from '../services/collaboratorService';
import { lumaService } from '../services/lumaService';
import { HonIndicator } from './creator/HonIndicator';

// Define the ImageGeneration type
interface ImageGeneration {
  url: string;
  prompt: string;
  timestamp: Date;
  model: string;
}

// Define the GenerationModel type (add here if not already imported)
type GenerationModel = 'flux' | 'ideogram' | 'flux-dev';

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
    currentComic: comicFromStore,
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
    removePage,
    captionAllCurrentPagePanels
  } = useComicStore();
  
  const currentComic = comicFromStore as Comic | null;

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

  const handleGenerateImage = async (prompt: string, model: GenerationModel): Promise<string> => {
    setLoading(true);
    let generatedUrl = '';
    try {
      if (model === 'flux') {
        generatedUrl = await fluxService.generateImage(prompt);
      } else if (model === 'ideogram') {
        // Assuming ideogramService takes prompt and potentially options
        // You might need to pass style/aspect ratio from AIControls state if required
        generatedUrl = await ideogramService.generateImage(prompt);
      } else if (model === 'flux-dev') {
        console.log('Creator: Generating with Flux-1 Dev...');
        generatedUrl = await fluxDevService.generateImage(prompt);
        console.log('Creator: Flux-1 Dev generation successful:', generatedUrl);
      }

      // Update recent generations state
      const newGeneration: ImageGeneration = {
        url: generatedUrl,
        prompt,
        timestamp: new Date(),
        model,
      };

      // Add to state, preventing duplicates
      setRecentGenerations(prev => {
        if (prev.some(gen => gen.url === newGeneration.url)) {
          return prev; // Don't add if URL already exists
        }
        return [newGeneration, ...prev];
      });

      return generatedUrl;
    } catch (error) {
      console.error(`Error generating image with ${model}:`, error);
      throw error; // Re-throw to be caught by the calling component (AIControls)
    } finally {
      setLoading(false);
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
    
    console.log('Creator: handleGenerateStory called with:', { prompt, generatedUrl, type, panel });
    
    // Add to recent generations if it's an image
    if (type === 'image') {
      const newGeneration: ImageGeneration = {
        url: generatedUrl,
        prompt,
        timestamp: new Date(),
        model: 'unknown', // Default for images from other sources
      };

      console.log('Creator: Adding to recentGenerations:', newGeneration);
      
      // Add to state, preventing duplicates
      setRecentGenerations(prev => {
        if (prev.some(gen => gen.url === newGeneration.url)) {
          console.log('Creator: Duplicate URL found, not adding to recentGenerations');
          return prev; // Don't add if URL already exists
        }
        console.log('Creator: Adding new generation to recentGenerations');
        return [newGeneration, ...prev];
      });
    }
    
    if (panel) {
      // If a panel object is provided, make sure it doesn't use the prompt as caption
      const updatedPanel = {
        ...panel,
        caption: panel.caption || '' // Ensure caption is empty or preserved if already set
      };
      console.log('Creator: Updating panel with provided panel object:', updatedPanel);
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
      console.log('Creator: Creating and updating new panel:', newPanel);
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

  // Add handler for captioning all panels
  const handleCaptionAllPanels = async () => {
    console.log('Adding AI captions to all panels...');
    try {
      await captionAllCurrentPagePanels();
      console.log('✅ All panels have been captioned!');
      alert('All panels have been captioned!');
    } catch (error) {
      console.error('Failed to caption some panels:', error);
      alert('Failed to caption some panels');
    }
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
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900 relative">
      {/* Full viewport dotted canvas background */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundImage: "radial-gradient(circle, #444 1px, transparent 1px)", 
          backgroundSize: "40px 40px",
          backgroundPosition: "center"
        }}
      />

      {/* Unified dropdown next to sidebar at top */}
      <div className="absolute top-4 left-80 z-50 ml-6">
        <UnifiedDropdown
          onViewStories={handleViewComics}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onSavePage={handleSavePage}
          isSaving={isSaving}
          isPublishing={isPublishing}
          isSavingPage={isSavingPage}
        />
      </div>

      {/* Sidebar */}
      <CreatorSideMenu
        onTemplateSelect={handleTemplateSelect}
        onGenerate={handleGenerateImage}
        onEdit={handleEdit}
        selectedImageUrl={selectedImage}
        onClearSelection={() => setSelectedImage(null)}
        onAddPanel={() => {}}
        currentTemplate={currentComic?.pageTemplates[currentPageIndex] || null}
        comic={currentComic}
        onUpdateTitle={() => {}}
        recentGenerations={recentGenerations}
        onSelectGeneration={() => {}}
        onGenerateStory={handleGenerateStory}
      />

      <div className="flex-1 relative">
        <div className="flex h-full">
          {/* Main Content */}
          <main className="flex-1 relative ml-80 dark:bg-transparent">
            <div className="absolute inset-0 overflow-hidden">
              <div 
                ref={canvasRef}
                id="infinite-canvas"
                className="w-full h-full flex items-center justify-center"
                style={{ 
                  touchAction: "none",
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
                      currentComic.pageTemplates[currentPageIndex].id === 'custom' ? (
                        <CustomCanvas
                          panels={currentComic.pages[currentPageIndex] || []}
                          onUpdatePanel={handleUpdatePanel}
                          onRemovePanel={(panelId) => removePanel(panelId, currentPageIndex)}
                          pageIndex={currentPageIndex}
                        />
                      ) : (
                      <PanelGrid
                        panels={currentComic.pages[currentPageIndex] || []}
                        template={currentComic.pageTemplates[currentPageIndex]}
                        onUpdatePanel={handleUpdatePanel}
                        onRemovePanel={(panelId) => removePanel(panelId, currentPageIndex)}
                        onReorderPanels={reorderPanels}
                        pageIndex={currentPageIndex}
                      />
                      )
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                        Please select a template to begin
                      </div>
                    )}
                  </div>
                  <HonIndicator />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Page Manager and AI Widget Container */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center pb-4 z-40">
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