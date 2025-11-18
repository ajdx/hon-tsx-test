import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useComicStore } from '../../store/useComicStore';
import { ProgressiveImage } from './ProgressiveImage';

interface PanelProgressOverlayProps {
  panelId: string;
}

export const PanelProgressOverlay: React.FC<PanelProgressOverlayProps> = ({ panelId }) => {
  const panelProgress = useComicStore(state => state.panelGenerationProgress[panelId]);

  if (!panelProgress?.isGenerating) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
      >
        <div className="text-center p-6">
          {panelProgress.partialImageUrl ? (
            /* Progressive Image Display */
            <div className="w-full max-w-sm mx-auto">
              <ProgressiveImage
                partialImageUrl={panelProgress.partialImageUrl}
                isGenerating={panelProgress.isGenerating}
                className="w-full h-48 mb-4"
              />
              <div className="text-white">
                <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Flux.1 Krea
                </h3>
                <p className="text-sm text-gray-200 animate-pulse">
                  {panelProgress.progress || 'Generating your image...'}
                </p>
              </div>
            </div>
          ) : (
            /* Loading Animation when no partial image yet */
            <>
              <div className="relative mb-4">
                <div className="w-16 h-16 mx-auto">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 border-4 border-purple-200/30 rounded-full"></div>
                  
                  {/* Inner spinning gradient ring */}
                  <motion.div
                    className="absolute inset-0 border-4 border-transparent rounded-full"
                    style={{
                      borderTopColor: '#a855f7', // purple-500
                      borderRightColor: '#ec4899', // pink-500
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  
                  {/* Center pulsing dot */}
                  <motion.div
                    className="absolute inset-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </div>

              {/* Progress Text */}
              <div className="text-white">
                <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Flux.1 Krea
                </h3>
                <p className="text-sm text-gray-200 animate-pulse">
                  {panelProgress.progress || 'Generating your image...'}
                </p>
              </div>

              {/* Streaming Progress Bar */}
              <div className="mt-4 w-48 h-1 bg-gray-600 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  animate={{
                    x: [-192, 192, -192],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ width: '50%' }}
                />
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 