import React, { useState, useCallback } from 'react';
import { videoService } from '../../services/videoService';
import { runwayService } from '../../services/runwayService';
import { Upload, Film, X } from 'lucide-react';
import { Panel } from '../../types';
import { nanoid } from 'nanoid';
import { useComicStore } from '../../store/useComicStore';
import { minimaxVideoService } from '../../services/minimaxVideoService';
import { textToVideoService, VideoModel } from '../../services/textToVideoService'; // Use the shared VideoModel
import { klingService } from '../../services/klingService'; // Import the new Kling service

interface ImageToVideoProps {
  onGenerateStory: (prompt: string, generatedUrl: string, type: 'image' | 'video' | 'gif', panel?: Panel) => Promise<void>;
}

// Define the available models
const imageToVideoModels: { value: string; label: string; icon?: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { value: 'hailuo-02-pro', label: 'Hailuo 02 Pro' },
  { value: 'kling-2.1-pro', label: 'Kling 2.1 Pro' },
  { value: 'seedance', label: 'Seedance' },
  { value: 'vidu-image', label: 'Vidu Image' },
  { value: 'runway', label: 'Runway Gen-4' },
  { value: 'veo3-image', label: 'Veo 3 Image' },
];

// Model display information
const modelInfo = {
  'hailuo-02-pro': {
    name: 'Hailuo 02 Pro',
    description: '1080p Image Animation'
  },
  'vidu-image': {
    name: 'Vidu Image',
    description: 'High Quality Motion'
  },
  'kling-2.1-pro': {
    name: 'Kling 2.1 Pro',
    description: 'Advanced Image to Video'
  },
  'veo3-image': {
    name: 'Veo 3 Image',
    description: '720p Premium Animation'
  },
  'fal-veo2': {
    name: 'Veo 2',
    description: 'High Quality Motion'
  },
  'fal-kling2': {
    name: 'Kling 2.0',
    description: 'Enhanced Consistency'
  },
  seedance: {
    name: 'Seedance',
    description: 'Fast, efficient image-to-video'
  },
  runway: {
    name: 'Runway Gen-4',
    description: 'Premium Quality Animation'
  }
};

