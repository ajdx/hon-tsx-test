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
    const { inputImageUrl, options = {} } = req.body;

    // Validate inputs
    if (!inputImageUrl) {
      return res.status(400).json({ error: 'Input image URL is required' });
    }

    // Configure FAL client with server-side environment variable
    // Use server-side only env var (not VITE_ prefixed to keep secure)
    if (!process.env.FAL_API_KEY) {
      console.error('FAL_API_KEY environment variable not set (server-side only)');
      return res.status(500).json({ error: 'Service configuration error' });
    }

    fal.config({
      credentials: process.env.FAL_API_KEY
    });

    console.log('Starting Hunyuan 3D generation...');

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
          console.log('Hunyuan 3D generation progress:', update.logs?.map(log => log.message));
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

    console.log('Hunyuan 3D generation completed successfully');
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Hunyuan 3D API error:', error);
    
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
} 