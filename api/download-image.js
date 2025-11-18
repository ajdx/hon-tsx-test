export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate that it's a proper URL
    let imageUrl;
    try {
      imageUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    // Fetch the image from the external URL
    console.log('Downloading image via proxy:', imageUrl.href);
    
    const response = await fetch(imageUrl.href, {
      headers: {
        'User-Agent': 'Hon-Platform/1.0',
        'Accept': 'image/*,*/*',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      });
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Set appropriate headers for the image download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment');
    
    // Stream the image data to the client
    const imageBuffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('Download proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to download image', 
      details: error.message 
    });
  }
} 