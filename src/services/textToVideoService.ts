export type VideoModel = 'pika' | 'luma' | 'kling' | 'kling-2.1' | 'seedance' | 'hailuo-02-pro' | 'veo3-fast' | 'vidu';

export interface TextToVideoOptions {
  prompt: string;
  negativePrompt?: string;
  model: VideoModel;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '5:4' | '3:2' | '4:3' | '9:21';
  quality?: 'standard' | 'high';
  seed?: number;
  maxRetries?: number;
  timeoutSeconds?: number;
  onProgress?: (progressMessage: string) => void;
  cameraFixed?: boolean;
  enhance_prompt?: boolean;
  generate_audio?: boolean;
  style?: 'general' | 'anime';
  movement_amplitude?: 'auto' | 'small' | 'medium' | 'large';
}

export interface OptimizePromptOptions {
  prompt: string;
  category?: 'cinematic' | 'animated' | 'realistic';
  maxTokens?: number;
  onProgress?: (progress: string) => void;
}

export class TextToVideoService {
  constructor() {
    // No longer configuring FAL client - using secure backend endpoints
  }

  async optimizePrompt({
    prompt,
    category = 'cinematic',
    maxTokens = 300,
    onProgress = () => {}
  }: OptimizePromptOptions): Promise<string> {
    try {
      onProgress('Optimizing your prompt...');
      console.log('[TextToVideoService] Optimizing prompt via secure backend');
      
      // Map our category to style parameter in the API
      const styleMapping: Record<string, string> = {
        'cinematic': 'Cinematic',
        'animated': 'Animation',
        'realistic': 'Detailed'
      };
      
      const response = await fetch('/api/video/prompt-optimizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_concept: prompt,
          style: styleMapping[category] || 'Cinematic',
          prompt_length: "Medium"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(`Prompt optimization failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (!result.optimizedPrompt) {
        throw new Error('Failed to optimize prompt: No optimized prompt in response');
      }

      console.log('[TextToVideoService] Prompt optimization successful (via backend)', { original: prompt, optimized: result.optimizedPrompt });
      onProgress('Prompt optimization complete!');
      
      return result.optimizedPrompt;
    } catch (error) {
      console.error('[TextToVideoService] Prompt optimization error:', error);
      throw new Error(`Failed to optimize prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async pollForCompletion(
    apiModel: string,
    requestId: string,
    onProgress: (progressMessage: string) => void,
  ): Promise<string> {
    // Increase timeout for slower models like Vidu and Minimax
    const getTimeoutForModel = (model: string) => {
      if (model === 'vidu') return 120; // 10 minutes
      if (model === 'minimax') return 180; // 15 minutes for Minimax (Hailuo)
      return 60; // 5 minutes for others
    };
    
    const maxPolls = getTimeoutForModel(apiModel);
    const pollInterval = 5000; // 5 seconds
    
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const statusResponse = await fetch(`/api/${apiModel}/status?requestId=${requestId}`);
        
        // Check if response is HTML (indicating 404/500 error)
        const contentType = statusResponse.headers.get('content-type');
        if (!statusResponse.ok || !contentType?.includes('application/json')) {
          console.error(`[TextToVideoService] ${apiModel} status endpoint error:`, {
            status: statusResponse.status,
            statusText: statusResponse.statusText,
            contentType
          });
          throw new Error(`Status endpoint error: ${statusResponse.status} ${statusResponse.statusText}`);
        }

        const statusData = await statusResponse.json();
        console.log(`[TextToVideoService] ${apiModel} status response:`, statusData);

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
            console.error(`[TextToVideoService] No video URL found in response for ${apiModel} model:`, statusData.result);
            console.error(`[TextToVideoService] Full status data for debugging:`, JSON.stringify(statusData, null, 2));
            throw new Error('No video URL in completed job response');
          }
          console.log(`📥 Received ${apiModel} video URL:`, videoUrl);
          onProgress('Video ready!');
          return videoUrl;
        } else if (statusData.status === 'ERROR' || statusData.status === 'FAILED') {
          throw new Error(`Video generation failed: ${statusData.error || statusData.message || 'Unknown error'}`);
        }
        
        onProgress(`Processing... Status: ${statusData.status} (${i + 1}/${maxPolls})`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Status endpoint error')) {
          throw error; // Re-throw endpoint errors immediately
        }
        console.warn(`[TextToVideoService] Polling attempt ${i + 1} failed:`, error);
        onProgress(`Retrying... (${i + 1}/${maxPolls})`);
      }
    }

    const getTimeoutMinutes = (model: string) => {
      if (model === 'vidu') return 10;
      if (model === 'minimax') return 15;
      return 5;
    };
    
    const timeoutMinutes = getTimeoutMinutes(apiModel);
    throw new Error(`Video generation timed out after ${timeoutMinutes} minutes.`);
  }

