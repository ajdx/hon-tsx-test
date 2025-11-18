import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { humeEviService, HonProcessingState } from '../../services/humeEviService';

interface HonIndicatorProps {
  isActive?: boolean;
}

export const HonIndicator: React.FC<HonIndicatorProps> = ({ isActive: propIsActive }) => {
  const [isActive, setIsActive] = useState(propIsActive || false);
  const [processingState, setProcessingState] = useState<HonProcessingState>('idle');

  useEffect(() => {
    // Service subscription (debug logs removed for production)
    const unsubscribe = humeEviService.onVisualIndicatorChange((active, state) => {
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
    // Use the same gradient colors as the processing state in PanelEditor - but more intense
    switch (processingState) {
      case 'generating':
        return 'rgba(139, 92, 246, 1.0)'; // Purple - more intense
      case 'editing':
        return 'rgba(34, 197, 94, 1.0)'; // Green for editing - more intense
      case 'dreaming':
        return 'rgba(236, 72, 153, 1.0)'; // Pink - more intense
      case 'inspiring':
        return 'rgba(59, 130, 246, 1.0)'; // Blue - more intense
      case 'reasoning':
      case 'processing':
        return 'rgba(139, 92, 246, 1.0)'; // Purple - more intense
      default:
        return 'rgba(59, 130, 246, 1.0)'; // Default blue - more intense
    }
  };

  // Calculate pulsing shadow based on glowIntensity
  const getPulsingShadow = () => {
    // Map 0-100 to appropriate shadow values - more intense
    const min = 25;
    const max = 40;
    
    // Cosine wave for smoother pulsing (0-1 range)
    const pulse = (Math.cos(glowIntensity / 100 * Math.PI * 2) + 1) / 2;
    
    // Calculate size (min to max)
    const size = min + pulse * (max - min);
    
    // Calculate opacity (0.8 to 1) - more intense
    const opacity = 0.8 + pulse * 0.2;
    
    return `0 0 ${size}px ${8 + pulse * 8}px ${getGlowColor().replace('1.0', String(opacity))}`;
  };

  // Only a border with animated glow - thicker and more intense
  const getBorderStyle = () => {
    if (processingState !== 'idle') {
      // For processing states, use the pulsing effect
      return {
        border: '5px solid',
        borderColor: getGlowColor(),
        boxShadow: getPulsingShadow(),
      };
    } else {
      // Standard glow for normal active state - thicker and more intense
      return {
        border: `5px solid rgba(59, 130, 246, 1.0)`,
        boxShadow: `0 0 30px 8px rgba(59, 130, 246, 0.8)`,
      };
    }
  };

  // We'll manually animate the glow
  const [glowIntensity, setGlowIntensity] = useState(0);
  
  // Use effect for pulsing animation when processing
  useEffect(() => {
    if (processingState !== 'idle') {
      const interval = setInterval(() => {
        setGlowIntensity(prev => (prev + 2) % 100);
      }, 30); // Faster, smoother animation
      return () => clearInterval(interval);
    }
  }, [processingState]);

  console.log('HonIndicator: Rendering with active state:', isActive, 'Processing state:', processingState);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={getBorderStyle()}
        />
      )}
    </AnimatePresence>
  );
}; 