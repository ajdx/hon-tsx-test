import { fal } from '@fal-ai/client';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referenceImageUrl, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!referenceImageUrl) {
      return res.status(400).json({ error: 'Reference image URL is required' });
    }

    fal.config({
      credentials: process.env.FAL_API_KEY
    });

    console.log('Backend: Starting Minimax character reference video generation - Prompt:', prompt);

    const { request_id } = await fal.queue.submit('fal-ai/minimax/video-01-subject-reference', {
      input: {
        prompt,
        subject_reference_image_url: referenceImageUrl,
        prompt_optimizer: true
      }
    });

    console.log('Backend: Minimax character reference request submitted with ID:', request_id);

    // Return the request ID for polling
    return res.status(202).json({
      request_id,
      status: 'submitted'
    });
  } catch (error) {
    console.error('Backend: Minimax character reference API error:', error);
    return res.status(500).json({ error: error.message || 'Video generation failed' });
  }
} 