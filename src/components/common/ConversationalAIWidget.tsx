import React, { useEffect } from 'react';

// Add type declaration for the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'agent-id': string;
        },
        HTMLElement
      >;
    }
  }
}

interface ConversationalAIWidgetProps {
  position: 'bottom-left' | 'bottom-right' | 'side';
  className?: string;
}

export const ConversationalAIWidget: React.FC<ConversationalAIWidgetProps> = ({ 
  position,
  className = ''
}) => {
  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://elevenlabs.io/convai-widget/index.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://elevenlabs.io/convai-widget/index.js';
      script.async = true;
      script.type = 'text/javascript';
      
      // Wait for script to load before initializing
      script.onload = () => {
        // Check if custom element is already defined
        if (!customElements.get('elevenlabs-convai')) {
          // Let the script handle registration
          console.log('Script loaded, waiting for custom element registration');
        }
      };
      
      script.onerror = (error) => {
        console.error('Failed to load widget script:', error);
      };
      
      document.body.appendChild(script);
      
      return () => {
        script.remove();
      };
    }
  }, []);

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'side':
        return 'top-1/2 -translate-y-1/2 right-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  return (
    <div className={`fixed ${getPositionStyles()} z-50 ${className}`}>
      <elevenlabs-convai agent-id="k67PXCnLrvh8T4xazM1Q"></elevenlabs-convai>
    </div>
  );
}; 