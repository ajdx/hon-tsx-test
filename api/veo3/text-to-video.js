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
    aspect_ratio, 
    duration, 
    negative_prompt, 
    enhance_prompt, 
    seed, 
    resolution, 
    generate_audio 
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    console.log('Submitting Veo3 text-to-video generation job...');

    const result = await fal.queue.submit('fal-ai/veo3/fast', {
      input: {
        prompt,
        aspect_ratio,
        duration: "8s", // Veo3 only accepts "8s"
        negative_prompt,
        enhance_prompt,
        seed,
        resolution,
        generate_audio,
      },
      webhookUrl: null,
    });

    console.log('Veo3 job submitted successfully:', result);

    res.status(202).json({
      request_id: result.request_id,
      status: 'IN_QUEUE'
    });
  } catch (error) {
    console.error('Error submitting job to Veo3:', error);
    res.status(500).json({ 
      error: 'Failed to submit job',
      details: error.message 
    });
  }
} 