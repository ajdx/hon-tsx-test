import React, { useEffect, useState } from 'react';
import { landingPageHumeService, LandingHonProcessingState } from '../../services/landingPageHumeService';

interface LandingPageHonIndicatorProps {
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LandingPageHonIndicator: React.FC<LandingPageHonIndicatorProps> = ({ 
  isActive: propIsActive, 
  size = 'md',
  className = ''
}) => {
  const [isActive, setIsActive] = useState(propIsActive || false);
  const [processingState, setProcessingState] = useState<LandingHonProcessingState>('idle');

  useEffect(() => {
    // Service subscription (debug logs removed for production)
    const unsubscribe = landingPageHumeService.onVisualIndicatorChange((active, state) => {
      setIsActive(active);
      setProcessingState(state);
    });

    return () => {
      // Service cleanup (debug logs removed for production)
      unsubscribe();
    };
  }, []);

  // Get the glow color based on the processing state
  const getGlowColor = () => {
    switch (processingState) {
      case 'listening':
        return 'rgba(34, 197, 94, 0.9)'; // Green for listening
      case 'thinking':
        return 'rgba(139, 92, 246, 0.9)'; // Purple for thinking  
      case 'speaking':
        return 'rgba(59, 130, 246, 0.9)'; // Blue for speaking
      default:
        return 'rgba(156, 163, 175, 0.5)'; // Gray for idle
    }
  };

  // Get size dimensions for waveform
  const getSizeDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: 24, height: 24 };
      case 'lg':
        return { width: 48, height: 48 };
      default:
        return { width: 36, height: 36 };
    }
  };

  // Get the animation based on state
  const getAnimation = () => {
    if (!isActive) return '';
    
    switch (processingState) {
      case 'listening':
        return 'animate-pulse';
      case 'thinking':
        return 'animate-pulse';
      case 'speaking':
        return 'animate-pulse';
      default:
        return '';
    }
  };

  const glowColor = getGlowColor();
  const dimensions = getSizeDimensions();
  const animation = getAnimation();

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow effect background */}
      {isActive && (
        <div 
          className={`absolute inset-0 rounded-full ${animation}`}
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            filter: 'blur(4px)',
            transform: 'scale(1.5)',
          }}
        />
      )}
      
      {/* Animated Waveform Icon */}
      <div 
        className="relative z-10 transition-all duration-200"
        style={{
          filter: isActive ? `drop-shadow(0 0 8px ${glowColor})` : 'none'
        }}
      >
        <svg 
          width={dimensions.width} 
          height={dimensions.height} 
          viewBox="0 0 36 36" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="4" y="12" width="3" height="12" rx="1.5" fill={isActive ? glowColor : 'currentColor'}>
            {isActive && <animate attributeName="height" values="12;24;12" dur="1s" repeatCount="indefinite" />}
            {isActive && <animate attributeName="y" values="12;6;12" dur="1s" repeatCount="indefinite" />}
          </rect>
          <rect x="10" y="8" width="3" height="20" rx="1.5" fill={isActive ? glowColor : 'currentColor'}>
            {isActive && <animate attributeName="height" values="20;28;20" dur="0.8s" repeatCount="indefinite" />}
            {isActive && <animate attributeName="y" values="8;4;8" dur="0.8s" repeatCount="indefinite" />}
          </rect>
          <rect x="16" y="4" width="3" height="28" rx="1.5" fill={isActive ? glowColor : 'currentColor'}>
            {isActive && <animate attributeName="height" values="28;32;28" dur="1.2s" repeatCount="indefinite" />}
            {isActive && <animate attributeName="y" values="4;2;4" dur="1.2s" repeatCount="indefinite" />}
          </rect>
          <rect x="22" y="10" width="3" height="16" rx="1.5" fill={isActive ? glowColor : 'currentColor'}>
            {isActive && <animate attributeName="height" values="16;22;16" dur="0.9s" repeatCount="indefinite" />}
            {isActive && <animate attributeName="y" values="10;7;10" dur="0.9s" repeatCount="indefinite" />}
          </rect>
          <rect x="28" y="14" width="3" height="8" rx="1.5" fill={isActive ? glowColor : 'currentColor'}>
            {isActive && <animate attributeName="height" values="8;18;8" dur="1.1s" repeatCount="indefinite" />}
            {isActive && <animate attributeName="y" values="14;9;14" dur="1.1s" repeatCount="indefinite" />}
          </rect>
        </svg>
      </div>
      
      {/* Additional pulse ring for speaking state */}
      {isActive && processingState === 'speaking' && (
        <div 
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            transform: 'scale(1.2)',
          }}
        />
      )}
    </div>
  );
}; 