import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { mediaService } from '../services/mediaService';
import { Panel } from '../types';

interface PanelGridProps {
  onUpdatePanel: (panel: Panel, pageIndex: number) => void;
  onAddPanel?: (index: number) => void;
  // ...other props as needed
}

const PanelGrid: React.FC<PanelGridProps> = ({ onUpdatePanel, onAddPanel }) => {
  const [uploadingPanels, setUploadingPanels] = useState<Record<number, boolean>>({});
  const [template, setTemplate] = useState<any>(null);
  const [pageIndex, setPageIndex] = useState<number>(0);

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove highlight
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    
    // Handle both dragged files and dragged images
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Prevent upload if panel is already uploading
      if (uploadingPanels[index]) {
        return;
      }

      try {
        setUploadingPanels(prev => ({ ...prev, [index]: true }));
        
        // Create temporary preview immediately
        const tempUrl = URL.createObjectURL(file);
        const panelId = nanoid(); // Generate ID once
        const is3DFile = file.type === 'model/gltf-binary' || file.name.endsWith('.glb');
        const panelType = is3DFile ? '3d' : file.type.startsWith('video/') ? 'video' : file.type.includes('gif') ? 'gif' : 'image';
        const tempPanel: Panel = {
          id: panelId,
          type: panelType as Panel['type'],
          url: tempUrl,
          size: 'medium',
          aspectRatio: 1,
          position: { ...template.layout.areas[index].position },
          caption: ''
        };
        
        // Show temp preview immediately
        onUpdatePanel(tempPanel, pageIndex);

        // Upload to Cloudinary in background
        const cloudinaryUrl = await mediaService.upload(file);
        
        // Update with final Cloudinary URL, keeping the same ID
        const finalPanel = { ...tempPanel, url: cloudinaryUrl };
        onUpdatePanel(finalPanel, pageIndex);

        // Cleanup
        URL.revokeObjectURL(tempUrl);
        setUploadingPanels(prev => ({ ...prev, [index]: false }));
      } catch (error) {
        console.error('Failed to upload file:', error);
        alert('Failed to upload file. Please try again.');
        setUploadingPanels(prev => ({ ...prev, [index]: false }));
      }
    } else if (onAddPanel) {
      onAddPanel(index);
    }
  };

  return (
    <div>
      {/* Render your panel grid here */}
    </div>
  );
};

export default PanelGrid; 