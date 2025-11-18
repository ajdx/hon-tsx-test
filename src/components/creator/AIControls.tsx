import React, { useState, useEffect } from 'react';
import { Wand2, Pencil, X, Download, Clock, Info, Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Panel } from '../../types';
import { fluxService } from '../../services/fluxService';
import { fluxKreaService, StreamProgressEvent } from '../../services/fluxKreaService';
import { ProgressiveImage } from './ProgressiveImage';
import { ideogramService, IdeogramStyle, IdeogramAspectRatio } from '../../services/ideogramService';
import { imagen4Service, Imagen4Options } from '../../services/imagen4Service';
import { gptImageService, GptTextToImageOptions } from '../../services/gptImageService';
import { runwayTextToImageService } from '../../services/runwayTextToImageService';
import { lumaPhotonFlashService, LumaPhotonFlashOptions } from '../../services/lumaPhotonFlashService';

// Define the possible models
type GenerationModel = 'flux' | 'ideogram' | 'flux-dev' | 'flux-krea' | 'imagen4' | 'gpt-image-1' | 'runway' | 'luma-photon-flash';

// Model display names for the tooltip
const modelDisplayNames: Record<GenerationModel, string> = {
  'flux': 'Flux LoRA',
  'ideogram': 'Ideogram',
  'flux-dev': 'Flux-1 Dev',
  'flux-krea': 'Flux.1 Krea',
  'imagen4': 'Imagen 4',
  'gpt-image-1': 'GPT-Image-1',
  'runway': 'Runway',
  'luma-photon-flash': 'Luma Photon Flash'
};

interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: Date;
  model: string;
}

interface AIControlsProps {
  onGenerate?: (prompt: string, model: GenerationModel) => Promise<string>;
  onEdit?: (prompt: string, imageUrl: string) => Promise<void>;
  selectedImageUrl?: string;
  onClearSelection?: () => void;
  onAddPanel?: (panel: Panel) => void;
  onGenerateStory: (prompt: string, generatedUrl: string, type: 'image' | 'video' | 'gif', panel?: Panel) => Promise<void>;
  recentGenerations?: Array<{
    url: string;
    prompt: string;
    timestamp: Date;
  }>;
}

