import React, { useState, useEffect } from 'react';
import { X, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { landingPageHumeService, LandingHonSessionStatus } from '../../services/landingPageHumeService';
import { LandingPageHonIndicator } from './LandingPageHonIndicator';

interface LandingPageHonAssistantProps {
  onClose?: () => void;
}

export const LandingPageHonAssistant: React.FC<LandingPageHonAssistantProps> = ({ onClose }) => {
  const [sessionStatus, setSessionStatus] = useState<LandingHonSessionStatus>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const suggestedQuestions = [
    "What makes Hon different from other creative tools?",
    "How does voice-to-voice creation work?",
    "How do I publish Stories and earn tips?",
    "What's Hon's mission?"
  ];

  useEffect(() => {
    // Subscribe to session status changes
    const unsubscribeStatus = landingPageHumeService.onStatusChange((status) => {
      console.log('Landing Page Hon Assistant: Session status changed to:', status);
      setSessionStatus(status);
      if (status === 'connecting') {
        setIsConnecting(true);
      } else {
        setIsConnecting(false);
      }
    });

    // Start the session when component mounts
    const initSession = async () => {
      console.log('Landing Page Hon Assistant: Initializing session...');
      setIsConnecting(true);
      setSessionStatus('connecting');
      
      try {
        // Session initialization (debug logs removed for production)
        const success = await landingPageHumeService.startSession();
        if (!success) {
          console.error('Failed to start landing page Hon session');
          setIsConnecting(false);
          setSessionStatus('error');
        }
      } catch (error) {
        console.error('Error during session initialization:', error);
        setIsConnecting(false);
        setSessionStatus('error');
      }
    };

    initSession();

    // Cleanup function
    return () => {
      console.log('Landing Page Hon Assistant: Cleaning up...');
      unsubscribeStatus();
      // End session when component unmounts
      landingPageHumeService.endSession();
    };
  }, []);

  // Rotate through questions every 4 seconds
  useEffect(() => {
    if (sessionStatus === 'active') {
      const interval = setInterval(() => {
        setCurrentQuestionIndex((prev) => (prev + 1) % suggestedQuestions.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [sessionStatus, suggestedQuestions.length]);

  const handleClose = () => {
    // End the session before closing
    landingPageHumeService.endSession();
    onClose?.();
  };



  const getStatusText = () => {
    switch (sessionStatus) {
      case 'connecting':
        return 'Connecting to Hon...';
      case 'active':
        return 'Hon is listening';
      case 'error':
        return 'Connection error - please try again';
      default:
        return 'Initializing...';
    }
  };

  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'connecting':
        return 'text-yellow-400';
      case 'active':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && sessionStatus !== 'active') {
          handleClose();
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <LandingPageHonIndicator size="lg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Talk to Hon
              </h2>
              <p className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sessionStatus === 'active' && (
              <button
                onClick={handleClose}
                className="p-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors group"
                title="End call"
              >
                <Phone className="w-5 h-5 text-white transform rotate-[135deg] group-hover:scale-110 transition-transform" />
              </button>
            )}
            {sessionStatus !== 'active' && (
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Visual Indicator Area */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4">
              <LandingPageHonIndicator size="lg" className="scale-150" />
            </div>
            
            {sessionStatus === 'active' && (
              <div className="text-center">
                <p className="text-gray-900 mb-2">
                  Speak naturally with Hon
                </p>
                <p className="text-sm text-gray-600">
                  Hon can help you learn about our platform, features, and how to get started creating stories.
                </p>
              </div>
            )}

            {sessionStatus === 'connecting' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4 mx-auto"></div>
                <p className="text-gray-900">
                  Setting up your conversation with Hon...
                </p>
              </div>
            )}

            {sessionStatus === 'error' && (
              <div className="text-center">
                <p className="text-red-400 mb-4">
                  Unable to connect to Hon. Please check your internet connection and try again.
                </p>
                <button
                  onClick={() => landingPageHumeService.startSession()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>



          {/* Help Text with Rotating Questions */}
          <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4 min-h-[60px] flex items-center justify-center">
            <div className="relative w-full">
              <p className="mb-1 font-medium text-gray-600">Try asking:</p>
              <div className="relative h-[40px] overflow-hidden">
                {suggestedQuestions.map((question, index) => (
                  <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: currentQuestionIndex === index ? 1 : 0,
                      y: currentQuestionIndex === index ? 0 : 20
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center text-gray-700 px-4"
                  >
                    "{question}"
                  </motion.p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 