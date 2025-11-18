import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Gift } from 'lucide-react';

interface GalleryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
}

// Using all URLs provided by the user, removing duplicates and adding new ones
const galleryItems: GalleryItem[] = [
  { id: '1', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1744426235/fimzt57b01nfayokwxur.jpg', type: 'image' },
  { id: '2', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1744239656/xfrbgnrwalgeqm70o7ki.mp4', type: 'video' },
  { id: '3', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1742536839/py88bk1yapmwimiw8bvs.png', type: 'image' },
  { id: '4', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1742101377/q9x8ozah89rvyhwcfbec.jpg', type: 'image' },
  { id: '5', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1742178844/uknkfhy52rifcjmihxzk.mp4', type: 'video' },
  { id: '6', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1741800672/bqg4fsnla34l1mostt9q.jpg', type: 'image' },
  { id: '7', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1741571955/vbwkixufhlzxck43hpve.mp4', type: 'video' },
  { id: '8', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1741361078/rdvlvjyshgca0t0iuxyq.jpg', type: 'image' },
  { id: '9', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1741472839/lohp5eqxj94la34zsk77.mp4', type: 'video' },
  { id: '10', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1741354345/rpoixgv01tos5zngsdvo.jpg', type: 'image' },
  { id: '11', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1738976274/sh4xpnas78jpdwytgdyd.mp4', type: 'video' },
  { id: '12', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1738554821/bcno9pjwokbppmpzwziw.mp4', type: 'video' },
  { id: '13', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1738029637/t5ahy4abusmjuzuhm8ql.mp4', type: 'video' },
  { id: '14', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737831905/zkqyrtqv2zphvzifp24z.mp4', type: 'video' },
  { id: '15', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737825018/c4boypditlq6woizpcqx.mp4', type: 'video' },
  { id: '16', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737725343/q4xw2bcf9iicvjapdwog.mp4', type: 'video' },
  { id: '17', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737724661/wtoqat0mfhwzbikld06o.mp4', type: 'video' },
  { id: '18', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737722965/voddoiacvsvwx6ullx0j.mp4', type: 'video' },
  { id: '19', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737713036/o3kghgfm1flymzpzbb5e.mp4', type: 'video' },
  { id: '20', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737708057/ud4pps0edxnasuy8w5wa.mp4', type: 'video' },
  { id: '21', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737711483/mbldflq4cnsi3d7yjg3g.mp4', type: 'video' },
  { id: '23', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1741916218/uj78bv0mfalgryoo6cjf.jpg', type: 'image' },
  { id: '24', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1738335233/wet31xgwoy13jlymuxbg.jpg', type: 'image' },
  { id: '25', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737433846/l5vyrkwzzsia1fricg4k.mp4', type: 'video' },
  { id: '26', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1736992762/z1tozm9hpvvcddri8vcj.jpg', type: 'image' },
  { id: '27', url: 'https://res.cloudinary.com/dz2kyqfj9/image/upload/v1736306764/hcwtafjv4j0d6kxdeb74.jpg', type: 'image' },
  { id: '28', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1736556616/mnm2wdvfykg6f4nudvva.mp4', type: 'video' },
  { id: '29', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1736104202/kvzckvk2skgyovyekned.mp4', type: 'video' },
  { id: '30', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1738003355/iqsvhdejl4ntiywpspda.mp4', type: 'video' },
  { id: '31', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737696149/qk4xn14gwxmpfkfqm3sm.mp4', type: 'video' },
  { id: '32', url: 'https://res.cloudinary.com/dz2kyqfj9/video/upload/v1736988406/v33dlzaaxuncagxlmba7.mp4', type: 'video' },
];

const GalleryItemComponent: React.FC<{ item: GalleryItem }> = ({ item }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Immediate autoplay attempt on mount
  useEffect(() => {
    if (videoRef.current && item.type === 'video') {
      const video = videoRef.current;
      const attemptPlay = () => {
        video.muted = true;
        video.playsInline = true;
        video.play().catch(() => {
          // Silently fail, will try again when visible
        });
      };
      
      // Try immediately
      attemptPlay();
      
      // Also try when the video loads
      if (video.readyState >= 1) {
        attemptPlay();
      }
    }
  }, [item.type]);

  // Intersection Observer for performance optimization
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: isMobile ? '25px' : '50px' // Smaller preload area for mobile
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Aggressive auto-play video when visible
  useEffect(() => {
    if (isVisible && videoRef.current && item.type === 'video' && !hasError) {
      const video = videoRef.current;
      
      const forcePlayVideo = async () => {
        try {
          // Force muted autoplay
          video.muted = true;
          video.playsInline = true;
          await video.play();
          setIsLoaded(true);
        } catch (error) {
          console.error("Video autoplay failed:", error);
          // Try again after a short delay
          setTimeout(() => {
            video.muted = true;
            video.play().catch(() => {
              // Final fallback - ensure video is ready to play on interaction
              video.load();
            });
          }, 100);
        }
      };

      // Try to play immediately
      forcePlayVideo();
      
      // Also set up event listeners for when video becomes ready
      video.addEventListener('loadeddata', forcePlayVideo, { once: true });
      video.addEventListener('canplay', forcePlayVideo, { once: true });
      
      return () => {
        video.removeEventListener('loadeddata', forcePlayVideo);
        video.removeEventListener('canplay', forcePlayVideo);
      };
    }
  }, [isVisible, item.type, hasError]);

  const handleMouseEnter = useCallback(() => {
    if (videoRef.current && !hasError) {
      videoRef.current.play().catch(err => console.error("Video play failed:", err));
    }
  }, [hasError]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current && !hasError) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hasError]);

  const handleVideoError = useCallback(() => {
    setHasError(true);
    console.error("Video load error for:", item.url);
  }, [item.url]);

  const handleVideoLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const getPosterUrl = useCallback((videoUrl: string) => {
    if (videoUrl.includes('cloudinary.com')) {
      const parts = videoUrl.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/f_jpg,q_auto:low,so_0/${parts[1]}`;
      }
    }
    return undefined;
  }, []);

  const getOptimizedVideoUrl = useCallback((videoUrl: string) => {
    if (videoUrl.includes('cloudinary.com')) {
      const parts = videoUrl.split('/upload/');
      if (parts.length === 2) {
        // Enhanced mobile detection and network awareness
        const isMobile = window.innerWidth <= 768;
        const connection = (navigator as any).connection;
        const isSlowConnection = connection && (
          connection.effectiveType === '3g' || 
          connection.effectiveType === '2g' || 
          connection.effectiveType === 'slow-2g'
        );
        
        // Production-grade bitrate optimization
        let quality: string;
        let bitrate: string;
        
        if (isSlowConnection) {
          // Very slow connections - prioritize loading speed
          quality = 'q_auto:low';
          bitrate = 'br_600k';
        } else if (isMobile) {
          // Mobile devices - balanced quality and performance
          quality = 'q_auto:good';
          bitrate = 'br_1200k';
        } else {
          // Desktop - maintain higher quality
          quality = 'q_auto:good';
          bitrate = 'br_2000k';
        }
        
        const format = 'f_auto';
        
        return `${parts[0]}/upload/${quality},${format},${bitrate}/${parts[1]}`;
      }
    }
    return videoUrl;
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div
      ref={containerRef}
      className="relative group overflow-hidden shadow-lg break-inside-avoid"
      onMouseEnter={item.type === 'video' ? handleMouseEnter : undefined}
      onMouseLeave={item.type === 'video' ? handleMouseLeave : undefined}
    >
      {item.type === 'video' ? (
        <video
          ref={videoRef}
          src={isVisible ? getOptimizedVideoUrl(item.url) : undefined}
          poster={getPosterUrl(item.url)}
          className="w-full h-auto object-cover block"
          autoPlay
          loop
          muted
          playsInline
          preload={isMobile ? "metadata" : "auto"}
          controls={false}
          disablePictureInPicture
          webkit-playsinline="true"
          x5-playsinline="true"
          onError={handleVideoError}
          onLoadedData={handleVideoLoad}
          onCanPlay={handleVideoLoad}
          onLoadStart={() => {
            // Force play as soon as loading starts
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(console.error);
            }
          }}
          style={{
            backgroundColor: '#f3f4f6', // Light gray background while loading
          }}
        />
      ) : (
        <img
          src={item.url}
          alt={`Gallery item ${item.id}`}
          className="w-full h-auto object-cover block"
          loading="lazy"
        />
      )}
      
      {/* Loading indicator for videos */}
      {item.type === 'video' && !isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        </div>
      )}
      
      {/* Error state for videos */}
      {item.type === 'video' && hasError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Video unavailable</div>
        </div>
      )}

      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <button
          onClick={handleScrollToTop}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-full text-sm font-medium transition-transform transform group-hover:scale-100 scale-90 hover:bg-pink-700"
          aria-label="Support Creator"
        >
          <Gift className="w-4 h-4 text-white" />
          Support Creator
        </button>
      </div>
    </div>
  );
};

export const LandingGallery: React.FC = () => {
  // Use CSS columns for masonry effect
  return (
    // Removed padding, gap, and space-y
    <div className="columns-2 md:columns-3 lg:columns-4">
      {galleryItems.map((item) => (
        <GalleryItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}; 