  async generateVideo({
    prompt,
    negativePrompt = '',
    model,
    duration = 5,
    aspectRatio = '16:9',
    quality = 'high',
    seed,
    maxRetries = 2,
    timeoutSeconds = 300,
    onProgress = () => {},
    cameraFixed,
    enhance_prompt,
    generate_audio,
    style,
    movement_amplitude,
  }: TextToVideoOptions): Promise<string> {

    if (['kling-2.1', 'veo3-fast', 'hailuo-02-pro', 'vidu'].includes(model)) {
      const apiPathMap = {
        'kling-2.1': 'kling',
        'veo3-fast': 'veo3',
        'hailuo-02-pro': 'minimax',
        'vidu': 'vidu'
      };
      const apiModel = apiPathMap[model];

      const submitResponse = await fetch(`/api/${apiModel}/text-to-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            negative_prompt: negativePrompt,
            aspect_ratio: aspectRatio,
            duration: duration,
            quality: quality,
            seed: seed,
            enhance_prompt: enhance_prompt,
            generate_audio: generate_audio,
            style: style,
            movement_amplitude: movement_amplitude,
          })
      });

      if (submitResponse.status !== 202) {
          const errorData = await submitResponse.json();
          throw new Error(errorData.error || 'Failed to submit video generation job');
      }

      const { request_id } = await submitResponse.json();
      return this.pollForCompletion(apiModel, request_id, onProgress);
    }
    
    console.log(`[TextToVideoService] Starting video generation with model: ${model}`);
    onProgress(`Initializing ${model.toUpperCase()} video generation...`);
    
    let currentRetry = 0;
    let lastError: any = null;
    
    // Map quality to resolution values
    const resolution = quality === 'high' ? '1080p' : '720p';
    
    while (currentRetry <= maxRetries) {
      try {
        if (currentRetry > 0) {
          console.log(`Retry attempt ${currentRetry}/${maxRetries}`);
          onProgress(`Retry attempt ${currentRetry}/${maxRetries}`);
          // Add exponential backoff between retries
          const backoffTime = 2000 * Math.pow(2, currentRetry);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
        
        // Handle Seedance model
        if (model === 'seedance') {
          // Use secure backend endpoint for Seedance
          console.log('🎬 Using secure Seedance text-to-video endpoint...');
          
          const seedancePayload = {
            prompt: prompt,
            aspect_ratio: aspectRatio || '16:9',
            resolution: quality === 'high' ? '720p' : '480p',
            duration: `${duration}` || '5',
            camera_fixed: cameraFixed || false,
            ...(seed !== undefined && { seed })
          };

          const response = await fetch('/api/seedance/text-to-video', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(seedancePayload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(`Seedance text-to-video failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
          }

          const result = await response.json();
          console.log('Seedance text-to-video job submitted:', result.request_id);

          // Poll for completion using secure status endpoint
          return this.pollSeedanceCompletion(result.request_id, 'text-to-video', onProgress);
        }
        
        // Prepare model-specific inputs for other models
        let input: any = {};
        
        if (model === 'pika') {
          input = {
            prompt: prompt,
            negative_prompt: negativePrompt,
            aspect_ratio: aspectRatio,
            resolution: resolution,
            duration: duration
          };
          
          if (seed !== undefined) {
            input.seed = seed;
          }
        } 
        else if (model === 'luma') {
          // Luma has a different input structure - this will be handled by backend
          input = {
            prompt: prompt,
            duration,
            aspect_ratio: aspectRatio
          };
        }
        else if (model === 'kling') {
          input = {
            prompt: prompt,
            negative_prompt: negativePrompt,
            aspect_ratio: aspectRatio,
            duration: `${duration}`,
            cfg_scale: 0.5 // Default for Kling
          };
          
          if (seed !== undefined) {
            input.seed = seed;
          }
        }
        
        // Use secure backend endpoints for remaining models
        if (model === 'pika') {
          console.log('🎬 Using secure Pika text-to-video endpoint...');
          const response = await fetch('/api/pika/text-to-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(`Pika text-to-video failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
          }

          const result = await response.json();
          if (!result.videoUrl) {
            throw new Error('No video URL in response');
          }
          
          console.log(`📥 Received Pika video URL via backend:`, result.videoUrl);
          onProgress('Video ready!');
          return result.videoUrl;
        }
        
        if (model === 'luma') {
          console.log('🎬 Using secure Luma text-to-video endpoint...');
          const response = await fetch('/api/luma/text-to-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              duration,
              aspect_ratio: aspectRatio
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(`Luma text-to-video failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
          }

          const result = await response.json();
          if (!result.videoUrl) {
            throw new Error('No video URL in response');
          }
          
          console.log(`📥 Received Luma video URL via backend:`, result.videoUrl);
          onProgress('Video ready!');
          return result.videoUrl;
        }
        
        if (model === 'kling') {
          console.log('🎬 Using secure Kling text-to-video endpoint...');
          const response = await fetch('/api/kling/text-to-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(`Kling text-to-video failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
          }

          const result = await response.json();
          if (!result.videoUrl) {
            throw new Error('No video URL in response');
          }
          
          console.log(`📥 Received Kling video URL via backend:`, result.videoUrl);
          onProgress('Video ready!');
          return result.videoUrl;
        }
        
        // This should not be reached since all models are now handled
        throw new Error(`Unsupported model: ${model}`);
      } catch (error) {
        if (error instanceof Error) {
          lastError = error;
          const isTimeout = error.message.includes('timed out');
          console.error(`❌ Video generation ${isTimeout ? 'timed out' : 'failed'} (attempt ${currentRetry+1}/${maxRetries+1}):`, error);
          onProgress(`Error: ${isTimeout ? 'Generation timed out' : error.message}`);
          
          if (currentRetry < maxRetries) {
            currentRetry++;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
  }

  // Secure Seedance polling method
  private async pollSeedanceCompletion(
    requestId: string, 
    modelType: 'text-to-video' | 'image-to-video',
    onProgress?: (progressMessage: string) => void
  ): Promise<string> {
    const maxAttempts = 60; // 5 minutes at 5-second intervals
    let attempts = 0;

    console.log(`Starting secure Seedance polling for request ${requestId} (${modelType})`);
    onProgress?.('Starting Seedance video generation...');

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const statusResponse = await fetch(`/api/seedance/status?request_id=${requestId}&model_type=${modelType}`);
        
        if (!statusResponse.ok) {
          console.warn(`Failed to check Seedance status: ${statusResponse.status}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        const statusResult = await statusResponse.json();
        console.log(`Seedance status check ${attempts}/${maxAttempts}:`, {
          request_id: requestId,
          status: statusResult.status
        });

        if (statusResult.status === 'COMPLETED' && statusResult.video_url) {
          console.log(`✅ Seedance video completed! Video URL: ${statusResult.video_url.substring(0, 50)}...`);
          onProgress?.('Video generation complete!');
          return statusResult.video_url;
        } else if (statusResult.status === 'FAILED') {
          onProgress?.('Video generation failed');
          throw new Error(`Seedance generation failed: ${statusResult.error || 'Unknown error'}`);
        }

        // Still processing
        const progressMsg = statusResult.progress || `Generating video... (${attempts}/${maxAttempts})`;
        onProgress?.(progressMsg);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`Error checking Seedance status:`, error);
        if (attempts >= maxAttempts) {
          onProgress?.('Video generation timed out');
          throw new Error('Failed to check Seedance generation status');
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    onProgress?.('Video generation timed out');
    throw new Error('Seedance generation timed out');
  }
}

export const textToVideoService = new TextToVideoService(); 