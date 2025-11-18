import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model } = req.body;

  if (!prompt || !model) {
    return res.status(400).json({ error: 'Missing required parameters: prompt and model are required' });
  }

  try {
    // Proxy the request to the internal server
    const serverResponse = await fetch('http://localhost:3000/fal/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });

    if (!serverResponse.ok) {
      const errorData = await serverResponse.json();
      return res.status(serverResponse.status).json(errorData);
    }

    const result = await serverResponse.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error proxying to server:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
} 