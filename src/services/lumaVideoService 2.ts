export const lumaVideoService = {
  apiUrl: '/api/luma',  // Use backend proxy
  
  generateVideo: async (prompt: string, referenceImage?: string): Promise<string> => {
    console.log('🎥 Starting Luma video generation:', { prompt, hasReference: !!referenceImage });
    
    try {
      const response = await fetch(`${lumaVideoService.apiUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          type: 'video',
          referenceImage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Video generation failed');
      }

      const { url: videoUrl } = await response.json();
      console.log('📥 Received video URL:', videoUrl);
      return videoUrl;
    } catch (error) {
      console.error('❌ Luma video generation failed:', error);
      throw error;
    }
  }
}; 