import { fal } from "@fal-ai/client";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS method for preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, use POST' });
  }

  try {
    const { videoUrl, prompt } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl parameter' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt parameter' });
    }

    // Configure FAL client with server-side environment variable
    const falApiKey = process.env.FAL_API_KEY;
    if (!falApiKey) {
      console.error('FAL_API_KEY environment variable not set (server-side only)');
      return res.status(500).json({ error: 'Service configuration error' });
    }

    fal.config({
      credentials: falApiKey
    });

    // Simple memory cache for faster responses and to reduce API calls
    const VIDEO_ANALYSIS_CACHE = globalThis.VIDEO_ANALYSIS_CACHE || (globalThis.VIDEO_ANALYSIS_CACHE = new Map());
    const cacheKey = `${videoUrl}_${prompt}`;
    
    // Check cache first
    if (VIDEO_ANALYSIS_CACHE.has(cacheKey)) {
      const cachedResult = VIDEO_ANALYSIS_CACHE.get(cacheKey);
      console.log('🔍 Retrieved video analysis from cache for:', videoUrl.substring(0, 30) + '...');
      return res.json(cachedResult);
    }

    console.log('🔄 Video analysis request for:', videoUrl.substring(0, 30) + '...', 'with prompt:', prompt);

    // Handle Cloudinary URLs by uploading to fal.ai storage
    let finalVideoUrl = videoUrl;
    if (videoUrl.includes('cloudinary')) {
      console.log('🔄 Cloudinary URL detected, uploading to fal.ai storage...');
      console.log('📋 Full Cloudinary URL:', videoUrl);
      try {
        // Fetch the video from Cloudinary
        console.log('🌐 Fetching video from Cloudinary...');
        const videoResponse = await fetch(videoUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VideoAnalysis/1.0)',
            'Accept': 'video/mp4,video/*,*/*',
            'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log('📊 Cloudinary fetch response status:', videoResponse.status, videoResponse.statusText);
        
        if (!videoResponse.ok) {
          console.error('❌ Cloudinary fetch failed:', {
            status: videoResponse.status,
            statusText: videoResponse.statusText,
            url: videoUrl,
            headers: Object.fromEntries(videoResponse.headers.entries())
          });
          // Don't fall back - throw error to prevent analyzing wrong video
          throw new Error(`Cannot access video from Cloudinary: ${videoResponse.status} ${videoResponse.statusText}. Please check video URL and Cloudinary settings.`);
        }
        
        // Convert to blob and upload to fal.ai
        console.log('🔄 Converting response to blob...');
        const videoBlob = await videoResponse.blob();
        console.log('📦 Video blob size:', videoBlob.size, 'bytes, type:', videoBlob.type);
        
        console.log('⬆️ Uploading to fal.ai storage...');
        const uploadedUrl = await fal.storage.upload(videoBlob);
        finalVideoUrl = uploadedUrl;
        console.log('✅ Video uploaded to fal.ai storage:', uploadedUrl);
      } catch (uploadError) {
        console.error('❌ Failed to upload video to fal.ai storage:', uploadError);
        console.error('📋 Error details:', {
          message: uploadError.message,
          stack: uploadError.stack,
          originalUrl: videoUrl
        });
        // Don't fall back - return error immediately
        throw new Error(`Video upload failed: ${uploadError.message}`);
      }
    }

    const result = await fal.subscribe("fal-ai/video-understanding", {
      input: {
        video_url: finalVideoUrl,
        prompt: prompt,
        detailed_analysis: true // Always request detailed analysis
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('🔄 Video understanding progress:', update.logs?.map(log => log.message));
        }
      },
    });

    console.log('✅ Video understanding completed:', result);

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
    console.log('💾 Cached video analysis for:', videoUrl.substring(0, 30) + '...');

    return res.json(response);
  } catch (error) {
    console.error('❌ Video understanding API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      analysis: null
    });
  }
} 