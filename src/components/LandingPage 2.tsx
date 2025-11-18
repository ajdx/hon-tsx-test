import { LoginOptions } from './auth/LoginOptions';
import { Circle, BookOpen, Palette, LayoutTemplate, Coins, FileText, MessageSquarePlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { SingularityBackground } from './SingularityBackground';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative bg-gray-900">
      <SingularityBackground />
      
      <div className="relative z-10 h-screen flex flex-col justify-between p-4">
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-6xl w-full">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6 opacity-75">
                <span className="text-8xl font-bold text-white -mr-1">H</span>
                <div className="flex items-center text-8xl translate-y-4 relative">
                  <Circle className="w-12 h-12 text-blue-400" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <span className="text-8xl font-bold text-white -ml-1">n</span>
              </div>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
                Where AI amplifies creativity, Web3 empowers creators, and storytelling evolves
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-colors">
            <div className="relative w-10 h-10 mb-3">
              <Palette className="w-8 h-8 text-blue-300 absolute top-1 left-1" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Enhanced Creation</h3>
            <p className="text-gray-300 text-sm">Upload, generate, edit images & videos, bringing your story to life. Use AI like a Pro, even if you aren't</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-colors">
            <div className="relative w-10 h-10 mb-3">
              <LayoutTemplate className="w-10 h-10 text-purple-400 absolute" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Interactive Narratives</h3>
            <p className="text-gray-300 text-sm">Create dynamic layouts for storyboards, comics, and more with multiple templates. Add expressive AI narration, for immersive storytelling</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-colors">
            <div className="relative w-10 h-10 mb-3">
              <Coins className="w-6 h-6 text-green-300 absolute bottom-0 right-0" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Create More, Earn More</h3>
            <p className="text-gray-300 text-sm">Share your story, track your growth, earn support, earn Solana</p>
          </div>
        </div>

        {/* Login Options */}
        <div className="flex justify-center mb-8">
          <LoginOptions />
        </div>

        {/* Bottom links */}
        <div className="absolute bottom-4 inset-x-4 flex justify-between text-sm">
          <a 
            href="/docs" 
            className="text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            <span>Documentation</span>
          </a>
          
          <a 
            href="/feedback" 
            className="text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Want more AI models? Let us know</span>
          </a>
        </div>
      </div>
    </div>
  );
}; 