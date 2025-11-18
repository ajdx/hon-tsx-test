import React, { useState } from 'react';
import { BookOpen, Sparkles, X, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { lumaService } from '../../services/lumaService';
import { lumaVideoService } from '../../services/lumaVideoService';
import { nanoid } from 'nanoid';
import { Panel } from '../../types';

const gradientStyle = `
  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  .animate-gradient {
    background-size: 200% auto;
    animation: gradient 3s linear infinite;
  }
`;

interface HonAssistantProps {
  onGenerateStory: (prompt: string, generatedUrl: string, type: 'image' | 'video' | 'gif', panel?: Panel) => Promise<void>;
  onPanelContentGenerating: (panelId: string) => void;
  referenceImage?: string | null;
  onCheckTemplate?: () => boolean;
}

type GenerationState = 'idle' | 'generating' | 'dreaming' | 'inspiring' | 'reasoning' | 'completed';

export const HonAssistant: React.FC<HonAssistantProps> = ({
  onGenerateStory,
  onPanelContentGenerating,
  referenceImage,
  onCheckTemplate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [showTooltip, setShowTooltip] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.includes('gif'))) {
      setReferenceFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerationState('generating');
    try {
      // First panel - image generation
      console.log('🎨 Starting generation with prompt:', prompt);
      const firstImageUrl = await lumaService.generateImage(prompt);
      
      if (firstImageUrl) {
        console.log('🖼️ First image generated:', firstImageUrl);
        
        // Create first panel
        const firstPanel = {
          id: nanoid(),
          type: 'image' as const,
          url: firstImageUrl,
          size: 'medium' as const,
          aspectRatio: 1,
          position: { row: 0, col: 0 },
          caption: prompt
        };
        
        // Update first panel
        await onGenerateStory(prompt, firstImageUrl, 'image', firstPanel);
        onPanelContentGenerating(firstPanel.id);
        
        setGenerationState('dreaming');
        
        // Generate second panel with reference
        console.log('🎨 Generating second panel with reference...');
        const secondImageUrl = await lumaService.generateImage(prompt, firstImageUrl);
        if (secondImageUrl) {
          console.log('🖼️ Second image generated:', secondImageUrl);
          setGenerationState('inspiring');
          
          // Create second panel
          const secondPanel = {
            id: nanoid(),
            type: 'image' as const,
            url: secondImageUrl,
            size: 'medium' as const,
            aspectRatio: 1,
            position: { row: 0, col: 1 },
            caption: prompt
          };
          await onGenerateStory(prompt, secondImageUrl, 'image', secondPanel);
          onPanelContentGenerating(secondPanel.id);

          // Check if we're using a 2x2 template
          const is2x2Template = onCheckTemplate?.();
          
          if (is2x2Template) {
            setGenerationState('reasoning');
            // Generate third panel using second image as reference
            console.log('🎨 Generating third panel for 2x2 template...');
            const thirdImageUrl = await lumaService.generateImage(prompt, secondImageUrl);
            if (thirdImageUrl) {
              console.log('🖼️ Third image generated:', thirdImageUrl);
              const thirdPanel = {
                id: nanoid(),
                type: 'image' as const,
                url: thirdImageUrl,
                size: 'medium' as const,
                aspectRatio: 1,
                position: { row: 1, col: 1 },
                caption: prompt
              };
              await onGenerateStory(prompt, thirdImageUrl, 'image', thirdPanel);
              onPanelContentGenerating(thirdPanel.id);

              // Generate video using third image as reference for 2x2 template
              console.log('🎥 Generating video panel using third image as reference...');
              const videoUrl = await lumaVideoService.generateVideo(prompt, thirdImageUrl);
              if (videoUrl) {
                console.log('🎥 Video generated:', videoUrl);
                const videoPanel = {
                  id: nanoid(),
                  type: 'video' as const,
                  url: videoUrl,
                  size: 'medium' as const,
                  aspectRatio: 1,
                  position: { row: 1, col: 0 },
                  caption: prompt
                };
                await onGenerateStory(prompt, videoUrl, 'video', videoPanel);
                onPanelContentGenerating(videoPanel.id);
              }
            }
          } else {
            // Generate video using first image as reference for 3-panel template
            console.log('🎥 Generating video panel using first image as reference...');
            const videoUrl = await lumaVideoService.generateVideo(prompt, firstImageUrl);
            if (videoUrl) {
              console.log('🎥 Video generated:', videoUrl);
              const videoPanel = {
                id: nanoid(),
                type: 'video' as const,
                url: videoUrl,
                size: 'medium' as const,
                aspectRatio: 1,
                position: { row: 0, col: 2 }, // Different position for 3-panel template
                caption: prompt
              };
              await onGenerateStory(prompt, videoUrl, 'video', videoPanel);
              onPanelContentGenerating(videoPanel.id);
            }
          }
        }

        setGenerationState('completed');
        setTimeout(() => {
          setGenerationState('idle');
          setPrompt('');
          setIsOpen(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationState('idle');
    }
  };

  const getGenerationText = () => {
    switch (generationState) {
      case 'generating':
        return 'Generating...';
      case 'dreaming':
        return 'Dreaming...';
      case 'inspiring':
        return 'Inspiring...';
      case 'reasoning':
        return 'Reasoning...';
      case 'completed':
        return 'Completed!';
      default:
        return (
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Generate
          </span>
        );
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setGenerationState('idle');
    setPrompt('');
    setReferenceFile(null);
  };

  return (
    <div className="relative">
      <style>{gradientStyle}</style>
      <AnimatePresence>
        {isOpen && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2"
            onSubmit={handleSubmit}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 bg-white rounded-full shadow-lg px-4 py-2 min-w-[300px]">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Tell Hon your story idea..."
                className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
                disabled={generationState !== 'idle'}
              />
              {referenceFile && (
                <Paperclip className="w-4 h-4 text-gray-400" />
              )}
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <button
                type="submit"
                disabled={generationState !== 'idle' || !prompt.trim()}
                className={`flex items-center gap-2 ${
                  generationState !== 'idle' && generationState !== 'completed'
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-transparent bg-clip-text animate-gradient'
                    : 'text-gray-700 hover:text-gray-900'
                } disabled:opacity-50`}
              >
                {getGenerationText()}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowTooltip(false);
        }}
        onMouseEnter={() => !isOpen && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative group"
        title="Tell Hon your story"
      >
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#4F96FF] text-white text-sm rounded whitespace-nowrap"
            >
              Tell Hon your story
            </motion.div>
          )}
        </AnimatePresence>
        <div className="rounded-full bg-white border-2 border-[#4F96FF] w-10 h-10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-[#4F96FF]" />
        </div>
      </button>
    </div>
  );
}; 