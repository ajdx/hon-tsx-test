import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Proxy route for images
app.get('/proxy', async (req, res) => {
  try {
    const url = req.query.url as string;
    
    if (!url) {
      return res.status(400).send('URL parameter is required');
    }
    
    console.log(`Proxying request to: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
    }
    
    // Get content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Stream the response
    response.body?.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Proxy error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`CORS proxy server running on http://localhost:${PORT}`);
});

export default app; 