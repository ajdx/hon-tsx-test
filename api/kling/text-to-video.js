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
    const { 
      prompt, 
      negative_prompt = '', 
      aspect_ratio = '16:9', 
      duration = 5,
      seed 
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    fal.config({
      credentials: process.env.FAL_API_KEY
    });

    console.log('Backend: Starting Kling text-to-video generation - Prompt:', prompt);

    const input = {
      prompt,
      negative_prompt,
      aspect_ratio,
      duration: `${duration}`,
      cfg_scale: 0.5 // Default for Kling
    };

    if (seed !== undefined) {
      input.seed = seed;
    }

    const result = await fal.subscribe('fal-ai/kling-video/v1.6/standard/text-to-video', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('Backend: Kling generation progress:', update.logs?.map(log => log.message));
        }
      },
    });

    console.log('Backend: Kling generation completed:', result);

    const videoUrl = result.data?.video?.url;
    if (!videoUrl) {
      return res.status(500).json({ error: 'No video URL in response' });
    }

    return res.status(200).json({
      videoUrl,
      success: true
    });
  } catch (error) {
    console.error('Backend: Kling API error:', error);
    return res.status(500).json({ error: error.message || 'Video generation failed' });
  }
} 