export interface LumaService {
  generateImage: (prompt: string, referenceImage?: string) => Promise<string>;
}

export const lumaService = {
  apiUrl: '/api/luma',
  
  generateImage: async (prompt: string, referenceImage?: string): Promise<string> => {
    console.log('📤 Starting Luma generation:', { prompt, hasReference: !!referenceImage });
    try {
      const response = await fetch(`${lumaService.apiUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, referenceImage })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Generation failed');
      }

      const { url: lumaUrl } = await response.json();
      console.log('📥 Received Luma URL:', lumaUrl);
      return lumaUrl;
    } catch (error) {
      console.error('❌ Luma generation failed:', error);
      throw error;
    }
  }
}; 