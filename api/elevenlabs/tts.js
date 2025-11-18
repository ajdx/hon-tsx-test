export default function handler(req, res) {
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
    // Mock ElevenLabs TTS response
    // In a real implementation, this would call the ElevenLabs API
    const mockAudioUrl = "https://file-examples.com/storage/fe97adf31a81489ed5c34ee/2017/11/file_example_MP3_700KB.mp3";
    
    return res.status(200).json({
      success: true,
      audio_url: mockAudioUrl,
      message: "Mock TTS generated successfully"
    });
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate speech' });
  }
} 