export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS method for preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed, use GET' });
  }
  
  try {
    // Mock ElevenLabs voices response
    const mockVoices = {
      voices: [
        {
          voice_id: "mock-voice-1",
          name: "Adam",
          preview_url: "https://example.com/preview1.mp3"
        },
        {
          voice_id: "mock-voice-2",
          name: "Bella",
          preview_url: "https://example.com/preview2.mp3"
        },
        {
          voice_id: "mock-voice-3",
          name: "Charlie",
          preview_url: "https://example.com/preview3.mp3"
        }
      ]
    };
    
    return res.status(200).json(mockVoices);
  } catch (error) {
    console.error('ElevenLabs voices error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get voices' });
  }
} 