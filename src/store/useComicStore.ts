import { create } from 'zustand';
import type { StateCreator, StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { Comic, Panel, NarrationSettings, PageNarration, Template as TemplateType } from '../types';
import { mediaService } from '../services/mediaService';
import { comicService } from '../services/comicService';

type Template = TemplateType | null;

// Helper function to ensure a comic has required fields
const ensureRequiredFields = (comic: Partial<Comic>): Comic => {
  const result: Comic = {
    id: comic.id || nanoid(),
    title: comic.title || '',
    creator: comic.creator || '',
    creatorWallet: comic.creatorWallet || '',
    coverImage: comic.coverImage || '',
    coverType: comic.coverType || 'image',
    pages: comic.pages || [[]],
    pageTemplates: comic.pageTemplates || [],
    narrations: comic.narrations || {},
    createdAt: comic.createdAt || new Date(),
    lastModified: comic.lastModified || new Date(),
  };
  return result;
};

// First, add the type for the store state
export interface State {
  publishedComics: Comic[];
  draftComics: Comic[];
  currentComic: Comic | null;
  currentPageIndex: number;
  isCreatorMode: boolean;
  mediaLoadingStates: Record<string, boolean>;
  showMyComics: boolean;
  selectedPanelId: string | null;
  currentUserAction: any | null;
  panelGenerationProgress: Record<string, { isGenerating: boolean; progress: string; partialImageUrl?: string; }>;
}

// Actions Interface
interface ComicStoreActions {
  setCurrentComic: (comic: Comic | null) => void;
  initializeComic: (comic: Comic) => void;
  updateComicTitle: (title: string) => void;
  updateComicCover: (cover: { url: string; type: 'image' | 'video' | 'gif' }) => void;
  addPanel: (panel: Panel, pageIndex: number) => void;
  updatePanel: (panel: Panel, pageIndex: number) => Promise<void>;
  removePanel: (panelId: string, pageIndex: number) => void;
  reorderPanels: (start: number, end: number, pageIndex: number) => void;
  addPage: () => void;
  removePage: (pageIndex: number) => void;
  setCurrentPageIndex: (index: number) => void;
  publishComic: (comic: Comic) => Promise<Comic>;
  unpublishComic: (comicId: string) => void;
  toggleCreatorMode: () => void;
  editComic: (comic: Comic) => void;
  saveDraft: (comic: Comic) => Promise<Comic>;
  deleteDraft: (comicId: string) => void;
  loadDraft: (comicId: string) => void;
  setMediaLoaded: (panelId: string, loaded: boolean) => void;
  updatePanelNarration: (panelId: string, pageIndex: number, narration: NarrationSettings) => void;
  updatePageNarration: (pageIndex: number, narration: PageNarration) => void;
  getPageNarration: (pageIndex: number) => PageNarration | undefined;
  setPageTemplate: (template: Template, pageIndex: number) => void;
  addNewPage: () => void;
  setPageNarration: ({ text, voiceId, pageIndex }: { 
    text: string;
    voiceId: string;
    pageIndex: number;
  }) => void;
  setShowMyComics: (show: boolean) => void;
  savePage: (pageIndex: number, panels: Panel[], template: Template | null) => void;
  init: () => void;
  fetchAndSetPanelAICaption: (panelId: string, pageIndex: number) => Promise<void>;
  captionAllCurrentPagePanels: () => Promise<void>;
  setSelectedPanelId: (panelId: string | null) => void;
  setPanelGenerationProgress: (panelId: string, isGenerating: boolean, progress?: string, partialImageUrl?: string) => void;
  clearPanelGenerationProgress: (panelId: string) => void;
}

// Combined Type for the Store
type FullComicStore = State & ComicStoreActions;

const persistMedia = async (url: string): Promise<string> => {
  if (!url) return '';
  
  try {
    // Already a Cloudinary URL
    if (url.includes('cloudinary')) {
      return url;
    }

    // If URL is a blob, try to re-upload
    if (url.startsWith('blob:')) {
      try {
        // Check if the blob URL is still valid
        const response = await fetch(url);
        if (!response.ok) {
          console.warn('Blob URL no longer valid:', url);
          return ''; // Return empty string for invalid blobs
        }

        const blob = await response.blob();
        const file = new File([blob], 'panel-content', { type: blob.type });
        const cloudinaryUrl = await mediaService.upload(file);
        
        if (!cloudinaryUrl) {
          console.warn('Failed to upload media to Cloudinary');
          return '';
        }
        
        return cloudinaryUrl;
      } catch (error) {
        console.warn('Failed to persist blob:', error);
        return ''; // Return empty string for failed blobs
      }
    }

    // For all other URLs, return as-is
    return url;
  } catch (error) {
    console.warn('Error in persistMedia:', error);
    return '';
  }
};

// Just comment out unused declaration instead of removing
// const persistComicMedia = async (comic: Comic): Promise<Comic> => {...};

// Explicitly typed state creator function
const comicStoreCreator: StateCreator<FullComicStore, [["zustand/persist", unknown]]> = (set, get) => ({
  // Initial state implementation (matches State interface)
  publishedComics: [],
  draftComics: [],
  currentComic: null,
  currentPageIndex: 0,
  isCreatorMode: false,
  mediaLoadingStates: {},
  showMyComics: false,
  selectedPanelId: null,
  currentUserAction: null,
  panelGenerationProgress: {},

  // Actions implementation (matches ComicStoreActions interface)
  saveDraft: async (comic: Comic): Promise<Comic> => {
    try {
      const savedComic = await comicService.saveComic(comic);
      set((state) => ({
        draftComics: [
          ...state.draftComics.filter(d => d.id !== comic.id),
          savedComic
        ]
      }));
      return savedComic;
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  },

  publishComic: async (comic: Comic): Promise<Comic> => {
    try {
      const comicToPublish = ensureRequiredFields({
        ...comic,
        id: comic.id.startsWith('draft-') ? nanoid() : comic.id 
      });
      const publishedComic = await comicService.saveComic(comicToPublish);
      set((state) => ({
        publishedComics: [...state.publishedComics, publishedComic],
        draftComics: state.draftComics.filter(d => d.id !== comic.id),
        currentComic: null,
        isCreatorMode: false
      }));
      return publishedComic;
    } catch (error) {
      console.error('Failed to publish comic:', error);
      throw error;
    }
  },

  init: () => {
    set(() => {
      const storedState = localStorage.getItem('comicState');
      if (!storedState) return {};
      try {
        const parsedState = JSON.parse(storedState);
        return {
          ...parsedState,
          currentComic: parsedState.currentComic ? ensureRequiredFields(parsedState.currentComic) : null
        };
      } catch (e) {
        console.error('Failed to parse stored state:', e);
        return {};
      }
    });
  },

  setSelectedPanelId: (panelId: string | null) => set({ selectedPanelId: panelId }),

  setPanelGenerationProgress: (panelId: string, isGenerating: boolean, progress: string = '', partialImageUrl?: string) => 
    set((state) => ({
      panelGenerationProgress: {
        ...state.panelGenerationProgress,
        [panelId]: { isGenerating, progress, partialImageUrl }
      }
    })),

  clearPanelGenerationProgress: (panelId: string) => 
    set((state) => {
      const { [panelId]: removed, ...rest } = state.panelGenerationProgress;
      return { panelGenerationProgress: rest };
    }),

  setCurrentComic: (comic: Comic | null) => set({ currentComic: comic }),

  initializeComic: (comic: Comic) => set({
    currentComic: ensureRequiredFields({
      ...comic,
      pages: comic.pages || [[]],
      pageTemplates: comic.pageTemplates || [],
    }),
    currentPageIndex: 0,
    isCreatorMode: true,
  }),

  toggleCreatorMode: () => set((state) => ({ isCreatorMode: !state.isCreatorMode, currentPageIndex: 0 })),

  editComic: (comic: Comic) => set({
    currentComic: ensureRequiredFields({
      ...comic,
      pages: comic.pages || [[]],
      pageTemplates: comic.pageTemplates || [],
    }),
    currentPageIndex: 0,
    isCreatorMode: true,
  }),

  updateComicTitle: (title: string) => set((state) => ({
    currentComic: state.currentComic ? ensureRequiredFields({
      ...state.currentComic,
      title,
    }) : null,
  })),

  updateComicCover: (cover: { url: string; type: 'image' | 'video' | 'gif' }) => set((state) => ({
    currentComic: state.currentComic ? ensureRequiredFields({
      ...state.currentComic,
      coverImage: cover.url,
      coverType: cover.type,
    }) : null,
  })),

  addPanel: (panel: Panel, pageIndex: number) => set((state) => {
    if (!state.currentComic) return {};
    const newPages = [...state.currentComic.pages];
    if (!newPages[pageIndex]) newPages[pageIndex] = [];
    newPages[pageIndex] = [...newPages[pageIndex], panel];
    return {
      currentComic: ensureRequiredFields({
        ...state.currentComic,
        pages: newPages,
        lastModified: new Date()
      })
    };
  }),

  updatePanel: async (panel: Panel, pageIndex: number) => {
    console.log('Updating panel:', {
      id: panel.id,
      caption: panel.caption,
      position: panel.position
    });

    let finalPanel = { ...panel };
    if (panel.url && panel.url.startsWith('blob:')) {
      try {
        const response = await fetch(panel.url);
        const blob = await response.blob();
        const file = new File([blob], 'panel-content', { type: blob.type });
        const cloudinaryUrl = await mediaService.upload(file);
        finalPanel.url = cloudinaryUrl || "";
      } catch (error) {
        console.warn('Failed to upload blob:', error);
        finalPanel.url = "";
      }
    }

    set((state) => {
      if (!state.currentComic) return {};
      const newPages = [...state.currentComic.pages];
      if (!newPages[pageIndex]) newPages[pageIndex] = [];
      const existingPanelIndex = newPages[pageIndex].findIndex(p => p.id === finalPanel.id);
      const panelData = {
        ...finalPanel,
        position: {
          ...finalPanel.position,
          rowSpan: finalPanel.position.rowSpan || 1,
          colSpan: finalPanel.position.colSpan || 1
        }
      };
      if (existingPanelIndex !== -1) {
        newPages[pageIndex][existingPanelIndex] = panelData;
      } else {
        newPages[pageIndex].push(panelData);
      }
      return { currentComic: { ...state.currentComic, pages: newPages, lastModified: new Date() } };
    });
    
    // Automatically trigger caption fetching for image panels that have a URL
    // Do this after state update to ensure panel is in the store
    if (finalPanel.type === 'image' && finalPanel.url && 
        (finalPanel.url.startsWith('http') || finalPanel.url.startsWith('blob:')) && 
        !finalPanel.aiCaption && !finalPanel.captionAttempted) {
      console.log(`Panel updated: Auto-triggering caption fetch for panel ${finalPanel.id}`);
      setTimeout(() => {
        // Using setTimeout to ensure state update is completed first
        get().fetchAndSetPanelAICaption(finalPanel.id, pageIndex);
      }, 100);
    }
  },

  removePanel: (panelId: string, pageIndex: number) => set((state) => {
    if (!state.currentComic) return {};
    const newPages = [...state.currentComic.pages];
    if (!newPages[pageIndex]) return {};
    newPages[pageIndex] = newPages[pageIndex].filter(p => p.id !== panelId);
    return {
      currentComic: ensureRequiredFields({ ...state.currentComic, pages: newPages, lastModified: new Date() })
    };
  }),

  reorderPanels: (startIndex: number, endIndex: number, pageIndex: number) => set((state) => {
    if (!state.currentComic) return {};
    const newPages = [...state.currentComic.pages];
    const [removed] = newPages[pageIndex].splice(startIndex, 1);
    newPages[pageIndex].splice(endIndex, 0, removed);
    return { currentComic: { ...state.currentComic, pages: newPages, lastModified: new Date() } };
  }),

  addPage: () => set((state) => {
    if (!state.currentComic) return {};
    const newPages = [...state.currentComic.pages, []];
    return { currentComic: { ...state.currentComic, pages: newPages, lastModified: new Date() } };
  }),

  removePage: (pageIndex: number) => set((state) => {
    if (!state.currentComic) return {};
    const newPages = [...state.currentComic.pages];
    const newTemplates = [...state.currentComic.pageTemplates];
    newPages.splice(pageIndex, 1);
    newTemplates.splice(pageIndex, 1);
    return {
      currentComic: { ...state.currentComic, pages: newPages, pageTemplates: newTemplates, lastModified: new Date() },
      currentPageIndex: Math.max(0, pageIndex - 1)
    };
  }),

  setCurrentPageIndex: (index: number) => set({ currentPageIndex: index }),

  unpublishComic: (comicId: string) => set((state) => ({ publishedComics: state.publishedComics.filter(c => c.id !== comicId) })),

  deleteDraft: (comicId: string) => set((state) => ({ draftComics: state.draftComics.filter(d => d.id !== comicId) })),

  loadDraft: (comicId: string) => set((state) => {
    const draft = state.draftComics.find(d => d.id === comicId);
    if (!draft) return {};
    return { currentComic: draft, currentPageIndex: 0, isCreatorMode: true };
  }),

  setMediaLoaded: (panelId: string, loaded: boolean) => set((state) => ({
    mediaLoadingStates: { ...state.mediaLoadingStates, [panelId]: loaded }
  })),

  updatePanelNarration: (panelId: string, pageIndex: number, narration: NarrationSettings) => set((state) => {
    if (!state.currentComic) return {};
    const newPages = [...state.currentComic.pages];
    const page = newPages[pageIndex];
    if (!page) return {};
    const panelIndex = page.findIndex(p => p.id === panelId);
    if (panelIndex === -1) return {};
    page[panelIndex] = { ...page[panelIndex], narration };
    return { currentComic: { ...state.currentComic, pages: newPages, lastModified: new Date() } };
  }),

  updatePageNarration: (pageIndex: number, narration: PageNarration) => set((state) => {
    if (!state.currentComic) return {};
    const existingNarration = state.currentComic.narrations[pageIndex] || {};
    
    // Create the updated narration object, merging new data
    const updatedNarration: PageNarration = {
      ...existingNarration, // Keep existing fields like audioUrl if present
      text: narration.text, // Always update text
      engine: narration.engine || 'eleven', // Default to eleven if not provided
      voiceId: narration.engine !== 'hume' ? narration.voiceId : undefined, // Store voiceId only if engine is not Hume
      humeVoiceId: narration.engine === 'hume' ? narration.humeVoiceId : undefined,
      humeVoicePrompt: narration.engine === 'hume' ? narration.humeVoicePrompt : undefined,
      humeActingInstruction: narration.engine === 'hume' ? narration.humeActingInstruction : undefined,
    };

    // Clean up potentially conflicting fields based on engine
    if (updatedNarration.engine === 'hume') {
      delete updatedNarration.voiceId; // Remove standard voiceId if Hume
      // Optional: Clear prompt if library ID is set, and vice-versa?
      // if (updatedNarration.humeVoiceId) delete updatedNarration.humeVoicePrompt;
      // if (updatedNarration.humeVoicePrompt) delete updatedNarration.humeVoiceId;
    } else { // Engine is eleven or undefined (defaulted to eleven)
      delete updatedNarration.humeVoiceId;
      delete updatedNarration.humeVoicePrompt;
      delete updatedNarration.humeActingInstruction;
    }

    const updatedNarrations = {
      ...state.currentComic.narrations,
      [pageIndex]: updatedNarration,
    };

    return {
      currentComic: ensureRequiredFields({ ...state.currentComic, narrations: updatedNarrations, lastModified: new Date() }),
    };
  }),

  getPageNarration: (pageIndex: number): PageNarration | undefined => {
    const state = get(); 
    return state.currentComic?.narrations?.[pageIndex];
  },

  setPageTemplate: (template: Template, pageIndex: number) => set((state) => {
    if (!state.currentComic) return {};
    const newTemplates = [...state.currentComic.pageTemplates];
    newTemplates[pageIndex] = template;
    return { currentComic: { ...state.currentComic, pageTemplates: newTemplates, lastModified: new Date() } };
  }),

  addNewPage: () => set((state) => {
    if (!state.currentComic) return {};
    const updatedComic: Comic = {
      ...state.currentComic,
      pages: [...state.currentComic.pages, []],
      pageTemplates: [...(state.currentComic.pageTemplates || []), null],
      narrations: {
        ...(state.currentComic.narrations || {})
      },
      lastModified: new Date()
    };
    const newPageIndex = updatedComic.pages.length - 1;
    return { currentComic: updatedComic, currentPageIndex: newPageIndex };
  }),

  setPageNarration: ({ text, voiceId, pageIndex }: { text: string; voiceId: string; pageIndex: number; }) => set((state) => {
    if (!state.currentComic) return {};
    const updatedComic = {
      ...state.currentComic,
      narrations: {
        ...(state.currentComic.narrations || {}),
        [pageIndex]: {
          text,
          voiceId,
          pageIndex
        }
      }
    };
    const updatedDrafts = state.draftComics.map(draft => 
      draft.id === updatedComic.id ? updatedComic : draft
    );
    if (!state.draftComics.find(d => d.id === updatedComic.id)) updatedDrafts.push(updatedComic);
    return { currentComic: updatedComic, draftComics: updatedDrafts };
  }),

  setShowMyComics: (show: boolean) => set({ showMyComics: show }),

  savePage: (pageIndex: number, panels: Panel[], template: Template | null) => set((state) => {
    if (!state.currentComic) return {};
    const newPages = [...state.currentComic.pages];
    const newTemplates = [...state.currentComic.pageTemplates];
    newPages[pageIndex] = panels;
    newTemplates[pageIndex] = template;
    return { currentComic: { ...state.currentComic, pages: newPages, pageTemplates: newTemplates, lastModified: new Date() } };
  }),
  
  fetchAndSetPanelAICaption: async (panelId: string, pageIndex: number) => {
    const state = get();
    const panel = state.currentComic?.pages?.[pageIndex]?.find(p => p.id === panelId);
    if (!panel) return;
    const imageUrl = panel.url;
    if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:'))) return;
    if (panel.aiCaption !== undefined) return;
    
    let fetchedCaption: string | null = null;
    try {
      console.log(`Fetching AI caption for panel ${panelId} with URL ${imageUrl.substring(0, 30)}...`);
      const response = await fetch('/api/fal/moondream', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }), 
      });
      
      if (!response.ok) {
        console.error(`Caption fetch failed with status: ${response.status}`);
        fetchedCaption = null;
      } else { 
        const data = await response.json();
        // Handle new response format with success flag
        if (data.success === false) {
          console.error('Moondream API returned error:', data.error);
          fetchedCaption = null;
        } else {
          fetchedCaption = data.caption || null;
          console.log(`Successfully fetched caption: "${fetchedCaption?.substring(0, 50)}..."`);
        }
      }
    } catch (error) {
      console.error('Error fetching AI caption:', error);
      fetchedCaption = null;
    }
    
    // Update the panel with the fetched caption
    set((currentState) => {
      if (!currentState.currentComic) return {};
      const newPages = [...currentState.currentComic.pages];
      if (!newPages[pageIndex]) return {};
      const panelIndex = newPages[pageIndex].findIndex(p => p.id === panelId);
      if (panelIndex === -1) return {};
      
      // Keep track of caption attempts to avoid endless retries
      const captionAttempted = true;
      newPages[pageIndex][panelIndex] = { 
        ...newPages[pageIndex][panelIndex], 
        aiCaption: fetchedCaption,
        captionAttempted 
      };
      
      return { 
        currentComic: { 
          ...currentState.currentComic, 
          pages: newPages 
        } 
      };
    });
  },

  captionAllCurrentPagePanels: async () => {
    const state = get();
    const { currentComic, currentPageIndex } = state;
    if (!currentComic || !currentComic.pages[currentPageIndex]) return;
    
    const panels = currentComic.pages[currentPageIndex];
    console.log(`Captioning all ${panels.length} panels on page ${currentPageIndex}`);
    
    // Process each image panel that doesn't already have a caption
    const imagePanels = panels.filter(panel => 
      panel.type === 'image' && 
      panel.url && 
      (panel.url.startsWith('http') || panel.url.startsWith('blob:')) && 
      panel.aiCaption === undefined
    );
    
    if (imagePanels.length === 0) {
      console.log('No panels need captioning on this page');
      return;
    }
    
    console.log(`Found ${imagePanels.length} panels that need captioning`);
    
    // Process panels in sequence to avoid overwhelming the API
    for (const panel of imagePanels) {
      console.log(`Captioning panel ${panel.id}`);
      await state.fetchAndSetPanelAICaption(panel.id, currentPageIndex);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  },



});

// Apply middleware and create store
export const useComicStore = create<FullComicStore>()(
  persist(
    comicStoreCreator,
    {
      name: 'comic-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        publishedComics: state.publishedComics,
        draftComics: state.draftComics,
        showMyComics: state.showMyComics,
        selectedPanelId: state.selectedPanelId,
        currentUserAction: state.currentUserAction,
        panelGenerationProgress: state.panelGenerationProgress,
      }),
              onRehydrateStorage: () => (state, error) => {
          if (state) {
            state.publishedComics = state.publishedComics.map(ensureRequiredFields);
            state.draftComics = state.draftComics.map(ensureRequiredFields);
            setCurrentComic(state.currentComic);
            // Store rehydrated (production logging removed)
            state.mediaLoadingStates = {};
            // Clear any stale generation progress on app startup
            state.panelGenerationProgress = {};
          }
          if (error) {
            console.error('Failed to rehydrate comic store:', error);
          }
        },
    }
  )
);