export const AIControls: React.FC<AIControlsProps> = ({ 
  onGenerate, 
  onEdit, 
  selectedImageUrl, 
  onClearSelection,
  onGenerateStory,
  recentGenerations = []
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<GenerationModel>('flux');
  const [streamingProgress, setStreamingProgress] = useState<string | null>(null);
  const [partialImageUrl, setPartialImageUrl] = useState<string | null>(null);
  const [showIdeogramInfo, setShowIdeogramInfo] = useState(false);
  const [ideogramStyle, setIdeogramStyle] = useState<IdeogramStyle>('auto');
  const [ideogramAspectRatio, setIdeogramAspectRatio] = useState<IdeogramAspectRatio>('1:1');
  const [expandPrompt, setExpandPrompt] = useState(true);
  // Imagen 4 options
  const [imagen4AspectRatio, setImagen4AspectRatio] = useState<'1:1' | '16:9' | '9:16' | '3:4' | '4:3'>('1:1');
  // GPT-Image-1 options
  const [gptImageSize, setGptImageSize] = useState<'auto' | '1024x1024' | '1536x1024' | '1024x1536'>('auto');
  const [gptQuality, setGptQuality] = useState<'auto' | 'low' | 'medium' | 'high'>('auto');
  const [gptBackground, setGptBackground] = useState<'auto' | 'transparent' | 'opaque'>('auto');
  // Luma Photon Flash options
  const [lumaAspectRatio, setLumaAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '9:21'>('1:1');

  // Use recentGenerations from props if provided, otherwise use local state
  useEffect(() => {
    console.log('AIControls: recentGenerations from props:', recentGenerations);
    if (recentGenerations?.length) {
      console.log('AIControls: Setting generatedImages from props:', recentGenerations);
      setGeneratedImages(recentGenerations);
      setShowGallery(true);
    }
  }, []);

  // Load saved images from localStorage
  useEffect(() => {
    console.log('AIControls: Loading images from localStorage and checking recentGenerations prop');
    
    try {
      if (recentGenerations && recentGenerations.length > 0) {
        console.log('AIControls: Using recentGenerations from props:', recentGenerations);
        // Don't overwrite generatedImages if it already has content from props
        setGeneratedImages(prevImages => {
          // If prevImages is empty or doesn't match recentGenerations, use recentGenerations
          if (prevImages.length === 0 || 
              JSON.stringify(prevImages) !== JSON.stringify(recentGenerations)) {
            return recentGenerations;
          }
          return prevImages;
        });
        setShowGallery(true);
      } else {
        const savedImages = localStorage.getItem('generatedImages');
        console.log('AIControls: Raw localStorage data:', savedImages);
        
        if (savedImages) {
          try {
            const parsedImages = JSON.parse(savedImages);
            console.log('AIControls: Parsed localStorage images:', parsedImages);
            
            if (Array.isArray(parsedImages) && parsedImages.length > 0) {
              // Convert string timestamps back to Date objects and add default model for backwards compatibility
              const formattedImages = parsedImages.map((img: any) => ({
                ...img,
                timestamp: typeof img.timestamp === 'string' ? new Date(img.timestamp) : img.timestamp,
                model: img.model || 'unknown' // Add default model for backwards compatibility
              }));
              
              console.log('AIControls: Setting generatedImages from localStorage with converted timestamps:', formattedImages);
              setGeneratedImages(formattedImages);
              setShowGallery(true);
            } else {
              console.log('AIControls: Parsed localStorage is empty or not an array');
            }
          } catch (error) {
            console.error('AIControls: Error parsing generatedImages from localStorage:', error);
          }
        } else {
          console.log('AIControls: No saved images found in localStorage');
        }
      }
    } catch (error) {
      console.error('AIControls: Error in loading images useEffect:', error);
    }
  }, []);

  // Create a separate effect to handle updates to recentGenerations
  useEffect(() => {
    if (recentGenerations && recentGenerations.length > 0) {
      console.log('AIControls: recentGenerations updated:', recentGenerations);
      // Merge with existing images rather than replacing them
      setGeneratedImages(prev => {
        // Get unique images by URL
        const uniqueUrls = new Set([...recentGenerations, ...prev].map(img => img.url));
        const mergedImages = Array.from(uniqueUrls).map(url => {
          // Find the image object with this URL, preferring recentGenerations first
          return [...recentGenerations, ...prev].find(img => img.url === url) as GeneratedImage;
        });
        
        console.log('AIControls: Merged generatedImages:', mergedImages);
        return mergedImages;
      });
      setShowGallery(true);
    }
  }, [recentGenerations]);

  // Save images to localStorage whenever generatedImages changes
  useEffect(() => {
    try {
      if (generatedImages.length > 0) {
        console.log('AIControls: Saving generatedImages to localStorage, count:', generatedImages.length);
        
        // Format dates as ISO strings for storage
        const formattedImages = generatedImages.map(img => ({
          ...img,
          timestamp: img.timestamp instanceof Date ? img.timestamp.toISOString() : img.timestamp
        }));
        
        localStorage.setItem('generatedImages', JSON.stringify(formattedImages));
        console.log('AIControls: Successfully saved to localStorage');
      }
    } catch (error) {
      console.error('AIControls: Error saving to localStorage:', error);
    }
  }, [generatedImages]);

  // Log incoming recentGenerations when they change
  useEffect(() => {
    console.log('AIControls: recentGenerations prop changed:', recentGenerations);
  }, [recentGenerations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      if (selectedImageUrl && onEdit) {
        await onEdit(prompt, selectedImageUrl);
        setPrompt('');
      } else if (onGenerate) {
        let generatedUrl: string;
        if (selectedModel === 'imagen4') {
          generatedUrl = await imagen4Service.generateImage(prompt, { aspectRatio: imagen4AspectRatio });
        } else if (selectedModel === 'gpt-image-1') {
          generatedUrl = await gptImageService.generateImage(prompt, {
            imageSize: gptImageSize,
            quality: gptQuality,
            background: gptBackground
          });
        } else if (selectedModel === 'runway') {
          generatedUrl = await runwayTextToImageService.generateImage(prompt, {
            ratio: '1024:1024',
            guidance: 7.5
          });
        } else if (selectedModel === 'luma-photon-flash') {
          generatedUrl = await lumaPhotonFlashService.generateImage(prompt, {
            aspectRatio: lumaAspectRatio
          });
        } else if (selectedModel === 'flux-krea') {
          // Use Flux Krea with streaming
          generatedUrl = await fluxKreaService.generateImage(prompt, {
            image_size: 'landscape_4_3',
            num_inference_steps: 28,
            guidance_scale: 4.5,
            acceleration: 'regular',
            stream: true
          }, (event: StreamProgressEvent) => {
            // Handle streaming progress with progressive image
            if (event.type === 'progress') {
              setStreamingProgress(event.message || 'Generating...');
              if (event.partialImageUrl) {
                setPartialImageUrl(event.partialImageUrl);
              }
            } else if (event.type === 'complete') {
              setStreamingProgress(null);
              setPartialImageUrl(null);
            } else if (event.type === 'error') {
              setStreamingProgress(null);
              setPartialImageUrl(null);
              console.error('Flux Krea streaming error:', event.error);
            }
          });
        } else {
          generatedUrl = await onGenerate(prompt, selectedModel);
        }
        const newGeneration = {
          url: generatedUrl,
          prompt,
          timestamp: new Date(),
          model: selectedModel
        };
        setGeneratedImages(prev => {
          if (prev.some(img => img.url === generatedUrl)) {
            return prev;
          }
          return [newGeneration, ...prev];
        });
        setPrompt('');
        setShowGallery(true);
      } else {
        setError('Required action handler (edit/generate) is not configured.');
      }
    } catch (error) {
      console.error('AIControls: Failed during submit:', error);
      const actionVerb = selectedImageUrl ? 'edit' : 'generate';
      setError(`Failed to ${actionVerb} image. Please try again. Details: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string, prompt: string) => {
    let blobUrl: string | null = null;
    try {
      // Use CORS proxy for external CDN URLs to avoid CORS issues
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to download image');
      }
      
      const blob = await response.blob();
      blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generated-${prompt.slice(0, 30)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download image:', error);
      setError(error instanceof Error ? error.message : 'Failed to download image');
    } finally {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, imageUrl: string) => {
    e.dataTransfer.setData('text/plain', imageUrl);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleImageClick = async (img: GeneratedImage) => {
    const panel: Panel = {
      id: nanoid(),
      type: 'image',
      url: img.url,
      caption: '',
      size: 'medium',
      aspectRatio: 1,
      position: { row: 0, col: 0 }
    };
    await onGenerateStory(img.prompt, img.url, 'image', panel);
    onClearSelection?.();
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: Date | string) => {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleString();
    }
    return timestamp.toLocaleString();
  };

  // Copy prompt to clipboard
  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      // You could add a toast notification here if you have one
      console.log('Prompt copied to clipboard:', prompt);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = prompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="space-y-4">
      {/* Model Selection - Responsive Layout */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-300">Model:</span>
        
        {/* Dropdown for narrow screens, Grid for wider screens */}
        <div className="block lg:hidden">
          {/* Mobile/Tablet Dropdown */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as GenerationModel)}
            className="w-full px-3 py-2 text-sm border rounded-md text-gray-200 bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="flux">Flux</option>
            <option value="ideogram">Ideogram</option>
            <option value="flux-dev">Flux Dev</option>
            <option value="flux-krea">Flux Krea</option>
            <option value="imagen4">Imagen 4</option>
            <option value="gpt-image-1">GPT-Image-1</option>
            <option value="runway">Runway</option>
            <option value="luma-photon-flash">Luma Photon Flash</option>
          </select>
        </div>
        
        {/* Grid layout for larger screens */}
        <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-2">
          <button
            onClick={() => setSelectedModel('flux')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-all duration-200 ${
              selectedModel === 'flux'
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            Flux
          </button>
          
          <button
            onClick={() => setSelectedModel('ideogram')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md flex items-center justify-center font-medium transition-all duration-200 ${
              selectedModel === 'ideogram'
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            <span className="truncate">Ideogram</span>
            <div className="relative ml-1 hidden xl:block">
              <Info 
                size={12} 
                className="cursor-help flex-shrink-0"
                onMouseEnter={() => setShowIdeogramInfo(true)}
                onMouseLeave={() => setShowIdeogramInfo(false)}
              />
              {showIdeogramInfo && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-normal z-50 w-64 min-w-max">
                  Ideogram offers high-quality image generation with various style options and excellent text rendering capabilities.
                </div>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setSelectedModel('flux-dev')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-all duration-200 ${
              selectedModel === 'flux-dev'
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            Flux Dev
          </button>
          
          <button
            onClick={() => setSelectedModel('flux-krea')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-all duration-200 ${
              selectedModel === 'flux-krea'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            Flux Krea
          </button>
          
          <button
            onClick={() => setSelectedModel('imagen4')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-all duration-200 ${
              selectedModel === 'imagen4'
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            Imagen 4
          </button>
          
          <button
            onClick={() => setSelectedModel('gpt-image-1')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-all duration-200 ${
              selectedModel === 'gpt-image-1'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            GPT-Image-1
          </button>
          
          <button
            onClick={() => setSelectedModel('runway')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-all duration-200 ${
              selectedModel === 'runway'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            Runway
          </button>
          
          <button
            onClick={() => setSelectedModel('luma-photon-flash')}
            className={`px-2 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-all duration-200 ${
              selectedModel === 'luma-photon-flash'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            Luma Photon
          </button>
        </div>
      </div>

      {/* Ideogram Options (only show when Ideogram is selected) */}
      {selectedModel === 'ideogram' && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Style</label>
            <select
              value={ideogramStyle}
              onChange={(e) => setIdeogramStyle(e.target.value as IdeogramStyle)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="general">General</option>
              <option value="realistic">Realistic</option>
              <option value="design">Design</option>
              <option value="render_3D">3D Render</option>
              <option value="anime">Anime</option>
            </select>
          </div>
          
          {/* Aspect Ratio Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aspect Ratio</label>
            <select
              value={ideogramAspectRatio}
              onChange={(e) => setIdeogramAspectRatio(e.target.value as IdeogramAspectRatio)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1:1">Square (1:1)</option>
              <option value="16:9">Landscape (16:9)</option>
              <option value="9:16">Portrait (9:16)</option>
              <option value="4:3">Landscape (4:3)</option>
              <option value="3:4">Portrait (3:4)</option>
              <option value="3:2">Landscape (3:2)</option>
              <option value="2:3">Portrait (2:3)</option>
            </select>
          </div>

          {/* Expand Prompt Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="expand-prompt"
              checked={expandPrompt}
              onChange={(e) => setExpandPrompt(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="expand-prompt" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Expand prompt (AI-enhanced)
            </label>
          </div>
        </div>
      )}

      {/* Flux Dev options */}
      {selectedModel === 'flux-dev' && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            FLUX.1 Dev offers high-quality image generation with excellent detail and prompt adherence.
          </p>
        </div>
      )}

      {/* Imagen 4 options */}
      {selectedModel === 'imagen4' && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aspect Ratio</label>
            <select
              value={imagen4AspectRatio}
              onChange={e => setImagen4AspectRatio(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1:1">Square (1:1)</option>
              <option value="16:9">Landscape (16:9)</option>
              <option value="9:16">Portrait (9:16)</option>
              <option value="4:3">Landscape (4:3)</option>
              <option value="3:4">Portrait (3:4)</option>
            </select>
          </div>
        </div>
      )}

      {/* GPT-Image-1 options */}
      {selectedModel === 'gpt-image-1' && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <p className="font-medium mb-1">OpenAI GPT-Image-1</p>
            <p>State-of-the-art image generation with excellent prompt understanding and detail quality.</p>
          </div>
          
          {/* Image Size Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image Size</label>
            <select
              value={gptImageSize}
              onChange={(e) => setGptImageSize(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="1024x1024">Square (1024x1024)</option>
              <option value="1536x1024">Landscape (1536x1024)</option>
              <option value="1024x1536">Portrait (1024x1536)</option>
            </select>
          </div>
          
          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quality</label>
            <select
              value={gptQuality}
              onChange={(e) => setGptQuality(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          {/* Background Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background</label>
            <select
              value={gptBackground}
              onChange={(e) => setGptBackground(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="transparent">Transparent</option>
              <option value="opaque">Opaque</option>
            </select>
          </div>
        </div>
      )}

      {/* Luma Photon Flash options */}
      {selectedModel === 'luma-photon-flash' && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <p className="font-medium mb-1">Luma Photon Flash</p>
            <p>Ultra-fast creative text-to-image generation with high-quality output and excellent style control.</p>
          </div>
          
          {/* Aspect Ratio Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aspect Ratio</label>
            <select
              value={lumaAspectRatio}
              onChange={(e) => setLumaAspectRatio(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1:1">Square (1:1)</option>
              <option value="16:9">Landscape (16:9)</option>
              <option value="9:16">Portrait (9:16)</option>
              <option value="4:3">Landscape (4:3)</option>
              <option value="3:4">Portrait (3:4)</option>
              <option value="21:9">Ultrawide (21:9)</option>
              <option value="9:21">Tall Portrait (9:21)</option>
            </select>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="prompt-input" className="sr-only">
          {selectedImageUrl ? "Edit image prompt" : "Generate image prompt"}
        </label>
        <div className="relative">
          <textarea
            id="prompt-input"
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={selectedImageUrl ? "Describe how to edit this image..." : "Describe the image you want to generate..."}
            className="w-full px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-gray-200 placeholder-gray-400 resize-none"
            rows={3}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {prompt.length}/1000
          </div>
        </div>
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="w-full sm:w-auto sm:min-w-[120px] px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 font-medium"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⌛</span>
              <span>Generating...</span>
            </>
          ) : selectedImageUrl ? (
            <>
              <Pencil className="w-4 h-4" />
              <span>Edit Image</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Generate</span>
            </>
          )}
        </button>
      </form>

      

      {/* Progressive Image Preview for Flux Krea */}
      {selectedModel === 'flux-krea' && (isGenerating || partialImageUrl) && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Live Preview - Flux.1 Krea
          </h4>
          <ProgressiveImage
            partialImageUrl={partialImageUrl || undefined}
            isGenerating={isGenerating}
            className="w-full h-48"
          />
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}

      {/* Generated Images Gallery */}
      {showGallery && (
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Clock size={16} className="text-gray-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recent Generations ({generatedImages.length})
              </h3>
            </div>
            <button
              onClick={() => setShowGallery(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {generatedImages.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-sm italic">
              No images generated yet. Generate an image to see it here.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {generatedImages.map((img, index) => (
                <div
                  key={`${img.url}-${index}`}
                  className="relative group cursor-pointer"
                  draggable
                  onDragStart={(e) => handleDragStart(e, img.url)}
                  onClick={() => handleImageClick(img)}
                  onMouseEnter={() => setHoveredImage(index)}
                  onMouseLeave={() => setHoveredImage(null)}
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-24 object-cover rounded-lg"
                    onLoad={() => console.log('AIControls: Image loaded successfully:', img.url)}
                    onError={(e) => {
                      console.error('Failed to load image:', img.url);
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAyMnM4LTQgOC0xMFY1bC04LTMtOCAzdjdjMCA2IDggMTAgOCAxMHoiLz48L3N2Zz4=';
                    }}
                  />

                  {/* Tooltip on hover */}
                  {hoveredImage === index && (
                    <div className="absolute z-50 w-72 p-3 text-sm bg-purple-600 text-white rounded shadow-lg left-0 bottom-full mb-2">
                      <div className="mb-2">
                        <p className="font-semibold">Prompt:</p>
                        <div className={expandedPrompt === index ? 'max-h-40 overflow-y-auto pr-1 text-xs' : 'text-xs'}>
                          {expandedPrompt === index 
                            ? img.prompt 
                            : (img.prompt.length > 50 
                                ? img.prompt.substring(0, 50) + '...' 
                                : img.prompt)}
                        </div>
                        {img.prompt.length > 50 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent click from bubbling to parent elements
                              setExpandedPrompt(expandedPrompt === index ? null : index);
                            }}
                            className="text-xs text-purple-300 hover:text-white mt-1"
                          >
                            {expandedPrompt === index ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-300">Created: {formatTimestamp(img.timestamp)}</p>
                      <p className="text-xs text-purple-300">Model: {img.model ? modelDisplayNames[img.model as GenerationModel] || img.model : 'Unknown'}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent click from bubbling
                              copyPromptToClipboard(img.prompt);
                            }}
                            className="text-xs bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 rounded flex items-center gap-1"
                            title="Copy prompt to clipboard"
                          >
                            <Copy size={12} />
                            Copy
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent click from bubbling
                              handleDownload(img.url, img.prompt);
                            }}
                            className="text-xs bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Download size={12} />
                            Download
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-300">Click to add to panel</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 