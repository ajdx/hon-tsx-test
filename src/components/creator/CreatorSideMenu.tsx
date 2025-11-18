import React, { useRef, useState } from 'react';
import { Minus, ChevronDown } from 'lucide-react';
import { Template, Panel, Comic } from '../../types';
import { CoverUploader } from './CoverUploader';
import { AIControls } from './AIControls';
import { NarrationEditor } from './NarrationEditor';
import { TitleEditor } from './TitleEditor';
import { TemplateSelector } from './TemplateSelector';
import { ImageToVideo } from './ImageToVideo';
import { ImageToVideoReference } from './ImageToVideoReference';
import { TextToVideo } from './TextToVideo';
import honLogo from '../../assets/hon-logo.svg';


interface CreatorSideMenuProps {
  onTemplateSelect: (template: Template) => void;
  onGenerate?: (prompt: string, model: 'flux' | 'ideogram' | 'flux-dev') => Promise<string>;
  onEdit?: (prompt: string, imageUrl: string) => Promise<void>;
  selectedImageUrl?: string;
  onClearSelection?: () => void;
  onAddPanel?: (panel: Panel) => void;
  currentTemplate: Template | null;
  comic: Comic | null;
  onUpdateTitle: () => void;
  recentGenerations?: any[];
  onSelectGeneration?: () => void;
  onGenerateStory: (prompt: string, generatedUrl: string, type: 'image' | 'video' | 'gif', panel?: Panel) => Promise<void>;
}

