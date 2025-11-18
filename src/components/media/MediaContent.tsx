import React, { useState, useEffect } from 'react';
import { MediaError } from './MediaError';
import { MediaLoading } from './MediaLoading';
import { Volume2, VolumeX } from 'lucide-react';

interface MediaContentProps {
  url: string;
  type: "image" | "video" | "gif";
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
  onLoad?: () => void;
}

const MediaContent: React.FC<MediaContentProps> = ({ 
  url, 
  type, 
  className = '',
  style = {},
  onError,
  onLoad 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showMuteButton, setShowMuteButton] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setError(null);
  }, [url]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError('Failed to load media');
    setIsLoaded(false);
    onError?.();
  };

  if (error) {
    return <MediaError message={error} onRetry={() => setError(null)} />;
  }

  if (!isLoaded) {
    return <MediaLoading />;
  }

  const commonProps = {
    className: `${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`,
    onError: handleError,
    style: {
      objectFit: 'contain' as const,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a1a',
      ...style
    }
  };

  if (type === 'video' || type === 'gif') {
    return (
      <div 
        className="relative w-full h-full"
        onMouseEnter={() => setShowMuteButton(true)}
        onMouseLeave={() => setShowMuteButton(false)}
      >
      <video
        {...commonProps}
        src={url}
        autoPlay
        loop
          muted={isMuted}
        playsInline
        onLoadedData={handleLoad}
      />
        {showMuteButton && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        )}
      </div>
    );
  }

  return (
    <img
      {...commonProps}
      src={url}
      alt=""
      loading="eager"
      decoding="async"
      onLoad={handleLoad}
    />
  );
};

export default React.memo(MediaContent);