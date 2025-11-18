import React, { useState, useEffect } from 'react';
import { Panel, Template } from '../../types';
import { PanelEditor } from './PanelEditor';
import { nanoid } from 'nanoid';
import { mediaService } from '../../utils/mediaService';
import { Loader2, Users, Lock } from 'lucide-react';
import { useCollaboration } from '../../contexts/CollaborationContext';

interface Props {
  panels: Panel[];
  template: Template | null;
  onUpdatePanel: (panel: Panel, pageIndex: number) => void;
  onRemovePanel: (panelId: string) => void;
  onReorderPanels: (startIndex: number, endIndex: number, pageIndex: number) => void;
  onAddPanel?: (index: number) => void;
  pageIndex: number;
}

export const PanelGrid: React.FC<Props> = ({
  panels,
  template,
  onUpdatePanel,
  onRemovePanel,
  onReorderPanels,
  onAddPanel,
  pageIndex
}) => {
  const [uploadingPanels, setUploadingPanels] = useState<Record<number, boolean>>({});
  
  // Disable collaboration features temporarily
  const disableCollaboration = true;
  
  // Add collaboration context
  const { isPanelLocked, activeCollaborators, updatePresence, collaborators } = useCollaboration();
  
  // Only update presence with current page when the page changes if collaboration is active
  useEffect(() => {
    // Skip if collaboration is disabled
    if (disableCollaboration) return;
    
    // Only enable collaboration features if there are actual collaborators
    const hasCollaborators = collaborators && collaborators.length > 0;
    
    if (hasCollaborators) {
      updatePresence({ currentPageIndex: pageIndex });
    }
  }, [pageIndex, updatePresence, collaborators]);

  if (!template) {
    return (
      <div className="min-h-[700px] bg-gray-50 rounded-lg p-4 flex items-center justify-center">
        <p className="text-gray-500">Select a template to start</p>
      </div>
    );
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateRows: `repeat(${template.layout.rows}, minmax(0, 1fr))`,
    gridTemplateColumns: `repeat(${template.layout.cols}, minmax(0, 1fr))`,
    gap: '1.5rem',
    padding: '1.5rem',
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  };

  // Modify handleDrop to check if panel is being edited by someone else
  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    
    // Check if panel exists and is locked (skip if collaboration is disabled)
    const existingPanel = panels[index];
    if (!disableCollaboration && existingPanel && isPanelLocked(existingPanel.id)) {
      // Find who's editing this panel
      const editor = activeCollaborators.find(c => c.selectedPanelId === existingPanel.id);
      const editorName = editor ? editor.username : 'someone else';
      
      // Show a visual indication that the panel is locked (could use a toast here)
      console.warn(`Panel is currently being edited by ${editorName}`);
      return;
    }
    
    // Try to get panel data first
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const panel = JSON.parse(jsonData);
        panel.position = { ...template.layout.areas[index].position };
        onUpdatePanel(panel, pageIndex);
        return;
      } catch (error) {
        console.error('Failed to parse panel data:', error);
      }
    }
    
    // Fall back to file handling
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (uploadingPanels[index]) {
        return;
      }

      try {
        setUploadingPanels(prev => ({ ...prev, [index]: true }));
        
        // Upload to Cloudinary first
        const cloudinaryUrl = await mediaService.upload(file);
        
        // Create panel with final URL only
        const panel: Panel = {
          id: nanoid(),
          type: file.type.startsWith('video/') ? 'video' : 
                file.type.includes('gif') ? 'gif' : 'image',
          url: cloudinaryUrl,
          size: 'medium',
          aspectRatio: 1,
          position: { ...template.layout.areas[index].position }
        };
        
        // Single update with final URL
        onUpdatePanel(panel, pageIndex);
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

  // Function to render collaborator indicators for empty panels
  const renderCollaboratorIndicator = (index: number) => {
    // Skip if collaboration is disabled
    if (disableCollaboration) return null;
    
    // Only show collaborator indicators if there are actual collaborators
    const hasCollaborators = collaborators && collaborators.length > 0;
    if (!hasCollaborators) return null;
    
    // Check if this panel position has any active collaborators viewing/editing it
    const panelAtPosition = panels[index];
    if (!panelAtPosition) return null;
    
    const editor = activeCollaborators.find(c => c.selectedPanelId === panelAtPosition.id);
    if (!editor) return null;
    
    return (
      <div className="absolute top-2 right-2 z-10 bg-gray-800/80 backdrop-blur-sm p-1.5 rounded-full flex items-center space-x-1">
        <Lock className="w-4 h-4 text-red-400" />
        {editor.avatarUrl ? (
          <img 
            src={editor.avatarUrl} 
            alt={editor.username}
            className="w-4 h-4 rounded-full"
          />
        ) : (
          <Users className="w-4 h-4 text-blue-400" />
        )}
      </div>
    );
  };

  return (
    <div 
      id="comic-page-container"
      style={gridStyle} 
      className="min-h-[700px] bg-gray-50 dark:bg-gray-900 rounded-lg"
    >
      {template.layout.areas.map((area, index) => {
        const panel = panels[index];
        const gridItemStyle = {
          gridRow: `${area.position.row + 1} / span ${area.position.rowSpan || 1}`,
          gridColumn: `${area.position.col + 1} / span ${area.position.colSpan || 1}`,
        };

        if (!panel) {
          return (
            <div 
              key={`empty-${index}`} 
              style={gridItemStyle} 
              className="relative bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center group transition-colors duration-200"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="text-center p-6">
                <p className="text-sm text-gray-500 group-hover:text-gray-700">Drop here</p>
              </div>
            </div>
          );
        }

        return (
          <div key={panel.id} style={gridItemStyle} className="relative group">
            {uploadingPanels[index] && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
            
            {/* Add collaboration indicator */}
            {renderCollaboratorIndicator(index)}
            
            <PanelEditor
              panel={panel}
              onUpdate={(updatedPanel) => onUpdatePanel(updatedPanel, pageIndex)}
              onRemove={onRemovePanel}
            />
          </div>
        );
      })}
    </div>
  );
};