export const ImageToVideo: React.FC<ImageToVideoProps> = ({ onGenerateStory }) => {
  const { currentComic, currentPageIndex, updatePanel } = useComicStore();
  const [image, setImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // Add state for the selected model, default to minimax
  const [selectedModel, setSelectedModel] = useState<string>(imageToVideoModels[0].value);
  // Add state for Seedance options
  const [seedanceDuration, setSeedanceDuration] = useState<'5' | '10'>('5');
  const [seedanceResolution, setSeedanceResolution] = useState<'480p' | '720p'>('720p');
  const [seedanceCameraFixed, setSeedanceCameraFixed] = useState(false);
  const [viduMovement, setViduMovement] = useState<'auto' | 'small' | 'medium' | 'large'>('auto');

  const pollForCompletion = async (statusPath: string, requestId: string) => {
    // Increase timeout for slower models like Vidu
    const maxPolls = statusPath.includes('vidu') ? 120 : 60; // 10 minutes for Vidu, 5 minutes for others
    const pollInterval = 5000; // 5 seconds
    
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const statusResponse = await fetch(`/api/${statusPath}?requestId=${requestId}`);
        
        // Check if response is HTML (indicating 404/500 error)
        const contentType = statusResponse.headers.get('content-type');
        if (!statusResponse.ok || !contentType?.includes('application/json')) {
          console.error(`[ImageToVideo] ${statusPath} status endpoint error:`, {
            status: statusResponse.status,
            statusText: statusResponse.statusText,
            contentType
          });
          throw new Error(`Status endpoint error: ${statusResponse.status} ${statusResponse.statusText}`);
        }

        const statusData = await statusResponse.json();
        console.log(`[ImageToVideo] ${statusPath} status response:`, statusData);

        if (statusData.status === 'COMPLETED') {
          // More robust URL extraction
          const findVideoUrl = (obj: any): string | null => {
            if (!obj || typeof obj !== 'object') return null;
            for (const key in obj) {
              if (typeof obj[key] === 'string' && obj[key].includes('http') && (obj[key].endsWith('.mp4') || obj[key].endsWith('.webm'))) {
                return obj[key];
              }
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                const nestedUrl = findVideoUrl(obj[key]);
                if (nestedUrl) return nestedUrl;
              }
            }
            return null;
          };

          const videoUrl = findVideoUrl(statusData.result);
          if (!videoUrl) {
            console.error(`[ImageToVideo] No video URL found in response for ${statusPath}:`, statusData.result);
            console.error(`[ImageToVideo] Full status data for debugging:`, JSON.stringify(statusData, null, 2));
            throw new Error('No video URL in completed job response');
          }
          
          console.log(`📥 Received video URL from ${statusPath}:`, videoUrl);
          return videoUrl;
        } else if (statusData.status === 'ERROR' || statusData.status === 'FAILED') {
          throw new Error(`Video generation failed: ${statusData.error || statusData.message || 'Unknown error'}`);
        }
        
        console.log(`Processing... Status: ${statusData.status} (${i + 1}/${maxPolls})`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Status endpoint error')) {
          throw error; // Re-throw endpoint errors immediately
        }
        console.warn(`[ImageToVideo] Polling attempt ${i + 1} failed:`, error);
      }
    }
    
    const timeoutMinutes = statusPath.includes('vidu') ? 10 : 5;
    throw new Error(`Video generation timed out after ${timeoutMinutes} minutes.`);
  };

  const handleGenerate = async () => {
    if (!image) {
      setError('Please select an image');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setVideoUrl(null);

    try {
      // Upload image to Cloudinary
      const imageUrl = await videoService.uploadImage(image);
      console.log('Image uploaded:', imageUrl);

      console.log(`Generating video with model: ${selectedModel}`);

      let result: { videoUrl?: string; error?: string };

      // Handle new async models with polling
      if (['hailuo-02-pro', 'vidu-image', 'kling-2.1-pro', 'veo3-image'].includes(selectedModel)) {
        const apiPathMap = {
          'hailuo-02-pro': 'minimax/image',
          'vidu-image': 'vidu/image-to-video',
          'kling-2.1-pro': 'kling/image-to-video',
          'veo3-image': 'veo3/image-to-video'
        };
        const statusPathMap = {
          'hailuo-02-pro': 'minimax/image-status',
          'vidu-image': 'vidu/image-status',
          'kling-2.1-pro': 'kling/image-status',
          'veo3-image': 'veo3/image-status'
        };
        
        const apiModel = apiPathMap[selectedModel];
        const statusPath = statusPathMap[selectedModel];
        
        // Prepare request body based on model
        const requestBody: any = {
          prompt,
          image_url: imageUrl,
        };
        
        // Add model-specific parameters
        if (selectedModel === 'vidu-image') {
          requestBody.movement_amplitude = viduMovement;
        }
        if (selectedModel === 'kling-2.1-pro') {
          requestBody.duration = seedanceDuration;
          requestBody.cfg_scale = 0.5; // Default CFG scale as per Kling 2.1 API spec
        }

        const submitResponse = await fetch(`/api/${apiModel}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (submitResponse.status !== 202) {
          const errorData = await submitResponse.json();
          throw new Error(errorData.error || 'Failed to submit video generation job');
        }

        const { request_id } = await submitResponse.json();
        const videoUrl = await pollForCompletion(statusPath, request_id);
        result = { videoUrl };
      }
      // Handle Runway model with its own polling system
      else if (selectedModel === 'runway') {
        const videoUrl = await runwayService.convertPanelToVideo({
          imageUrl,
          prompt,
          duration: 5,
          ratio: '1280:720'
        });
        result = { videoUrl };
      }
      // Handle Seedance model
      else if (selectedModel === 'seedance') {
        result = await videoService.generateSeedanceImageToVideo({
          imageUrl,
          prompt,
          duration: seedanceDuration,
          resolution: seedanceResolution,
          cameraFixed: seedanceCameraFixed
        });
      }
      // Handle legacy FAL models (if still needed)
      else if (selectedModel === 'fal-veo2') {
        result = await videoService.generateFalVeo2Video({ 
          imageUrl, 
          prompt 
        }); 
      } else if (selectedModel === 'fal-kling2') {
        result = await videoService.generateFalKling2Video({ 
          imageUrl, 
          prompt 
        });
      }
      else {
        throw new Error(`Unsupported model selected: ${selectedModel}`);
      }

      if (result.videoUrl) {
        setVideoUrl(result.videoUrl);
      } else {
        throw new Error(result.error || 'No video URL in response');
      }
    } catch (err) {
      console.error('Video generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
    }
  }, []);

  const handleVideoClick = () => {
    // Add checks for currentComic and pages
    if (!videoUrl || typeof currentPageIndex === 'undefined' || !currentComic) {
        console.error("Cannot add video: Invalid comic state.");
        return;
    }
    
    // Access pages only after confirming currentComic exists
    if (!currentComic.pages || !Array.isArray(currentComic.pages[currentPageIndex])) {
        console.error("Cannot add video: Invalid page state.");
        return;
    }

    const pages = currentComic.pages[currentPageIndex];
    
    const emptyPanelIndex = pages.findIndex(panel => !panel || !panel.url);
    
    if (emptyPanelIndex !== -1) {
      const panel: Panel = { // Explicitly type panel
        id: nanoid(),
        type: 'video' as const,
        url: videoUrl,
        size: 'medium' as const, // Fix type error
        aspectRatio: 1,
        position: { row: 0, col: 0, rowSpan: 1, colSpan: 1 } // Use row/col instead of x/y
      };
      updatePanel(panel, currentPageIndex);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLVideoElement>) => {
    if (!videoUrl) return;

    const panel: Panel = {
      id: nanoid(),
      type: 'video' as const,
      url: videoUrl,
      size: 'medium' as const,
      aspectRatio: 1,
      position: { row: 0, col: 0, rowSpan: 1, colSpan: 1 }
    };

    e.dataTransfer.setData('application/json', JSON.stringify(panel));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      {/* Remove the entire header with "Image to Video" text and icon */}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">Select Model</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imageToVideoModels.map((modelOption) => {
            // Get info for the current model value, provide default if not found
            const info = modelInfo[modelOption.value as keyof typeof modelInfo] || {
              name: modelOption.label,
              description: 'N/A'
            };
            
            const isSelected = selectedModel === modelOption.value;
            
            return (
              <button
                key={modelOption.value}
                onClick={() => setSelectedModel(modelOption.value)}
                className={`p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : 'bg-gray-700 border-gray-600 hover:border-gray-500 text-gray-300'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {info.name}
                  </span>
                  <span className={`text-xs mt-1 ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                    {info.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="mb-4">
        <div 
          className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {image ? (
            <div className="relative">
              <img
                src={URL.createObjectURL(image)}
                alt="Uploaded"
                className="max-w-full h-auto mx-auto"
              />
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setImage(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="py-8">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-input"
              />
              <label htmlFor="image-input" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-400">
                  Drop or click to upload image
                </p>
              </label>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt (optional)..."
          className="w-full p-2 border rounded-md resize-none focus:ring-2 focus:ring-purple-500 text-white bg-gray-700 border-gray-600 placeholder-gray-400"
          rows={4}
        />
          {/* Character count display for models with limits */}
          {(selectedModel === 'hailuo-02-pro' || selectedModel === 'vidu-image') && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
              {prompt.length}/{selectedModel === 'hailuo-02-pro' ? '2000' : '1500'}
            </div>
          )}
        </div>
        {/* Warning message if prompt is too long */}
        {selectedModel === 'hailuo-02-pro' && prompt.length > 2000 && (
          <div className="text-red-500 text-xs mt-1">
            Prompt too long. Hailuo accepts maximum 2000 characters.
          </div>
        )}
        {selectedModel === 'vidu-image' && prompt.length > 1500 && (
          <div className="text-red-500 text-xs mt-1">
            Prompt too long. Vidu accepts maximum 1500 characters.
          </div>
        )}
      </div>
      
      <button
        onClick={handleGenerate}
        disabled={
          isGenerating || 
          (selectedModel === 'hailuo-02-pro' && prompt.length > 2000) ||
          (selectedModel === 'vidu-image' && prompt.length > 1500)
        }
        className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating Video...' : 'Generate Video'}
      </button>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {isGenerating && !error && (
        <div className="text-gray-400 text-sm text-center animate-pulse">
          Video generation is in progress. Please wait 3-5 minutes for the best results.
        </div>
      )}

      {videoUrl && (
        <div className="video-output mt-4 relative">
          <button 
            onClick={() => setVideoUrl(null)} 
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md z-10 hover:bg-red-600 transition-colors"
            title="Remove video"
            aria-label="Remove video"
          >
            <X size={14} />
          </button>
          <video 
            src={videoUrl} 
            controls 
            autoPlay
            loop
            muted
            draggable="true"
            onClick={handleVideoClick}
            onDragStart={handleDragStart}
            className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
          <p className="text-sm text-gray-400 mt-2">
            Click to add to first empty panel, or drag to any panel
          </p>
        </div>
      )}

      {/* Seedance-specific options */}
      {selectedModel === 'seedance' && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Duration</label>
            <select
              value={seedanceDuration}
              onChange={e => setSeedanceDuration(e.target.value as '5' | '10')}
              className="w-full p-2 border rounded-md text-white bg-gray-700 border-gray-600"
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Resolution</label>
            <select
              value={seedanceResolution}
              onChange={e => setSeedanceResolution(e.target.value as '480p' | '720p')}
              className="w-full p-2 border rounded-md text-white bg-gray-700 border-gray-600"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
            </select>
          </div>
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              checked={seedanceCameraFixed}
              onChange={e => setSeedanceCameraFixed(e.target.checked)}
              className="form-checkbox h-4 w-4 text-teal-600 mr-2"
              id="seedance-camera-fixed"
            />
            <label htmlFor="seedance-camera-fixed" className="text-sm text-gray-300">Fixed Camera</label>
          </div>
        </div>
      )}

      {/* Vidu-specific options */}
      {selectedModel === 'vidu-image' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Movement Amplitude</label>
          <select
            value={viduMovement}
            onChange={e => setViduMovement(e.target.value as any)}
            className="w-full p-2 border rounded-md text-white bg-gray-700 border-gray-600"
          >
            <option value="auto">Auto</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      )}
    </div>
  );
}; 