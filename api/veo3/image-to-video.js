import { fal } from '@fal-ai/client';

// Configure the fal client with the API key from environment variables
fal.config({
  credentials: process.env.FAL_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    prompt, 
    image_url,
    duration = "8s", // Veo3 only accepts "8s"
    generate_audio = true
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!image_url) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    console.log('Submitting Veo3 image-to-video generation job...');

    const result = await fal.queue.submit('fal-ai/veo3/image-to-video', {
      input: {
        prompt,
        image_url,
        duration,
        generate_audio,
      },
      webhookUrl: null,
    });

    console.log('Veo3 image-to-video job submitted successfully:', result);

    res.status(202).json({
      request_id: result.request_id,
      status: 'IN_QUEUE'
    });
  } catch (error) {
    console.error('Error submitting job to Veo3 image-to-video:', error);
    res.status(500).json({ 
      error: 'Failed to submit job',
      details: error.message 
    });
  }
} 