export const CreatorSideMenu: React.FC<CreatorSideMenuProps> = ({
  onTemplateSelect,
  onGenerate,
  onEdit,
  selectedImageUrl,
  onClearSelection,
  onAddPanel,
  currentTemplate,
  comic,
  onUpdateTitle,
  recentGenerations,
  onSelectGeneration,
  onGenerateStory
}) => {
  const sideMenuRef = useRef<HTMLDivElement>(null);
  
  // Collapsible section states
  const [isLayoutTemplateOpen, setIsLayoutTemplateOpen] = useState(true);
  const [isCoverArtOpen, setIsCoverArtOpen] = useState(true);
  const [isVideoGenerationOpen, setIsVideoGenerationOpen] = useState(true);
  const [isCharacterReferenceOpen, setIsCharacterReferenceOpen] = useState(true);
  const [isImageToVideoOpen, setIsImageToVideoOpen] = useState(true);
  const [isAINarrationOpen, setIsAINarrationOpen] = useState(true);

  console.log('CreatorSideMenu: Received recentGenerations:', recentGenerations);

  return (
    <div
      ref={sideMenuRef}
      className="fixed top-0 left-0 h-screen bg-gray-800 shadow-lg w-80 z-30"
      style={{
        width: '320px'
      }}
    >
      <div className="h-full overflow-y-auto">
        {/* Hon Logo Section with Title Editor */}
        <div className="bg-gray-800 box-border flex flex-col gap-6 items-start justify-start pb-6 pt-10 px-6">
          <div className="flex flex-row gap-2.5 items-end justify-start w-full">
            <img src={honLogo} alt="Hon Logo" className="h-10" />
          </div>
          
          {/* Title Editor directly integrated */}
          <div className="w-full">
            <TitleEditor />
          </div>
        </div>

          {/* Sections Container */}
          <div className="bg-gray-800 flex flex-col">
            {/* Layout Template */}
            <div className="bg-gray-800 box-border flex flex-col items-start justify-start p-[24px] w-full">
              <button
                onClick={() => setIsLayoutTemplateOpen(!isLayoutTemplateOpen)}
                className="box-border flex flex-row items-center justify-between w-full cursor-pointer p-0 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center space-x-2">
                  <h2 className="font-['Inter'] font-bold text-[20px] text-white leading-[0] not-italic text-left">
                    Layout Template
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center p-0 w-5 h-5">
                  <ChevronDown className={`w-3 h-3 text-white transition-transform ${isLayoutTemplateOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isLayoutTemplateOpen && (
                <div className="mt-6 w-full">
                  <TemplateSelector 
                    onSelect={onTemplateSelect}
                    selectedTemplate={currentTemplate}
                  />
                </div>
              )}
            </div>

            {/* Cover Art */}
            <div className="bg-gray-800 box-border flex flex-col items-start justify-start p-[24px] w-full">
              <button
                onClick={() => setIsCoverArtOpen(!isCoverArtOpen)}
                className="box-border flex flex-row items-center justify-between w-full cursor-pointer p-0 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center space-x-2">
                  <h2 className="font-['Inter'] font-bold text-[20px] text-white leading-[0] not-italic text-left">
                    Cover Art
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center p-0 w-5 h-5">
                  <ChevronDown className={`w-3 h-3 text-white transition-transform ${isCoverArtOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isCoverArtOpen && (
                <div className="mt-6 w-full">
                  <CoverUploader />
                </div>
              )}
            </div>

            {/* Video Generation */}
            <div className="bg-gray-800 box-border flex flex-col items-start justify-start p-[24px] w-full">
              <button
                onClick={() => setIsVideoGenerationOpen(!isVideoGenerationOpen)}
                className="box-border flex flex-row items-center justify-between w-full cursor-pointer p-0 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center space-x-2">
                  <h2 className="font-['Inter'] font-bold text-[20px] text-white leading-[0] not-italic text-left">
                    Video Generation
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center p-0 w-5 h-5">
                  <ChevronDown className={`w-3 h-3 text-white transition-transform ${isVideoGenerationOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isVideoGenerationOpen && (
                <div className="mt-6 w-full">
                  <div className="space-y-4">
                    <TextToVideo onGenerateStory={onGenerateStory} />
                  </div>
                </div>
              )}
            </div>

            {/* Image Generation (formerly Character Reference) */}
            <div className="bg-gray-800 box-border flex flex-col items-start justify-start p-[24px] w-full">
              <button
                onClick={() => setIsCharacterReferenceOpen(!isCharacterReferenceOpen)}
                className="box-border flex flex-row items-center justify-between w-full cursor-pointer p-0 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center space-x-2">
                  <h2 className="font-['Inter'] font-bold text-[20px] text-white leading-[0] not-italic text-left">
                    Image Generation
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center p-0 w-5 h-5">
                  <ChevronDown className={`w-3 h-3 text-white transition-transform ${isCharacterReferenceOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isCharacterReferenceOpen && (
                <div className="mt-6 w-full">
                  <AIControls
                    onGenerate={onGenerate}
                    onEdit={onEdit}
                    selectedImageUrl={selectedImageUrl}
                    onClearSelection={onClearSelection}
                    onAddPanel={onAddPanel}
                    onGenerateStory={onGenerateStory}
                    recentGenerations={recentGenerations}
                  />
                </div>
              )}
            </div>

            {/* Image to Video */}
            <div className="bg-gray-800 box-border flex flex-col items-start justify-start p-[24px] w-full">
              <button
                onClick={() => setIsImageToVideoOpen(!isImageToVideoOpen)}
                className="box-border flex flex-row items-center justify-between w-full cursor-pointer p-0 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center space-x-2">
                  <h2 className="font-['Inter'] font-bold text-[20px] text-white leading-[0] not-italic text-left">
                    Image to Video
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center p-0 w-5 h-5">
                  <ChevronDown className={`w-3 h-3 text-white transition-transform ${isImageToVideoOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isImageToVideoOpen && (
                <div className="mt-6 w-full">
                  <div className="space-y-4">
                    <ImageToVideo onGenerateStory={onGenerateStory} />
                    <ImageToVideoReference onGenerateStory={onGenerateStory} />
                  </div>
                </div>
              )}
            </div>



            {/* AI Narration */}
            <div className="bg-gray-800 box-border flex flex-col items-start justify-start p-[24px] w-full">
              <button
                onClick={() => setIsAINarrationOpen(!isAINarrationOpen)}
                className="box-border flex flex-row items-center justify-between w-full cursor-pointer p-0 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center space-x-2">
                  <h2 className="font-['Inter'] font-bold text-[20px] text-white leading-[0] not-italic text-left">
                    AI Narration
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center p-0 w-5 h-5">
                  <ChevronDown className={`w-3 h-3 text-white transition-transform ${isAINarrationOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isAINarrationOpen && (
                <div className="mt-6 w-full">
                  <NarrationEditor />
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};
