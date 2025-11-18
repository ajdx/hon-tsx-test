import dotenv from 'dotenv';
import path from 'path';
import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { fal } from '@fal-ai/client';
import { LumaAI } from 'lumaai';
import type { ParamsDictionary } from 'express-serve-static-core';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import { Blob } from 'buffer';
import fetch from 'node-fetch';

// Import Hume API router
import humeApiRouter from './humeApi';

// For ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// DEBUG: Check if Hume keys are loaded immediately after dotenv.config
console.log('[DEBUG api.ts] Hume Keys Loaded:', {
  apiKeyExists: !!process.env.HUME_API_KEY,
  secretKeyExists: !!process.env.HUME_SECRET_KEY
});

const app = express();
const router = Router();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.vercel\.app$/, /localhost/] 
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(fileUpload());

// Mount Hume API routes
app.use('/api', humeApiRouter);

// Configure FAL client
fal.config({
  credentials: process.env.FAL_API_KEY
});

interface EditRequest {
  prompt: string;
  imageUrl: string;
}

interface LumaRequest {
  prompt?: string;
  referenceImage?: string;
  type?: string;
  mode?: string;
  quality?: 'standard' | 'high';
  // Enhanced Luma API parameters
  operation_type?: 'text_to_video' | 'image_to_video' | 'extend_video' | 'reverse_extend' | 'interpolate';
  model?: 'ray-2' | 'ray-flash-2' | 'ray-1-6';
  resolution?: '540p' | '720p' | '1080p' | '4k';
  duration?: '3s' | '5s' | '8s';
  aspect_ratio?: '16:9' | '1:1' | '9:16';
  loop?: boolean;
  start_image_url?: string;
  end_image_url?: string;
  reference_video_id?: string;
  camera_motion?: string;
  concepts?: string[];
  motion_intensity?: 'low' | 'medium' | 'high';
  style_prompt?: string;
  negative_prompt?: string;
  enhance_prompt?: boolean;
  webhook_url?: string;
  target_element_id?: string;
}

console.log('Environment variables:', {
  LUMAAI_API_KEY_EXISTS: !!process.env.LUMAAI_API_KEY,
  LUMAAI_API_KEY_LENGTH: process.env.LUMAAI_API_KEY?.length,
  NODE_ENV: process.env.NODE_ENV
});

// Add timestamp to logs
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? data : '');
};

