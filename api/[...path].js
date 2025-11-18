import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../');

// Import routes from the server directory
import '../src/server/api.ts';

// Create Express app
const app = express();

// CORS setup
app.use(cors());

// API routes
app.use('/api', (req, res) => {
  // This is a simple handler for API requests in Vercel serverless functions
  const { path } = req.query;
  
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle Luma AI generation requests
  if (path[0] === 'luma' && path[1] === 'generate') {
    try {
      // For now, just respond with a mock success response
      // In a production environment, you would implement the actual API call
      return res.status(200).json({
        success: true,
        imageUrl: "https://placeholder.com/800x600",
        message: "This is a mock response from Vercel serverless function"
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Handle other API routes
  return res.status(200).json({
    message: 'API endpoint reached',
    path: path,
    method: req.method
  });
});

// Start the server (only for local development)
if (process.env.NODE_ENV !== 'production') {
  const server = createServer(app);
  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, () => {
    console.log(`Vercel dev server running on port ${PORT}`);
  });
}

// Export the Express app as the default handler for Vercel
export default app; 