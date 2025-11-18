# Hon v.3 Comic Creator

A powerful, AI-enhanced comic creation platform that enables users to create stunning visual stories using state-of-the-art AI models.

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern web browser with ES2020+ support

### Installation

1. Clone the repository:
```
git clone https://github.com/your-org/Hon-v.3-Comic-Creator.git
cd Hon-v.3-Comic-Creator
```

2. Install dependencies:
```
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your API keys and service configurations
   - Key services that need configuration:
     - Supabase for authentication and database
     - Cloudinary for media storage
     - Various AI service providers (check services directory)
     - fal.ai API keys for AI model integrations

4. Start the development servers:
   - In one terminal, run the client:
   ```
   npm run dev:client
   ```
   - In another terminal, run the minimal server:
   ```
   npm run dev:minimal
   ```

   The client will be accessible at http://localhost:5173 (or whichever port Vite assigns).

### Environment Variables

Create an `.env.local` file with the following variables:
```
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Media Storage (Required)
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# AI Services (Optional - for full functionality)
FAL_API_KEY=your-fal-api-key
OPENAI_API_KEY=your-openai-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
HUME_API_KEY=your-hume-api-key
RUNWAY_API_KEY=your-runway-api-key
LUMA_API_KEY=your-luma-api-key
# ... additional AI service keys as needed

# Solana Configuration (Optional)
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**SECURITY NOTE:** 
- Variables with `VITE_` prefix are exposed to the browser (use only for public configuration)
- Variables without `VITE_` prefix are server-side only and secure
- Never commit real API keys to version control

**Cloudinary Setup:**
- Create a Cloudinary account and get your cloud name
- Set up upload presets for media handling
- Configure API keys for server-side operations

To verify Cloudinary is working correctly:
1. Ensure your cloud name and upload presets are configured
2. Test upload functionality through the application interface
3. Check that images appear properly in your Cloudinary dashboard

## 🚀 Features

### Core Creation Tools
- **AI-Powered Panel Generation**: Create comic panels using various AI models
- **Drag & Drop Interface**: Intuitive canvas-based editing
- **Multi-Modal AI Integration**: Text-to-image, image-to-video, 3D generation
- **Real-time Collaboration**: Work together on comics in real-time
- **Professional Templates**: Pre-designed layouts for quick start

### AI Model Integrations
- **Image Generation**: Flux, DALL-E, Midjourney-style models
- **Video Creation**: Luma Dream Machine, Runway, Kling AI
- **3D Modeling**: Hunyuan3D for dimensional content
- **Voice & Audio**: ElevenLabs TTS, Hume emotional AI
- **Enhancement Tools**: Upscaling, style transfer, prompt optimization

### Publishing & Monetization
- **Story Publishing**: Share your comics with the community
- **Creator Economy**: Monetization tools for content creators
- **Social Features**: Comments, likes, subscriptions
- **Export Options**: Multiple formats for distribution

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React components
│   ├── creator/        # Comic creation interface
│   ├── reader/         # Comic reading interface
│   └── common/         # Shared components
├── services/           # API service integrations
├── stores/             # State management
├── utils/              # Utility functions
└── types/              # TypeScript definitions

api/                    # Server-side API routes
├── ai-models/          # AI service integrations
├── auth/               # Authentication endpoints
└── media/              # Media handling
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## 📚 API Documentation

### AI Service Integration
The platform integrates with multiple AI services through secure server-side proxies:
- All API keys are server-side only for security
- Rate limiting and error handling built-in
- Consistent response format across all services

### Authentication
- Supabase Auth with multiple providers (Google, Discord, Email)
- Row Level Security (RLS) for data protection
- JWT-based session management

## 🔒 Security & Privacy

- **API Key Protection**: All sensitive keys are server-side only
- **Database Security**: Row Level Security (RLS) enabled
- **Input Validation**: Comprehensive validation on all inputs
- **CORS Protection**: Proper CORS configuration
- **Rate Limiting**: Built-in protection against abuse

## 🌐 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic builds on push

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Configure serverless functions for API routes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- For development issues: Check the troubleshooting guide
- For feature requests: Open an issue on GitHub
- For security concerns: Contact the maintainers directly

---

**Note**: This is a development version. Some features may be in beta or require additional configuration.
