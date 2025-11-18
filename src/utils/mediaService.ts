import { env } from './env';

class MediaService {
  private objectUrls: Map<string, string> = new Map();
  private blobCache: Map<string, Blob> = new Map();

  async load(input: string | File): Promise<string> {
    if (typeof input === 'string') {
      // If it's already a Cloudinary URL, return it
      if (input.includes('cloudinary')) {
        return input;
      }

      // If it's a blob URL, try to use cached blob or fetch new one
      if (input.startsWith('blob:')) {
        try {
          // Try to get from cache first
          const cachedBlob = this.blobCache.get(input);
          if (cachedBlob) {
            const file = new File([cachedBlob], 'media', { type: cachedBlob.type });
            return this.upload(file);
          }

          const response = await fetch(input);
          if (!response.ok) {
            console.error('Failed to fetch blob:', response.statusText);
            return input;
          }

          const blob = await response.blob();
          // Cache the blob
          this.blobCache.set(input, blob);
          const file = new File([blob], 'media', { type: blob.type });
          return this.upload(file);
        } catch (error) {
          console.error('Failed to handle blob URL:', error);
          return input;
        }
      }

      return input;
    }

    return this.upload(input);
  }

  async upload(input: string | File): Promise<string> {
    try {
      // Media upload processing
      
      // If input is a string (URL), return it as-is (already uploaded)
      if (typeof input === 'string') {
        if (input.includes('cloudinary')) {
          return input;
        }
        // Handle blob URLs by converting to File first
        if (input.startsWith('blob:')) {
          try {
            const cachedBlob = this.blobCache.get(input);
            if (cachedBlob) {
              const file = new File([cachedBlob], 'media', { type: cachedBlob.type });
              return this.upload(file);
            }
            const response = await fetch(input);
            if (!response.ok) {
              console.error('Failed to fetch blob:', response.statusText);
              return input;
            }
            const blob = await response.blob();
            this.blobCache.set(input, blob);
            const file = new File([blob], 'media', { type: blob.type });
            return this.upload(file);
          } catch (error) {
            console.error('Failed to handle blob URL:', error);
            return input;
          }
        }
        return input;
      }

      // File upload - use secure proxy with preset fallback
      const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
      
              // Attempting secure upload via proxy
      
      // Try each preset in order via the secure proxy
      const presets = ['hon_comics', 'hon_upload', 'ml_default', 'ml_upload', 'unsigned_upload'];
      
      for (const preset of presets) {
        try {
          // Processing upload attempt
          
          // Convert file to base64
          const fileReader = new FileReader();
          const fileBase64 = await new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = reject;
            fileReader.readAsDataURL(input);
          });
          
          const response = await fetch('/api/cloudinary-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file: fileBase64,
              preset: preset,
              cloudName: cloudName
            })
          });

          if (response.ok) {
            const data = await response.json();
            // Upload successful
            return data.url;
          } else {
            try {
              const errorData = await response.json();
              console.warn(`Secure upload failed with preset ${preset}, status ${response.status}:`, errorData.error);
            } catch (e) {
              console.warn(`Secure upload failed with preset ${preset}, status ${response.status}`);
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.warn(`Network error with preset ${preset}: Failed to reach proxy endpoint`);
          } else {
            console.warn(`Error with preset ${preset}:`, error);
          }
          // Continue to next preset
        }
      }
      
      // If we get here, all presets failed - fall back to local blob storage
              // All secure upload presets failed, falling back to local storage
        
        // Fallback to local blob URL storage
        if (input instanceof File) {
          // Using local blob storage for file
        const blobUrl = URL.createObjectURL(input);
        this.objectUrls.set(blobUrl, blobUrl);
        this.blobCache.set(blobUrl, input);
        return blobUrl;
      }
      
      throw new Error('Invalid input type');
    } catch (error) {
      console.error('Upload process failed completely:', error);
      if (typeof input === 'string') {
        return input; // Return original URL as fallback
      }
      throw error;
    }
  }

  createObjectURL(blob: Blob): string {
    try {
      const url = URL.createObjectURL(blob);
      this.objectUrls.set(url, url);
      this.blobCache.set(url, blob);
      
      // Expose the blob directly for use in img/video elements without fetch
      console.log('Created blob URL:', url);
      return url;
    } catch (error) {
      console.error('Failed to create object URL:', error);
      return ''; // Return empty string as fallback
    }
  }

  // Special method to handle panel image loading without fetch
  getPanelBlobUrl(blobUrl: string): { objectUrl: string, blob?: Blob } {
    // Check if we have this blob in cache
    const cachedBlob = this.blobCache.get(blobUrl);
    if (cachedBlob) {
      return { objectUrl: blobUrl, blob: cachedBlob };
    }
    return { objectUrl: blobUrl };
  }

  revoke(url: string): void {
    if (this.objectUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(url);
      this.blobCache.delete(url);
    }
  }

  async clear(): Promise<void> {
    this.objectUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.objectUrls.clear();
    this.blobCache.clear();
  }

  async testCloudinaryConfig(): Promise<boolean> {
    try {
      console.log('Testing Cloudinary configuration...');
      const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = env.VITE_CLOUDINARY_API_KEY;
      
      if (!cloudName || !apiKey) {
        console.error('Cloudinary configuration missing: cloudName or apiKey not set');
        return false;
      }
      
      console.log('Cloudinary config present:', { 
        cloudName, 
        apiKey: apiKey.slice(0, 5) + '...',
      });
      
      // Instead of trying to ping, which will fail due to CORS,
      // we'll do a basic sanity check on the config
      return !!cloudName && !!apiKey;
    } catch (error) {
      console.error('Cloudinary config test failed:', error);
      return false;
    }
  }
}

export const mediaService = new MediaService();
