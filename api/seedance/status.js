import { fal } from '@fal-ai/client';

// Configure the fal client with the API key from environment variables
fal.config({
  credentials: process.env.FAL_API_KEY,
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle OPTIONS method for preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed, use GET' });
  }

  try {
    const { request_id, model_type } = req.query;

    if (!request_id) {
      return res.status(400).json({ error: 'request_id is required' });
    }

    // Validate API key
    if (!process.env.FAL_API_KEY) {
      console.error('Missing FAL_API_KEY environment variable');
      return res.status(500).json({ error: 'Server configuration error - missing API key' });
    }

    // Determine the model endpoint based on model_type
    let modelEndpoint;
    if (model_type === 'image-to-video') {
      modelEndpoint = 'fal-ai/bytedance/seedance/v1/lite/image-to-video';
    } else {
      // Default to text-to-video
      modelEndpoint = 'fal-ai/bytedance/seedance/v1/lite/text-to-video';
    }

    console.log(`Checking Seedance video generation status: ${request_id}`);

    // Check the status of the generation
    const status = await fal.queue.status(modelEndpoint, {
      requestId: request_id,
      logs: true,
    });

    console.log(`Seedance video generation status for ${request_id}:`, {
      status: status.status,
      completed: status.status === 'COMPLETED'
    });

    // If completed, fetch the result
    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(modelEndpoint, {
        requestId: request_id
      });

      console.log(`Seedance video generation completed for ${request_id}:`, {
        hasVideo: !!result.data?.video?.url,
        videoUrl: result.data?.video?.url?.substring(0, 50) + '...'
      });

      res.status(200).json({
        status: 'COMPLETED',
        video_url: result.data?.video?.url,
        seed: result.data?.seed,
        request_id
      });
    } else if (status.status === 'FAILED') {
      console.error(`Seedance video generation failed for ${request_id}:`, status);
      res.status(200).json({
        status: 'FAILED',
        error: status.logs ? status.logs.map(log => log.message).join('; ') : 'Generation failed',
        request_id
      });
    } else {
      // Still in progress
      res.status(200).json({
        status: status.status, // IN_QUEUE, IN_PROGRESS
        progress: status.logs ? status.logs.map(log => log.message).slice(-1)[0] : 'Processing...',
        request_id
      });
    }
  } catch (error) {
    console.error('Error checking Seedance video generation status:', error);
    res.status(500).json({ 
      error: 'Failed to check generation status',
      details: error.message 
    });
  }
} 