import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { elevenLabsService } from '../../services/elevenLabsService';
import { AxiosError } from 'axios';

interface NarrationBubbleProps {
  text: string;
  voiceId?: string;
  pageIndex?: number;
  panelId?: string;
  isActive?: boolean;
}

// Default voice ID (Harrison Gale)
const DEFAULT_VOICE_ID = 'fCxG8OHm4STbIsWe4aT9';

export const NarrationBubble: React.FC<NarrationBubbleProps> = ({
  text,
  voiceId,
  pageIndex = 0,
  isActive = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [effectiveVoiceId, setEffectiveVoiceId] = useState<string>(voiceId || DEFAULT_VOICE_ID);
  const [error, setError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef<{
    play: () => Promise<void>;
    pause: () => void;
    isPlaying: () => boolean;
    cleanup: () => void;
    onEnded: (callback: () => void) => void;
  } | null>(null);

  // Set the effective voice ID when the voiceId prop changes
  useEffect(() => {
    console.log('NarrationBubble: voiceId prop changed:', voiceId);
    setEffectiveVoiceId(voiceId || DEFAULT_VOICE_ID);
  }, [voiceId]);

  // Reset state when page changes
  useEffect(() => {
    console.log('NarrationBubble: pageIndex changed:', pageIndex);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [pageIndex]);

  useEffect(() => {
    // Don't load audio if there's no text
    if (!text || text.trim() === '') {
      console.log('NarrationBubble: No text to narrate');
      return;
    }

    console.log('NarrationBubble: Loading audio for text:', text);
    console.log('NarrationBubble: Using voice ID:', effectiveVoiceId);

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Cleanup previous audio if it exists
        if (audioRef.current) {
          audioRef.current.cleanup();
          audioRef.current = null;
        }

        console.log(`Generating speech with voice ID: ${effectiveVoiceId}`);
        const audioData = await elevenLabsService.generateSpeech(text, effectiveVoiceId);
        console.log('NarrationBubble: Successfully generated speech');
        
        // Create audio controller
        const audio = await elevenLabsService.createAudioElement(audioData);
        console.log('NarrationBubble: Successfully created audio element');
        
        // Add ended callback to update playing state
        audio.onEnded(() => {
          console.log('NarrationBubble: Audio playback ended');
          setIsPlaying(false);
        });
        
        audioRef.current = audio;
        setAudioLoaded(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load narration:', error);
        
        // Check if it's an Axios error with a 401 status code
        const axiosError = error as AxiosError;
        if (axiosError.isAxiosError && axiosError.response?.status === 401) {
          setError('Narration unavailable (API key issue)');
        } else {
          setError('Narration unavailable');
        }
        
        setIsLoading(false);
        setAudioLoaded(false);
      }
    };

    loadAudio();

    return () => {
      if (audioRef.current) {
        console.log('NarrationBubble: Cleaning up audio');
        audioRef.current.cleanup();
        audioRef.current = null;
      }
    };
  }, [text, effectiveVoiceId]);

  useEffect(() => {
    // Hide tooltip after 4 seconds
    const timeoutId = setTimeout(() => {
      setShowTooltip(false);
    }, 4000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const togglePlay = async () => {
    console.log('NarrationBubble: Toggle play clicked');
    const audio = audioRef.current;
    if (!audio) {
      console.log('NarrationBubble: No audio available');
      setError('Audio not ready. Please try again.');
      return;
    }

    try {
      if (audio.isPlaying()) {
        console.log('NarrationBubble: Pausing audio');
        audio.pause();
        setIsPlaying(false);
      } else {
        console.log('NarrationBubble: Playing audio');
        setError(null);
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      setIsPlaying(false);
      
      // Handle NotAllowedError specifically
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setError('Click again to play audio');
      } else {
        setError('Failed to play audio. Please try again.');
      }
    }
  };

  // Don't render if there's no text or if the component is not active
  if (!text || !isActive) {
    console.log('NarrationBubble: Not rendering due to no text or inactive state');
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-full shadow-lg p-3 flex items-center space-x-2">
      <div className="relative">
        <button
          onClick={togglePlay}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          disabled={isLoading}
          className="p-2 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isPlaying ? "Pause narration" : "Play narration"}
        >
          {isLoading ? (
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        <AnimatePresence>
          {(showTooltip || error) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-full mr-5 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
              <div className={`text-white text-xs px-2 py-1 rounded flex items-center ${error ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                {error ? (
                  <>
                    <Info className="w-3 h-3 mr-1" />
                    {error}
                  </>
                ) : (
                  'Narrate'
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
    </div>
  );
}; 