// @ts-ignore - Express route handler return type
router.post<ParamsDictionary, any, EditRequest>('/ai/edit', async (req, res) => {
  try {
    const { prompt, imageUrl } = req.body;

    if (!prompt || !imageUrl) {
      return res.status(400).json({ error: 'Missing prompt or image URL' });
    }

    console.log('Editing image with prompt:', prompt);

    const result = await fal.subscribe('fal-ai/ip-adapter-plus-face', {
      input: {
        prompt,
        image: imageUrl,
        negative_prompt: 'blurry, bad quality, distorted',
        num_inference_steps: 30,
        guidance_scale: 7.5,
        seed: 42
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('Edit progress:', update.logs?.map(log => log.message));
        }
      },
    });

    console.log('Edit completed:', result);

    if (!result.data?.images?.[0]?.url) {
      throw new Error('No image URL in response');
    }

    return res.json({ url: result.data.images[0].url });
  } catch (error) {
    console.error('Flux API error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
});

// Enhanced Luma generation endpoint supporting all capabilities
const lumaGenerateHandler = async (req: Request<ParamsDictionary, any, LumaRequest>, res: Response) => {
  try {
    const { 
      prompt, 
      referenceImage, 
      type = 'video', 
      mode = 'text-to-video',
      operation_type = 'text_to_video',
      model = 'ray-2',
      resolution = '720p',
      duration = '5s',
      aspect_ratio = '16:9',
      loop = false,
      start_image_url,
      end_image_url,
      reference_video_id,
      camera_motion,
      concepts = [],
      motion_intensity = 'medium',
      style_prompt,
      negative_prompt,
      enhance_prompt = false,
      webhook_url,
      target_element_id  // Add target_element_id support
    } = req.body;
    
    log('LUMAAI_API_KEY check:', !!process.env.LUMAAI_API_KEY);
    log('Enhanced API Request received:', {
      prompt: prompt ? prompt.substring(0, 100) + '...' : 'none',
      operation_type,
      target_element_id,
      hasStartImage: !!start_image_url,
      hasReferenceImage: !!referenceImage
    });

    if (!process.env.LUMAAI_API_KEY) {
      throw new Error('LUMAAI_API_KEY environment variable is required');
    }

    // Enhanced panel reference detection for natural language
    let detectedPanelId = target_element_id;
    let detectedImageUrl = start_image_url || referenceImage;
    let finalOperationType = operation_type;

    console.log(`Analyzing prompt for panel references: "${prompt}"`);
    
    // Parse panel references from natural language
    if (prompt && !detectedPanelId) {
      const panelMatches = [
        { regex: /(?:panel\s+|the\s+)(\d+)(?:st|nd|rd|th)?(?:\s+panel)?/i, group: 1 },
        { regex: /(?:first|1st)\s+panel/i, value: '0' },  // Fix: first panel = index 0
        { regex: /(?:second|2nd)\s+panel/i, value: '1' }, // Fix: second panel = index 1  
        { regex: /(?:third|3rd)\s+panel/i, value: '2' },  // Fix: third panel = index 2
        { regex: /(?:fourth|4th)\s+panel/i, value: '3' }, // Fix: fourth panel = index 3
        { regex: /(?:this|current)\s+panel/i, value: 'current' }
      ];

      for (const match of panelMatches) {
        const result = prompt.match(match.regex);
        if (result) {
          let panelNumber = match.value || result[match.group || 1];
          console.log(`Panel reference detected: "${result[0]}" -> panel ${panelNumber}`);
          
          // Convert 1-based user language to 0-based indexing for numeric references
          // e.g., "panel 1" should become "panel-0", "panel 2" should become "panel-1"
          if (panelNumber !== 'current' && !match.value) {
            // This is a numeric capture from the regex, convert from 1-based to 0-based
            const numericPanel = parseInt(panelNumber, 10);
            if (!isNaN(numericPanel) && numericPanel > 0) {
              panelNumber = (numericPanel - 1).toString();
              console.log(`Converted 1-based numeric reference to 0-based: ${numericPanel} -> ${panelNumber}`);
            }
          }
          
          // Convert panel number to actual panel ID
          if (panelNumber !== 'current') {
            detectedPanelId = `panel-${panelNumber}`;
            console.log(`Panel reference resolved: panel ${panelNumber} -> ${detectedPanelId}`);
          }
          break;
        }
      }
    }

    // Enhanced image-to-video detection
    if (prompt && !detectedImageUrl) {
      const imageToVideoKeywords = [
        'turn this image into',
        'convert this image to',
        'turn the image in',
        'animate this image',
        'make this image move',
        'turn panel',
        'animate panel',
        'convert panel'
      ];

      const hasImageToVideoKeyword = imageToVideoKeywords.some(keyword => 
        prompt.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasImageToVideoKeyword) {
        console.log(`Image-to-video keywords detected in prompt: "${prompt}"`);
        finalOperationType = 'image_to_video';
        
        // If we detected a panel but no image URL, we need to get it from the comic store
        // For now, log that we need the image URL
        if (detectedPanelId && !detectedImageUrl) {
          console.log(`Need to fetch image URL for panel: ${detectedPanelId}`);
          // In a real implementation, we'd query the comic store here
          // For now, we'll rely on the frontend to provide the image URL
        }
      }
    }

    log('Enhanced detection results:', {
      detectedPanelId,
      detectedImageUrl: detectedImageUrl ? detectedImageUrl.substring(0, 50) + '...' : 'none',
      finalOperationType,
      promptAnalysis: prompt ? 'analyzed' : 'none'
    });

    // If no specific panel detected and it's text-to-video, find an empty panel
    if (!detectedPanelId && finalOperationType === 'text_to_video') {
      console.log('Text-to-video with no specific panel - finding next available empty panel');
      
      // Since we're on the server, we can't access useComicStore directly
      // We'll need to handle this on the client side in the polling system
      // For now, we'll pass a special flag to indicate "find empty panel"
      detectedPanelId = 'AUTO_FIND_EMPTY';
    }

    // Set up the base video config
    let videoConfig: any = {
      prompt: prompt || 'Generate a video',
      aspect_ratio,
      loop,
      ...(model && { model }),
      ...(resolution && { resolution }),
      ...(duration && { duration }),
      ...(camera_motion && { camera_motion }),
      ...(motion_intensity && { motion_intensity }),
      ...(style_prompt && { style_prompt }),
      ...(negative_prompt && { negative_prompt }),
      ...(enhance_prompt && { enhance_prompt }),
      ...(webhook_url && { webhook_url })
    };

    // Handle different operation types with enhanced logic
    switch (finalOperationType) {
      case 'image_to_video':
        if (!detectedImageUrl) {
          throw new Error('Image URL is required for image-to-video generation');
        }
        videoConfig = {
          ...videoConfig,
          keyframes: {
            frame0: {
              type: "image",
              url: detectedImageUrl
            },
            ...(end_image_url && {
              frame1: {
                type: "image", 
                url: end_image_url
              }
            })
          }
        };
        console.log('Configured for image-to-video with keyframes');
        break;

      case 'video_to_video':
        if (!reference_video_id) {
          throw new Error('Reference video ID is required for video-to-video generation');
        }
        videoConfig = {
          ...videoConfig,
          keyframes: {
            frame0: {
              type: "generation",
              id: reference_video_id
            }
          }
        };
        break;

      default: // text_to_video
        // No additional config needed for text-to-video
        break;
    }

    log('Final video config:', {
      ...videoConfig,
      keyframes: videoConfig.keyframes ? 'configured' : null
    });

    // Use REST API for maximum compatibility with all features
    const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LUMAAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(videoConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('Luma API error response:', errorText);
      throw new Error(`Luma API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    log('Luma API success:', {
      id: result.id,
      state: result.state,
      video_url: result.video ? result.video.url : 'not ready'
    });

    // Enhanced response with panel update information
    const enhancedResult = {
      ...result,
      // Add metadata for client-side panel updates
      panel_update_info: detectedPanelId ? {
        target_panel_id: detectedPanelId,
        operation_type: finalOperationType,
        should_update_panel: true
      } : null
    };

    log('Enhanced result with panel info:', {
      id: enhancedResult.id,
      panel_update_info: enhancedResult.panel_update_info
    });

    res.json(enhancedResult);

    // Panel updates will be handled client-side via comic store
    // when the polling system detects video completion

  } catch (error) {
    log('Luma generation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
};

// @ts-ignore - Express route handler type issues
router.post('/luma/generate', lumaGenerateHandler);

// @ts-ignore - Express route handler return type
router.get('/health', (_req, res) => {
  return res.json({ status: 'ok' });
});

// Cloudinary upload proxy to help with CORS issues
app.post('/cloudinary-upload', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({ error: 'No files were uploaded' });
      return;
    }

    // Handle single or multiple files (assuming we expect one named 'file')
    let uploadedFile: fileUpload.UploadedFile;
    if (Array.isArray(req.files.file)) {
      uploadedFile = req.files.file[0];
    } else {
      uploadedFile = req.files.file;
    }

    if (!uploadedFile) {
      res.status(400).json({ error: "No file found with the name 'file'." });
      return;
    }

    const preset = req.body.preset || 'ml_default';
    const cloudName = req.body.cloudName || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    
    // Use server-side API key (secure)
    const apiKey = process.env.CLOUDINARY_API_KEY;

    if (!cloudName) {
      res.status(400).json({ error: 'Missing cloudName parameter' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({ error: 'Server configuration error: Cloudinary API key not configured' });
      return;
    }

    // Set up form data for Cloudinary
    const formData = new FormData();
    const fileBlob = new Blob([uploadedFile.data], { type: uploadedFile.mimetype });
    formData.append('file', fileBlob, uploadedFile.name);
    formData.append('upload_preset', preset);
    formData.append('api_key', apiKey);

    // Make request to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    // Pass through the response
    const data = await response.json() as Record<string, any>;
    
    if (response.ok) {
      res.json({ url: data.secure_url });
    } else {
      res.status(response.status).json({ error: data.error?.message || 'Upload failed' });
    }
  } catch (error) {
    console.error('Error in Cloudinary proxy:', error);
    res.status(500).json({ error: 'Server error processing upload' });
  }
});

// Add GPT-Image-1 related interfaces
interface GptTextToImageRequest {
  prompt: string;
  options?: {
    image_size?: 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
    quality?: 'auto' | 'low' | 'medium' | 'high';
    background?: 'auto' | 'transparent' | 'opaque';
    num_images?: number;
  };
}

interface GptImageEditRequest {
  prompt: string;
  imageUrl: string;
  options?: {
    image_size?: 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
    quality?: 'auto' | 'low' | 'medium' | 'high';
    num_images?: number;
  };
}

// GPT Text-to-Image endpoint
// @ts-ignore - Express route handler return type
router.post<ParamsDictionary, any, GptTextToImageRequest>('/gpt/text-to-image', async (req, res) => {
  const { prompt, options = {} } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing required parameter: prompt is required' });
  }

  try {
    const openAIApiKey = process.env.OPENAI_API_KEY;
    
    if (!openAIApiKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing OpenAI API key' });
    }

    log(`Processing GPT-Image-1 text-to-image: "${prompt}"`);

    const result = await fal.subscribe('fal-ai/gpt-image-1/text-to-image/byok', {
      input: {
        prompt,
        openai_api_key: openAIApiKey,
        image_size: options.image_size || 'auto',
        quality: options.quality || 'auto',
        background: options.background || 'auto',
        num_images: options.num_images || 1
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          log('GPT-Image-1 text-to-image progress:', update.logs?.map(log => log.message));
        }
      },
    });

    log('GPT-Image-1 text-to-image completed:', result);

    if (!result?.data?.images?.[0]?.url) {
      console.error('Unexpected response format from GPT-Image-1:', result);
      return res.status(500).json({ error: 'Invalid response format from image service' });
    }

    const generatedUrl = result.data.images[0].url;
    log(`GPT-Image-1 text-to-image successful. Result: ${generatedUrl}`);
    
    return res.status(200).json({ url: generatedUrl });

  } catch (error) {
    console.error('Error processing GPT-Image-1 text-to-image:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// GPT Image Edit endpoint
// @ts-ignore - Express route handler return type
router.post<ParamsDictionary, any, GptImageEditRequest>('/gpt/edit-image', async (req, res) => {
  const { prompt, imageUrl, options = {} } = req.body;

  if (!prompt || !imageUrl) {
    return res.status(400).json({ error: 'Missing required parameters: prompt and imageUrl are required' });
  }

  try {
    const openAIApiKey = process.env.OPENAI_API_KEY;
    
    if (!openAIApiKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing OpenAI API key' });
    }

    log(`Processing GPT-Image-1 image edit: "${prompt}" for image ${imageUrl.substring(0, 30)}...`);

    const result = await fal.subscribe('fal-ai/gpt-image-1/edit-image/byok', {
      input: {
        image_urls: [imageUrl],
        prompt,
        openai_api_key: openAIApiKey,
        image_size: options.image_size || 'auto',
        quality: options.quality || 'auto',
        num_images: options.num_images || 1
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          log('GPT-Image-1 edit progress:', update.logs?.map(log => log.message));
        }
      },
    });

    log('GPT-Image-1 edit completed:', result);

    if (!result?.data?.images?.[0]?.url) {
      console.error('Unexpected response format from GPT-Image-1:', result);
      return res.status(500).json({ error: 'Invalid response format from image service' });
    }

    const editedImageUrl = result.data.images[0].url;
    log(`GPT-Image-1 edit successful. Result: ${editedImageUrl}`);
    
    return res.status(200).json({ editedImageUrl });

  } catch (error) {
    console.error('Error processing GPT-Image-1 edit:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Add Moondream2 image captioning endpoint 
// @ts-ignore - Express route handler return type
router.post('/fal/moondream', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing imageUrl parameter' });
    }

    // Simple memory cache for faster responses and to reduce API calls
    // In a production environment, you'd use Redis or another proper caching solution
    const CAPTION_CACHE = globalThis.CAPTION_CACHE || (globalThis.CAPTION_CACHE = new Map());
    const cacheKey = imageUrl;
    
    // Check cache first
    if (CAPTION_CACHE.has(cacheKey)) {
      const cachedResult = CAPTION_CACHE.get(cacheKey);
      log('🔍 Retrieved caption from cache for:', imageUrl.substring(0, 30) + '...');
      return res.json(cachedResult);
    }

    log('🔄 Caption request for image:', imageUrl.substring(0, 30) + '...');

    const result = await fal.subscribe("fal-ai/moondream2", {
      input: {
        image_url: imageUrl,
        response_format: "json" // Request JSON formatting for structured data
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          log('🔄 Moondream caption progress:', update.logs?.map(log => log.message));
        }
      },
    });

    log('✅ Moondream caption completed:', result);

    if (!result.data) {
      throw new Error('No data in Moondream response');
    }

    // Extract caption from result.data.output or result.data directly
    const caption = result.data.output || 
                    (typeof result.data === 'string' ? result.data : null);
    
    if (!caption) {
      throw new Error('No valid caption in Moondream response');
    }

    // Build response with success flag
    const response = { 
      success: true,
      caption,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    CAPTION_CACHE.set(cacheKey, response);
    log('💾 Cached caption for:', imageUrl.substring(0, 30) + '...');

    return res.json(response);
  } catch (error) {
    console.error('❌ Moondream API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      caption: null
    });
  }
});

// Add Video Understanding endpoint 
// @ts-ignore - Express route handler return type
router.post('/fal/video-understanding', async (req, res) => {
  try {
    const { videoUrl, prompt } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl parameter' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt parameter' });
    }

    // Simple memory cache for faster responses and to reduce API calls
    const VIDEO_ANALYSIS_CACHE = globalThis.VIDEO_ANALYSIS_CACHE || (globalThis.VIDEO_ANALYSIS_CACHE = new Map());
    const cacheKey = `${videoUrl}_${prompt}`;
    
    // Check cache first
    if (VIDEO_ANALYSIS_CACHE.has(cacheKey)) {
      const cachedResult = VIDEO_ANALYSIS_CACHE.get(cacheKey);
      log('🔍 Retrieved video analysis from cache for:', videoUrl.substring(0, 30) + '...');
      return res.json(cachedResult);
    }

    log('🔄 Video analysis request for:', videoUrl.substring(0, 30) + '...', 'with prompt:', prompt);

    const result = await fal.subscribe("fal-ai/video-understanding", {
      input: {
        video_url: videoUrl,
        prompt: prompt,
        detailed_analysis: true // Always request detailed analysis
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          log('🔄 Video understanding progress:', update.logs?.map(log => log.message));
        }
      },
    });

    log('✅ Video understanding completed:', result);

    if (!result.data) {
      throw new Error('No data in video understanding response');
    }

    // Extract analysis from result.data.output
    const analysis = result.data.output;
    
    if (!analysis) {
      throw new Error('No valid analysis in video understanding response');
    }

    // Build response with success flag
    const response = { 
      success: true,
      analysis,
      videoUrl,
      prompt,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    VIDEO_ANALYSIS_CACHE.set(cacheKey, response);
    log('💾 Cached video analysis for:', videoUrl.substring(0, 30) + '...');

    return res.json(response);
  } catch (error) {
    console.error('❌ Video understanding API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      analysis: null
    });
  }
});

// Status check endpoint for polling video completion
const lumaStatusHandler = async (req: Request<{id: string}>, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Generation ID is required' });
    }

    if (!process.env.LUMAAI_API_KEY) {
      throw new Error('LUMAAI_API_KEY environment variable is required');
    }

    log(`Checking status for generation: ${id}`);

    // Check status via Luma API
    const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.LUMAAI_API_KEY}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('Luma status API error:', errorText);
      throw new Error(`Luma status API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    log('Luma status result:', {
      id: result.id,
      state: result.state,
      hasVideo: !!result.video?.url
    });

    res.json(result);

  } catch (error) {
    log('Status check error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Status check failed' 
    });
  }
};

// Hunyuan 3D generation endpoint
interface Hunyuan3DRequest {
  inputImageUrl: string;
  options?: {
    seed?: number;
    numInferenceSteps?: number;
    guidanceScale?: number;
    octreeResolution?: number;
    texturedMesh?: boolean;
  };
}

const hunyuan3dHandler = async (req: Request<ParamsDictionary, any, Hunyuan3DRequest>, res: Response) => {
  try {
    const { inputImageUrl, options = {} } = req.body;

    // Validate inputs
    if (!inputImageUrl) {
      return res.status(400).json({ error: 'Input image URL is required' });
    }

    // Check FAL API key
    if (!process.env.FAL_API_KEY) {
      console.error('FAL_API_KEY environment variable not set');
      return res.status(500).json({ error: 'Service configuration error' });
    }

    log('Starting Hunyuan 3D generation:', { inputImageUrl: inputImageUrl.substring(0, 50) + '...', options });

    const result = await fal.subscribe("fal-ai/hunyuan3d-v21", {
      input: {
        input_image_url: inputImageUrl,
        ...(options.seed !== undefined && { seed: options.seed }),
        ...(options.numInferenceSteps !== undefined && { num_inference_steps: options.numInferenceSteps }),
        ...(options.guidanceScale !== undefined && { guidance_scale: options.guidanceScale }),
        ...(options.octreeResolution !== undefined && { octree_resolution: options.octreeResolution }),
        ...(options.texturedMesh !== undefined && { textured_mesh: options.texturedMesh }),
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          log('Hunyuan 3D generation progress:', update.logs?.map(log => log.message));
        }
      },
    });

    if (!result.data?.model_glb?.url) {
      throw new Error('No GLB model URL in response');
    }

    const responseData = {
      success: true,
      modelGlbUrl: result.data.model_glb.url,
      modelMeshUrl: result.data.model_mesh?.url,
      seed: result.data.seed
    };

    log('Hunyuan 3D generation completed successfully:', { modelGlbUrl: responseData.modelGlbUrl });
    return res.status(200).json(responseData);

  } catch (error) {
    log('Hunyuan 3D API error:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to generate 3D model. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        errorMessage = 'Too many requests to the AI service. Please try again later.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Access denied. Service configuration error.';
      } else if (error.message.includes('413')) {
        errorMessage = 'Image file is too large. Please use a smaller image.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid request. The AI service could not process the image. Try a different image.';
      } else if (error.message.includes('500')) {
        errorMessage = 'AI service error. Please try again later.';
      }
    }
    
    return res.status(500).json({ error: errorMessage });
  }
};

