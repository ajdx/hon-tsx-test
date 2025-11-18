import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Cloudinary upload request received');
    
    const { file, preset } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('Cloudinary upload - preset:', preset);

    // Upload to Cloudinary using base64 data
    const result = await cloudinary.uploader.upload(file, {
      upload_preset: preset || 'hon_comics',
      resource_type: 'auto',
      folder: 'hon-comics',
      public_id: `hon-${Date.now()}`, // Unique identifier
    });

    console.log('Cloudinary upload successful:', result.secure_url);

    return res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id,
      success: true
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({ 
      error: error.message || 'Upload failed',
      details: error.http_code ? `Cloudinary error ${error.http_code}` : 'Unknown error'
    });
  }
} 