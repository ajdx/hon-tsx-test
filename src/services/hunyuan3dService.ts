export interface Hunyuan3DOptions {
  seed?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  octreeResolution?: number;
  texturedMesh?: boolean;
}

export interface Hunyuan3DResult {
  modelGlbUrl: string;
  modelMeshUrl?: string;
  seed?: number;
}

export const hunyuan3dService = {
  async generate3DModel(inputImageUrl: string, options: Hunyuan3DOptions = {}): Promise<Hunyuan3DResult> {
    try {
      // Validate inputs
      if (!inputImageUrl) {
        throw new Error('Input image URL is required');
      }

      console.log('Starting 3D model generation via backend API...');

      const response = await fetch('/api/hunyuan3d/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputImageUrl,
          options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.modelGlbUrl) {
        throw new Error('Invalid response from 3D generation service');
      }

      return {
        modelGlbUrl: result.modelGlbUrl,
        modelMeshUrl: result.modelMeshUrl,
        seed: result.seed
      };
    } catch (error) {
      console.error('Hunyuan 3D API error:', error);
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Too many requests')) {
          throw new Error('Too many requests to the AI service. Please try again later.');
        } else if (error.message.includes('Access denied')) {
          throw new Error('Access denied. Please check your API key.');
        } else if (error.message.includes('Image file is too large')) {
          throw new Error('Image file is too large. Please use a smaller image.');
        } else if (error.message.includes('Invalid request')) {
          throw new Error('Invalid request. The AI service could not process the image. Try a different image.');
        } else if (error.message.includes('AI service error')) {
          throw new Error('AI service error. Please try again later.');
        }
      }
      
      throw new Error('Failed to generate 3D model. Please try again later.');
    }
  }
}; 