// Legacy endpoint for backwards compatibility - supports both flux-dev and gpt-image-1
// @ts-ignore - Express route handler return type
router.post<ParamsDictionary, any, { prompt: string; model: string; }>('/fal/generate', async (req, res) => {
  const { prompt, model } = req.body;

  if (!prompt || !model) {
    return res.status(400).json({ error: 'Missing required parameters: prompt and model are required' });
  }

  // Define allowed Fal models
  const allowedModels = [
    "fal-ai/luma-upscaler",
    "fal-ai/moondream2",
    "fal-ai/fast-sdxl",
    "fal-ai/luma-lora-creator",
    "fal-ai/kling-video/v2.1/master/text-to-video",
    "fal-ai/kling-video/v2.1/pro/image-to-video"
  ];

  // Check if the requested model is in the allowed list
  if (!allowedModels.includes(model)) {
    return res.status(400).json({ error: `Model '${model}' not supported by this generation endpoint.` });
  }

  try {
    log(`Processing ${model} generation: "${prompt}"...`);

    let result;
    
    if (model === 'flux-dev') {
      // Use Flux-1 Dev for generation
      const falModelId = "fal-ai/flux-1/dev";
      
      log(`Making request to ${falModelId}`);

      result = await fal.subscribe("fal-ai/flux-1/dev", {
        input: {
          prompt: prompt,
          image_size: 'landscape_4_3',
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true,
          output_format: 'jpeg'
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            log(`${model} generation progress:`, update.logs?.map(log => log.message));
          }
        },
      });
    } else {
      // Use GPT-Image-1 with proper BYOK implementation
      const openAIApiKey = process.env.OPENAI_API_KEY;
      
      if (!openAIApiKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing OpenAI API key' });
      }

      result = await fal.subscribe("fal-ai/gpt-image-1/text-to-image/byok", {
        input: {
          prompt: prompt,
          openai_api_key: openAIApiKey,
          image_size: 'auto',
          quality: 'auto', 
          background: 'auto',
          num_images: 1
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            log(`${model} generation progress:`, update.logs?.map(log => log.message));
          }
        },
      });
    }

    log(`${model} generation completed:`, result);

    // fal.subscribe() returns data wrapped in result.data
    if (!result?.data?.images?.[0]?.url) { 
      console.error(`Unexpected response format from ${model}:`, result);
      return res.status(500).json({ error: 'Invalid response format from image service' });
    }

    const generatedUrl = result.data.images[0].url;
    log(`${model} generation successful. Result: ${generatedUrl}`);
    
    // IMPORTANT: Return the URL in a simple { url: ... } object
    // to match what Creator.tsx handleGenerateImage expects.
    return res.status(200).json({ url: generatedUrl });

  } catch (error) {
    console.error(`Error processing ${model} generation:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      error: errorMessage
    });
  }
});

// Add Kling 2.1 image-to-video endpoint
// @ts-ignore - Express route handler return type
router.post('/fal/kling-image-to-video', async (req, res) => {
  try {
    const { prompt, image_url, duration = '5' } = req.body;

    if (!prompt || !image_url) {
      return res.status(400).json({ error: 'Missing required parameters: prompt and image_url are required' });
    }

    if (!process.env.FAL_API_KEY) {
      console.error('FAL_API_KEY environment variable not set');
      return res.status(500).json({ error: 'Service configuration error' });
    }
    
    fal.config({
      credentials: process.env.FAL_API_KEY
    });

    log('🚀 Starting Kling 2.1 image-to-video generation:', { prompt: prompt.substring(0, 50) + '...', image_url: image_url.substring(0, 50) + '...' });

    const result = await fal.subscribe("fal-ai/kling-video/v2.1/pro/image-to-video", {
      input: {
        prompt,
        image_url,
        duration,
      },
      logs: true,
    });

    log('✅ Kling 2.1 image-to-video generation completed:', result);
    return res.json(result.data);
  } catch (error: any) {
    log('❌ Kling 2.1 image-to-video failed:', error);
    res.status(500).json({ error: error.message || 'Failed to generate video' });
  }
});

// GPT-Image-1 text-to-image endpoint (BYOK - Bring Your Own Key)
// @ts-ignore - Express route handler return type
router.post('/gpt/text-to-image', async (req, res) => {
  const { prompt, options = {} } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing required parameter: prompt is required' });
  }

  try {
    const openAIApiKey = process.env.OPENAI_API_KEY;
    
    if (!openAIApiKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing OpenAI API key' });
    }

    log(`Processing GPT-Image-1 text-to-image: "${prompt}"`);

    const result = await fal.subscribe('fal-ai/gpt-image-1/text-to-image/byok', {
      input: {
        prompt,
        openai_api_key: openAIApiKey,
        image_size: options.image_size || 'auto',
        quality: options.quality || 'auto',
        background: options.background || 'auto',
        num_images: options.num_images || 1
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          log('GPT-Image-1 text-to-image progress:', update.logs?.map(log => log.message));
        }
      },
    });

    log('GPT-Image-1 text-to-image completed:', result);

    if (!result?.data?.images?.[0]?.url) {
      console.error('Unexpected response format from GPT-Image-1:', result);
      return res.status(500).json({ error: 'Invalid response format from image service' });
    }

    const generatedUrl = result.data.images[0].url;
    log(`GPT-Image-1 text-to-image successful. Result: ${generatedUrl}`);
    
    return res.status(200).json({ url: generatedUrl });

  } catch (error) {
    console.error('Error processing GPT-Image-1 text-to-image:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// GPT Image Edit endpoint
// @ts-ignore - Express route handler return type
router.post<ParamsDictionary, any, GptImageEditRequest>('/gpt/edit-image', async (req, res) => {
  const { prompt, imageUrl, options = {} } = req.body;

  if (!prompt || !imageUrl) {
    return res.status(400).json({ error: 'Missing required parameters: prompt and imageUrl are required' });
  }

  try {
    const openAIApiKey = process.env.OPENAI_API_KEY;
    
    if (!openAIApiKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing OpenAI API key' });
    }

    log(`Processing GPT-Image-1 image edit: "${prompt}" for image ${imageUrl.substring(0, 30)}...`);

    const result = await fal.subscribe('fal-ai/gpt-image-1/edit-image/byok', {
      input: {
        image_urls: [imageUrl],
        prompt,
        openai_api_key: openAIApiKey,
        image_size: options.image_size || 'auto',
        quality: options.quality || 'auto',
        num_images: options.num_images || 1
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          log('GPT-Image-1 edit progress:', update.logs?.map(log => log.message));
        }
      },
    });

    log('GPT-Image-1 edit completed:', result);

    if (!result?.data?.images?.[0]?.url) {
      console.error('Unexpected response format from GPT-Image-1:', result);
      return res.status(500).json({ error: 'Invalid response format from image service' });
    }

    const editedImageUrl = result.data.images[0].url;
    log(`GPT-Image-1 edit successful. Result: ${editedImageUrl}`);
    
    return res.status(200).json({ editedImageUrl });

  } catch (error) {
    console.error('Error processing GPT-Image-1 edit:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Mount routes
app.use('/api', router);

// Mount specific routes outside of router
app.post('/api/luma/generate', lumaGenerateHandler);
app.get('/api/luma/status/:id', lumaStatusHandler);
app.post('/api/hunyuan3d/generate', hunyuan3dHandler);

// Catch-all for undefined API routes (must be last)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export default app; 