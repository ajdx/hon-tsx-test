import { fal } from '@fal-ai/client';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId } = req.query;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    fal.config({
      credentials: process.env.FAL_API_KEY
    });

    const status = await fal.queue.status('fal-ai/minimax/video-01-subject-reference', {
      requestId: requestId,
      logs: true
    });

    console.log('Backend: Minimax character reference status:', status.status);

    if (status.status === 'completed' || status.status === 'COMPLETED') {
      const result = await fal.queue.result('fal-ai/minimax/video-01-subject-reference', {
        requestId: requestId
      });

      console.log('Backend: Minimax character reference result:', result);

      if (!result.data?.video?.url) {
        return res.status(500).json({ 
          status: 'FAILED',
          error: 'No video URL in result' 
        });
      }

      return res.status(200).json({
        status: 'COMPLETED',
        videoUrl: result.data.video.url
      });
    }

    if (status.status === 'failed' || status.status === 'FAILED') {
      return res.status(200).json({
        status: 'FAILED',
        error: 'Video generation failed'
      });
    }

    return res.status(200).json({
      status: status.status.toUpperCase(),
      logs: status.logs
    });
  } catch (error) {
    console.error('Backend: Minimax character reference status error:', error);
    return res.status(500).json({ error: error.message || 'Status check failed' });
  }
} 