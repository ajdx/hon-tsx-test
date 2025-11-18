import { fal } from '@fal-ai/client';

// Configure the fal client with the API key from environment variables
fal.config({
  credentials: process.env.FAL_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, image_url, seed, movement_amplitude } = req.body;

  if (!prompt || !image_url) {
    return res.status(400).json({ error: 'Both prompt and image_url are required' });
  }

  // Validate prompt length (Vidu has 1500 character limit)
  if (prompt.length > 1500) {
    return res.status(400).json({ 
      error: 'Prompt too long', 
      details: `Prompt must be 1500 characters or less. Current length: ${prompt.length}` 
    });
  }

  try {
    console.log('Submitting Vidu Q1 image-to-video generation job...');

    const result = await fal.queue.submit('fal-ai/vidu/q1/image-to-video', {
      input: {
        prompt,
        image_url,
        seed,
        movement_amplitude,
      },
      webhookUrl: null,
    });

    console.log('Vidu Q1 image-to-video job submitted successfully:', result);

    res.status(202).json({
      request_id: result.request_id,
      status: 'IN_QUEUE'
    });
  } catch (error) {
    console.error('Error submitting job to Vidu Q1 (image-to-video):', error);
    res.status(500).json({ 
      error: 'Failed to submit job',
      details: error.message 
    });
  }
} 