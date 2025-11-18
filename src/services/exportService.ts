import { Panel } from '../types';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

// Define the proxy URL for handling CORS issues
const PROXY_URL = 'http://localhost:3001/proxy?url=';

export const exportService = {
  /**
   * Exports a single panel as an image
   */
  async exportPanel(panel: Panel, quality: number = 0.95): Promise<string> {
    try {
      // For video panels, we need to capture a frame
      if (panel.type === 'video' && panel.videoUrl) {
        return await this.captureVideoFrame(panel.videoUrl, quality);
      }
      
      // For image panels, process the image
      if (panel.imageUrl) {
        return await this.processImage(panel.imageUrl, quality);
      }
      
      // Return a placeholder if no image or video URL
      return this.createPlaceholderImage();
    } catch (error) {
      console.error('Error exporting panel:', error);
      return this.createPlaceholderImage();
    }
  },

  /**
   * Checks if the container has any video panels
   */
  hasVideoPanel(container: HTMLElement): boolean {
    const videos = container.querySelectorAll('video');
    return videos.length > 0;
  },

  /**
   * Exports a page with multiple panels
   */
  async exportPage(containerId: string, fileName: string = 'comic-page', quality: number = 0.95): Promise<void> {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error('Container not found');
      }

      // Check if there are any video panels
      if (this.hasVideoPanel(container)) {
        throw new Error('video_panels_detected');
      }

      // Pre-process images to ensure they're loaded properly
      await this.preloadImages(container);

      // Capture the page directly
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 30000, // Longer timeout for images
        logging: true, // Enable logging for debugging
        onclone: (documentClone) => {
          // Make sure all images are visible and maintain aspect ratio
          const images = documentClone.querySelectorAll('img');
          images.forEach(img => {
            // Ensure image is visible
            img.style.display = 'block';
            img.style.opacity = '1';
            
            // Preserve original aspect ratio
            img.style.objectFit = 'contain';
            
            // Make sure the image fills its container appropriately
            const parentPanel = img.closest('.panel');
            if (parentPanel) {
              // If in a panel, use the panel's dimensions
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.position = 'absolute';
              img.style.top = '0';
              img.style.left = '0';
            }
          });
          
          // Make captions visible
          const captions = documentClone.querySelectorAll('.caption, .panel-caption');
          captions.forEach(caption => {
            if (caption instanceof HTMLElement) {
              caption.style.visibility = 'visible';
              caption.style.display = 'block';
              caption.style.zIndex = '10';
            }
          });
          
          // Hide video elements
          const videos = documentClone.querySelectorAll('video');
          videos.forEach(video => {
            video.style.display = 'none';
          });
        }
      });

      // Convert to blob and save
      canvas.toBlob(
        (blob) => {
          if (blob) {
            saveAs(blob, `${fileName}.png`);
          } else {
            throw new Error('Failed to create image blob');
          }
        },
        'image/png',
        quality
      );
    } catch (error) {
      console.error('Error exporting page:', error);
      throw error;
    }
  },

  /**
   * Preloads all images in the container to ensure they're properly loaded before export
   */
  async preloadImages(container: HTMLElement): Promise<void> {
    try {
      const images = container.querySelectorAll('img');
      const imagePromises = Array.from(images).map(async (img) => {
        // Skip if already a data URL
        if (img.src.startsWith('data:')) return;
        
        // Skip if image is already complete and has dimensions
        if (img.complete && img.naturalWidth > 0) return;
        
        // Create a new promise to wait for the image to load
        return new Promise<void>((resolve) => {
          const originalSrc = img.src;
          
          // Set up load and error handlers
          const onLoad = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = async () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onError);
            
            // Try loading through proxy
            try {
              const proxyUrl = PROXY_URL + encodeURIComponent(originalSrc);
              const dataUrl = await this.imageToDataURL(proxyUrl);
              img.src = dataUrl;
              resolve();
            } catch (err) {
              console.warn('Failed to load image through proxy:', err);
              resolve(); // Resolve anyway to continue with export
            }
          };
          
          // Add event listeners
          img.addEventListener('load', onLoad);
          img.addEventListener('error', onError);
          
          // Force reload if needed
          if (!img.complete) {
            img.src = originalSrc;
          }
        });
      });
      
      // Wait for all images to be processed
      await Promise.all(imagePromises);
    } catch (error) {
      console.error('Error preloading images:', error);
    }
  },

  /**
   * Prepares a container for export by handling CORS issues
   */
  async prepareContainerForExport(container: HTMLElement): Promise<void> {
    try {
      // Process all images to handle CORS issues
      const images = container.querySelectorAll('img');
      const imagePromises = Array.from(images).map(async (img) => {
        try {
          if (img.src && !img.src.startsWith('data:')) {
            // Try to load the image through the proxy
            const proxyUrl = PROXY_URL + encodeURIComponent(img.src);
            const dataUrl = await this.imageToDataURL(proxyUrl);
            img.src = dataUrl;
          }
        } catch (err) {
          console.warn('Failed to process image:', err);
          // Keep the original source if processing fails
        }
      });

      // Wait for all images to be processed
      await Promise.all(imagePromises);
      
      // Replace video elements with placeholders
      const videos = container.querySelectorAll('video');
      const videoPromises = Array.from(videos).map(async (video) => {
        try {
          // Create a placeholder image
          const placeholder = document.createElement('img');
          
          // If the video has a poster, use it
          if (video.poster) {
            placeholder.src = video.poster;
          } else {
            // Otherwise create a gradient placeholder
            placeholder.src = this.createPlaceholderImage();
          }
          
          // Copy styles from video to placeholder
          placeholder.style.width = '100%';
          placeholder.style.height = '100%';
          placeholder.style.objectFit = 'contain';
          
          // Replace video with placeholder
          if (video.parentNode) {
            video.parentNode.replaceChild(placeholder, video);
          }
        } catch (err) {
          console.warn('Failed to replace video:', err);
        }
      });

      // Wait for all videos to be processed
      await Promise.all(videoPromises);
    } catch (error) {
      console.error('Error preparing container for export:', error);
      throw error;
    }
  },

  /**
   * Converts an image to a data URL
   */
  async imageToDataURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Set a timeout for image loading
      const timeoutId = setTimeout(() => {
        reject(new Error('Image loading timed out'));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  },

  /**
   * Processes an image URL, attempting to load it directly and falling back to proxy if needed
   */
  async processImage(imageUrl: string, quality: number = 0.95): Promise<string> {
    try {
      // For data URLs, return as is
      if (imageUrl.startsWith('data:')) {
        return imageUrl;
      }

      // Try to load the image directly first
      try {
        const dataUrl = await this.imageToDataURL(imageUrl);
        return dataUrl;
      } catch (directError) {
        console.warn('Direct image loading failed, trying proxy:', directError);
        
        // If direct loading fails, try through the proxy
        try {
          const proxyUrl = PROXY_URL + encodeURIComponent(imageUrl);
          const dataUrl = await this.imageToDataURL(proxyUrl);
          return dataUrl;
        } catch (proxyError) {
          console.error('Proxy image loading failed:', proxyError);
          // If both methods fail, return a placeholder
          return this.createPlaceholderImage();
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      return this.createPlaceholderImage();
    }
  },

  /**
   * Captures a frame from a video URL
   */
  async captureVideoFrame(videoUrl: string, quality: number = 0.95): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      // Set up event handlers
      video.onloadeddata = () => {
        // Seek to the middle of the video
        video.currentTime = video.duration / 2;
      };
      
      video.onseeked = () => {
        try {
          // Create a canvas and draw the video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png', quality);
            resolve(dataUrl);
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        } catch (error) {
          console.error('Error capturing video frame:', error);
          reject(error);
        } finally {
          // Clean up
          video.pause();
          video.src = '';
          video.load();
        }
      };
      
      video.onerror = () => {
        console.error('Error loading video:', video.error);
        reject(new Error('Failed to load video'));
      };
      
      // Start loading the video
      video.src = videoUrl;
      video.load();
      
      // Set a timeout in case the video never loads
      setTimeout(() => {
        if (!video.duration) {
          reject(new Error('Video loading timed out'));
        }
      }, 10000);
    }).catch(error => {
      console.error('Video frame capture failed:', error);
      return this.createPlaceholderImage();
    });
  },

  /**
   * Creates a placeholder image for when processing fails
   */
  createPlaceholderImage(width: number = 640, height: number = 360): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#f0f0f0');
        gradient.addColorStop(1, '#e0e0e0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add text
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Image unavailable', width / 2, height / 2);
        
        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.error('Error creating placeholder:', error);
    }
    
    // Fallback to a simple data URL if canvas fails
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  },

  /**
   * Shares the exported content to social media
   */
  async shareToSocial(dataUrl: string, platform: 'x' | 'facebook' | 'instagram' | 'pinterest' | 'linkedin' | 'reddit', title: string = 'My Comic'): Promise<void> {
    try {
      let shareUrl = '';
      const encodedTitle = encodeURIComponent(title);
      const encodedUrl = encodeURIComponent(window.location.href);
      
      // If we have a data URL, we'll need to upload it to get a shareable URL
      let imageUrl = '';
      if (dataUrl && dataUrl.startsWith('data:')) {
        try {
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Create a File object from the blob
          const file = new File([blob], `${title.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
          
          // Upload to a temporary storage service (e.g., Cloudinary)
          // This is a placeholder - you would need to implement the actual upload
          // imageUrl = await uploadToCloudinary(file);
          
          // For now, we'll just use the current URL
          imageUrl = encodedUrl;
        } catch (error) {
          console.error('Error processing image for sharing:', error);
          // Fall back to just sharing the URL
          imageUrl = encodedUrl;
        }
      } else {
        imageUrl = encodedUrl;
      }
      
      switch (platform) {
        case 'x':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${imageUrl}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${imageUrl}&quote=${encodedTitle}`;
          break;
        case 'instagram':
          // Instagram doesn't have a web sharing API, so we'll just download the image
          // and show instructions
          alert('To share on Instagram:\n1. Open Instagram\n2. Create a new post\n3. Select the downloaded image\n4. Add the caption and share');
          return;
        case 'pinterest':
          shareUrl = `https://pinterest.com/pin/create/button/?url=${imageUrl}&media=${imageUrl}&description=${encodedTitle}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${imageUrl}`;
          break;
        case 'reddit':
          shareUrl = `https://www.reddit.com/submit?url=${imageUrl}&title=${encodedTitle}`;
          break;
      }
      
      // Open the share dialog
      if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }
    } catch (error) {
      console.error('Error sharing to social media:', error);
      throw error;
    }
  }
}; 