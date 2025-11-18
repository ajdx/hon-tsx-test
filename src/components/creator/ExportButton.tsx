import React, { useState, useRef, useEffect } from 'react';
import { Share2, Download, Facebook, Instagram } from 'lucide-react';
import { exportService } from '../../services/exportService';
import { useComicStore } from '../../store/useComicStore';
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas';

// Custom X icon component
const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" fill="currentColor" />
  </svg>
);

// Video warning dialog component
const VideoWarningDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Video Panels Detected
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Your comic contains video panels which cannot be exported as images. 
          The export will replace videos with placeholder images.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

interface ExportButtonProps {
  containerId: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ containerId }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showVideoWarning, setShowVideoWarning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentComic } = useComicStore();
  
  // Store the export parameters when video warning is shown
  const exportParamsRef = useRef<{
    fileName: string;
    action: 'export' | 'share';
    platform?: 'x' | 'facebook' | 'instagram';
  } | null>(null);

  const checkForVideos = (): boolean => {
    const container = document.getElementById(containerId);
    if (!container) return false;
    
    const videos = container.querySelectorAll('video');
    return videos.length > 0;
  };

  const handleExport = async () => {
    try {
      // Check for video panels first
      if (checkForVideos()) {
        // Store export parameters and show warning
        exportParamsRef.current = {
          fileName: currentComic?.title 
            ? `${currentComic.title.replace(/\s+/g, '-').toLowerCase()}`
            : 'hon-comic-page',
          action: 'export'
        };
        setShowVideoWarning(true);
        return;
      }
      
      // Proceed with export
      await performExport();
    } catch (error) {
      handleExportError(error);
    }
  };
  
  const performExport = async () => {
    try {
      setIsExporting(true);
      
      // Show a toast with longer duration
      toast.info('Preparing your comic for download... This may take a moment.', {
        autoClose: 15000, // Longer timeout for image processing
        toastId: 'export-progress'
      });
      
      const fileName = exportParamsRef.current?.fileName || 
        (currentComic?.title 
          ? `${currentComic.title.replace(/\s+/g, '-').toLowerCase()}`
          : 'hon-comic-page');
      
      // Ensure all images are loaded before export
      const container = document.getElementById(containerId);
      if (container) {
        // Pre-process the container to ensure all images are loaded
        await preloadContainerImages(container);
      }
      
      // Export the comic page
      await exportService.exportPage(containerId, fileName);
      
      // Close the progress toast and show success
      toast.dismiss('export-progress');
      toast.success('Comic page downloaded successfully!');
    } catch (error) {
      handleExportError(error);
    } finally {
      setIsExporting(false);
      setIsMenuOpen(false);
      exportParamsRef.current = null;
    }
  };
  
  // Helper function to preload all images in the container
  const preloadContainerImages = async (container: HTMLElement): Promise<void> => {
    const images = container.querySelectorAll('img');
    
    // Create an array of promises for each image
    const imagePromises = Array.from(images).map(img => {
      // Skip if already loaded
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      
      // Create a promise that resolves when the image loads
      return new Promise<void>((resolve) => {
        const onLoad = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          console.warn('Failed to load image:', img.src);
          resolve(); // Resolve anyway to continue
        };
        
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
        
        // Force reload if needed
        if (!img.complete) {
          const currentSrc = img.src;
          img.src = currentSrc;
        }
      });
    });
    
    // Wait for all images to load
    await Promise.all(imagePromises);
  };
  
  const handleExportError = (error: any) => {
    console.error('Export error:', error);
    
    // Close the progress toast
    toast.dismiss('export-progress');
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message === 'video_panels_detected') {
        // This should be handled by the warning dialog, not here
        return;
      } else if (error.message.includes('Tainted canvases')) {
        toast.error('Unable to export due to image restrictions. Try refreshing the page and exporting again.');
      } else if (error.message.includes('timeout')) {
        toast.error('Export timed out. Some images may be taking too long to load.');
      } else {
        toast.error(`Export failed: ${error.message}`);
      }
    } else {
      toast.error('Failed to export comic page. Please try again.');
    }
  };

  const handleShare = async (platform: 'x' | 'facebook' | 'instagram') => {
    try {
      // Check for video panels first for Instagram (which requires image export)
      if (platform === 'instagram' && checkForVideos()) {
        // Store share parameters and show warning
        exportParamsRef.current = {
          fileName: currentComic?.title 
            ? `${currentComic.title.replace(/\s+/g, '-').toLowerCase()}`
            : 'hon-comic-page',
          action: 'share',
          platform
        };
        setShowVideoWarning(true);
        return;
      }
      
      // Proceed with share
      await performShare(platform);
    } catch (error) {
      handleShareError(error, platform);
    }
  };
  
  const performShare = async (platform: 'x' | 'facebook' | 'instagram') => {
    try {
      setIsExporting(true);
      const platformName = platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1);
      
      toast.info(`Preparing to share to ${platformName}...`, {
        autoClose: false,
        toastId: 'share-progress'
      });
      
      // For Instagram, we need to export the image first
      if (platform === 'instagram') {
        // Get the container
        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error('Container not found');
        }
        
        // Preload all images in the container
        await preloadContainerImages(container);
        
        // Get the comic title or use a default
        const title = currentComic?.title || 'My Hon Comic';
        
        // Capture the comic page directly
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          imageTimeout: 30000, // Longer timeout for images
          onclone: (documentClone) => {
            // Hide videos in the cloned document
            const videos = documentClone.querySelectorAll('video');
            videos.forEach(video => {
              video.style.display = 'none';
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
            
            // Make sure all images maintain aspect ratio
            const images = documentClone.querySelectorAll('img');
            images.forEach(img => {
              img.style.display = 'block';
              img.style.opacity = '1';
              img.style.objectFit = 'contain';
              
              // Make sure the image fills its container appropriately
              const parentPanel = img.closest('.panel');
              if (parentPanel) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
              }
            });
          }
        });
        
        // Convert to data URL and download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
        
        // Show instructions for Instagram
        toast.dismiss('share-progress');
        toast.success('Image downloaded for Instagram sharing!');
        setTimeout(() => {
          alert('To share on Instagram:\n1. Open Instagram\n2. Create a new post\n3. Select the downloaded image\n4. Add the caption and share');
        }, 500);
      } else {
        // Get the comic title or use a default
        const title = currentComic?.title || 'My Hon Comic';
        
        // For other platforms, just share the URL with the title
        await exportService.shareToSocial('', platform, title);
        
        // Close the progress toast and show success
        toast.dismiss('share-progress');
        toast.success(`Shared to ${platformName}!`);
      }
    } catch (error) {
      handleShareError(error, platform);
    } finally {
      setIsExporting(false);
      setIsMenuOpen(false);
      exportParamsRef.current = null;
    }
  };
  
  const handleShareError = (error: any, platform: 'x' | 'facebook' | 'instagram') => {
    console.error('Share error:', error);
    
    // Close the progress toast
    toast.dismiss('share-progress');
    
    const platformName = platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1);
    
    if (error instanceof Error) {
      toast.error(`Failed to share to ${platformName}: ${error.message}`);
    } else {
      toast.error(`Failed to share to ${platformName}. Please try again.`);
    }
  };
  
  const handleWarningConfirm = () => {
    setShowVideoWarning(false);
    
    if (!exportParamsRef.current) return;
    
    if (exportParamsRef.current.action === 'export') {
      performExport();
    } else if (exportParamsRef.current.action === 'share' && exportParamsRef.current.platform) {
      performShare(exportParamsRef.current.platform);
    }
  };
  
  const handleWarningClose = () => {
    setShowVideoWarning(false);
    exportParamsRef.current = null;
    setIsExporting(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
          title="Export or share"
          disabled={isExporting}
        >
          {isExporting ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          ) : (
            <Share2 className="w-4 h-4 text-gray-300" />
          )}
        </button>

        {isMenuOpen && (
          <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 min-w-48 z-50 border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Export Options</p>
            </div>
            
            <button
              onClick={handleExport}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isExporting}
            >
              <Download className="w-4 h-4 mr-2" />
              Download as Image
            </button>
            
            <div className="px-4 py-2 border-t border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Share to</p>
            </div>
            
            <button
              onClick={() => handleShare('x')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isExporting}
            >
              <span className="w-4 h-4 mr-2 flex items-center justify-center text-black dark:text-white">
                <XIcon />
              </span>
              X.com
            </button>
            
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isExporting}
            >
              <Facebook className="w-4 h-4 mr-2 text-blue-600" />
              Facebook
            </button>
            
            <button
              onClick={() => handleShare('instagram')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isExporting}
            >
              <Instagram className="w-4 h-4 mr-2 text-pink-500" />
              Instagram
            </button>
          </div>
        )}
      </div>
      
      {/* Video warning dialog */}
      <VideoWarningDialog 
        isOpen={showVideoWarning}
        onClose={handleWarningClose}
        onConfirm={handleWarningConfirm}
      />
    </>
  );
}; 