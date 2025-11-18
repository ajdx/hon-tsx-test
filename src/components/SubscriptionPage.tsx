import React from 'react';
import { useNavigate } from 'react-router-dom';
import honLogo from '../assets/hon-logo.svg';

interface PlanCardProps {
  tier: 'free' | 'starter' | 'pro' | 'studio';
  isRecommended?: boolean;
}

const planData = {
  free: {
    name: 'FREE',
    price: '$0',
    caption: '/month',
    description: 'Details to be released',
    features: [
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released'
    ]
  },
  starter: {
    name: 'STARTER',
    price: '$19',
    caption: '/month',
    description: 'Details to be released',
    features: [
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released'
    ]
  },
  pro: {
    name: 'PRO',
    price: '$39',
    caption: '/month',
    description: 'Details to be released',
    features: [
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released'
    ]
  },
  studio: {
    name: 'STUDIO',
    price: '$89',
    caption: '/month',
    description: 'Details to be released',
    features: [
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released',
      'Details to be released'
    ]
  }
};

function PlanCard({ tier, isRecommended = false }: PlanCardProps) {
  const navigate = useNavigate();
  const plan = planData[tier];

  const handleSelectPlan = () => {
    navigate('/login');
  };

  return (
    <div className="relative h-[580px] sm:h-[632px] w-full max-w-[330px] mx-auto">
      {/* Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-[8px] bg-white/10 rounded-3xl z-10 pointer-events-none"></div>
      
      {/* Header */}
      <div className={`absolute bg-white bottom-[72.47%] box-border content-stretch flex flex-col gap-3 items-start justify-start left-0 pb-[60px] pt-10 px-5 right-0 rounded-tl-[24px] rounded-tr-[24px] top-0 z-15 ${isRecommended ? 'border-2 border-purple-500' : 'border border-[#dde3eb]'}`}>
        
        {/* Recommended Badge */}
        {isRecommended && (
          <div className="absolute bg-[#872cff] box-border content-stretch flex flex-row gap-2.5 items-start justify-center left-1/2 pb-[5px] pt-1 px-3 rounded-bl-[6px] rounded-br-[6px] top-0 translate-x-[-50%] z-20">
            <div className="flex flex-col font-bold justify-center leading-[0] not-italic relative shrink-0 text-white text-[10px] text-left text-nowrap tracking-[2px]">
              <p className="block leading-[normal] whitespace-pre">RECOMMENDED</p>
            </div>
          </div>
        )}

        <div className="flex flex-col font-['Inter'] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#070a0d] text-[18px] sm:text-[20px] text-left w-full">
          <p className="block leading-[normal]">{plan.name}</p>
        </div>
        <div className="flex flex-col font-['Inter'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#070a0d] text-[14px] sm:text-[16px] text-left w-full">
          <p className="block leading-[1.5]">{plan.description}</p>
        </div>
      </div>

      {/* Content Card */}
      <div className="absolute bg-[#f0f3f7] box-border content-stretch flex flex-col gap-[27px] items-start justify-start left-0 pb-[60px] pt-[30px] px-5 right-0 rounded-3xl translate-y-[-50%] border border-[#dde3eb] z-15" style={{ top: "calc(50% + 91.5px)" }}>
        
        {/* Price Section */}
        <div className="box-border content-stretch flex flex-col gap-[30px] items-start justify-start p-0 relative shrink-0 w-full">
          <div className="box-border content-stretch flex flex-col gap-3 items-start justify-start leading-[0] not-italic p-0 relative shrink-0 text-[#070a0d] text-left w-full">
            <div className="flex flex-col font-['Inter'] font-bold justify-center relative shrink-0 text-[32px] sm:text-[39px] w-full">
              <p className="block leading-[normal]">{plan.price}</p>
            </div>
            <div className="flex flex-col font-['Inter'] font-normal justify-center relative shrink-0 text-[12px] sm:text-[14px] w-full">
              <p className="block leading-[normal]">{plan.caption}</p>
            </div>
          </div>
          
          {/* Select Plan Button */}
          <button
            onClick={handleSelectPlan}
            className="bg-[#872cff] hover:bg-[#7a28e6] transition-colors box-border content-stretch flex flex-row gap-2.5 h-[50px] items-center justify-center px-[30px] py-5 relative rounded-[106px] shrink-0 w-full border border-[#6f00ff] z-20"
          >
            <div className="flex flex-col font-['Inter'] font-bold justify-center leading-[0] not-italic relative shrink-0 text-white text-[14px] sm:text-[16px] text-left text-nowrap">
              <p className="block leading-[1.5] whitespace-pre">Select plan</p>
            </div>
          </button>
        </div>

        {/* Features List */}
        <div className="box-border content-stretch flex flex-col font-['Inter'] font-normal gap-[18px] items-start justify-start leading-[0] not-italic p-0 relative shrink-0 text-[#070a0d] text-[16px] text-left w-full">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex flex-col justify-center relative shrink-0 w-full">
              <p className="block leading-[1.5]">{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="box-border content-stretch flex flex-col gap-[18px] items-start justify-start pl-10 pr-0 py-[30px] relative size-full">
      <div className="box-border content-stretch flex flex-row font-normal gap-7 items-start justify-start leading-[0] not-italic p-0 relative shrink-0 text-[#929eaf] text-[12px] text-left text-nowrap w-full">
        <div className="flex flex-col justify-center relative shrink-0">
          <p className="block leading-[normal] text-nowrap whitespace-pre">Hon ©2025. All rights reserved.</p>
        </div>
        <div className="flex flex-col justify-center relative shrink-0">
          <a href="/terms" className="block leading-[normal] text-nowrap whitespace-pre hover:text-[#070a0d] transition-colors">Terms of Use</a>
        </div>
        <div className="flex flex-col justify-center relative shrink-0">
          <a href="mailto:info@tellhon.com" className="block leading-[normal] text-nowrap whitespace-pre hover:text-[#070a0d] transition-colors">Contact</a>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 box-border backdrop-blur-[12.5px] backdrop-filter bg-[rgba(255,255,255,0.01)] border-b border-gray-200 h-20 flex items-center justify-center">
        <div className="w-full max-w-[1400px] flex items-center justify-between px-4 sm:px-6 lg:px-10">
          {/* Logo Section */}
          <div 
            className="flex items-center justify-center relative w-[70px] cursor-pointer"
            onClick={() => handleNavigation('/')}
          >
            <img 
              src={honLogo} 
              alt="Hon Logo" 
              className="h-7 transition-all duration-300"
              style={{ 
                filter: 'invert(1)'
              }}
            />
          </div>
          
          {/* Navigation Items */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-[30px]">
            <div className="hidden sm:flex items-center">
              <div className="flex items-center justify-center px-3 sm:px-5">
                <span 
                  className="font-['Inter'] font-bold text-[14px] sm:text-[16px]"
                  style={{ 
                    color: '#000000'
                  }}
                >
                  Subscribe
                </span>
              </div>
            </div>
            <div className="bg-[#070a0d] flex items-center justify-center h-[34px] px-3 sm:px-4 rounded-[106px]">
              <button 
                onClick={() => handleNavigation('/login')}
                className="font-['Inter'] font-bold text-[#ffffff] text-[12px] sm:text-[14px] hover:opacity-80 transition-opacity"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-20">
        {/* Header Content */}
        <div className="w-full px-4 sm:px-6 lg:px-10 py-12 sm:py-16 lg:py-20">
          <div className="max-w-[898px] mx-auto text-center">
            <h1 className="font-['Inter'] font-bold text-2xl sm:text-3xl lg:text-[39px] text-black mb-4 leading-tight">
              Join The Waitlist
            </h1>
            <p className="font-['Inter'] font-normal text-sm sm:text-base lg:text-[16px] text-[#929eaf] leading-relaxed max-w-[644px] mx-auto">
              Describe yourself as "Creator" when signing up to be selected for our Beta.
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="w-full px-4 sm:px-6 lg:px-10 pb-12 sm:pb-16 lg:pb-20">
          <div className="max-w-[1200px] mx-auto">
            {/* Desktop: 4 columns */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-6 xl:gap-8">
              <PlanCard tier="free" />
              <PlanCard tier="starter" />
              <PlanCard tier="pro" isRecommended={true} />
              <PlanCard tier="studio" />
            </div>
            
            {/* Tablet: 2 columns */}
            <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-6 mb-6">
              <PlanCard tier="free" />
              <PlanCard tier="starter" />
            </div>
            <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-6">
              <PlanCard tier="pro" isRecommended={true} />
              <PlanCard tier="studio" />
            </div>
            
            {/* Mobile: 1 column */}
            <div className="md:hidden space-y-6">
              <PlanCard tier="free" />
              <PlanCard tier="starter" />
              <PlanCard tier="pro" isRecommended={true} />
              <PlanCard tier="studio" />
            </div>
          </div>
        </div>

        {/* Model Inventory Section */}
        <div className="w-full px-4 sm:px-6 lg:px-10 pb-12 sm:pb-16 lg:pb-20">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="font-['Inter'] text-2xl sm:text-3xl font-bold text-[#070a0d] mb-4">
                SOTA AI models and services
              </h2>
            </div>
            
            <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-[#dde3eb]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Image Generation */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#dde3eb]">
                  <h3 className="font-['Inter'] font-bold text-[#070a0d] mb-3 text-sm sm:text-base">
                    Image Generation (10 Models)
                  </h3>
                  <div className="space-y-2 font-['Inter'] text-[#929eaf] text-xs sm:text-sm">
                    <p>• Luma Photon Flash, Flux Krea, Flux Dev</p>
                    <p>• Ideogram 3.0, Bria, Recraft v3</p>
                    <p>• GPT-Image-1, Imagen 4, Flux Pro</p>
                    <p>• Runway Text-to-Image, Runway References</p>
                  </div>
                </div>

                {/* Video Generation */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#dde3eb]">
                  <h3 className="font-['Inter'] font-bold text-[#070a0d] mb-3 text-sm sm:text-base">
                    Video Generation (9 Models)
                  </h3>
                  <div className="space-y-2 font-['Inter'] text-[#929eaf] text-xs sm:text-sm">
                    <p>• Seedance, Pika, Hailuo/Minimax</p>
                    <p>• Kling 2.0, Kling 2.1 Pro</p>
                    <p>• Veo3-Fast, Vidu, Runway Gen-4</p>
                    <p>• Luma Ray-2</p>
                  </div>
                </div>

                {/* Video Modifications */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#dde3eb]">
                  <h3 className="font-['Inter'] font-bold text-[#070a0d] mb-3 text-sm sm:text-base">
                    Video Modifications (3 Models)
                  </h3>
                  <div className="space-y-2 font-['Inter'] text-[#929eaf] text-xs sm:text-sm">
                    <p>• Luma Ray-2 Modify</p>
                    <p>• Runway Act Two</p>
                    <p>• Runway Aleph</p>
                  </div>
                </div>

                {/* Specialized Services */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#dde3eb]">
                  <h3 className="font-['Inter'] font-bold text-[#070a0d] mb-3 text-sm sm:text-base">
                    3D & Narration (3 Models)
                  </h3>
                  <div className="space-y-2 font-['Inter'] text-[#929eaf] text-xs sm:text-sm">
                    <p>• Hunyuan3D (3D Generation)</p>
                    <p>• ElevenLabs (AI Narration)</p>
                    <p>• Hume Octave (Premium Voice)</p>
                  </div>
                </div>

                {/* AI Tools */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#dde3eb]">
                  <h3 className="font-['Inter'] font-bold text-[#070a0d] mb-3 text-sm sm:text-base">
                    AI Tools & Companions (2 Services)
                  </h3>
                  <div className="space-y-2 font-['Inter'] text-[#929eaf] text-xs sm:text-sm">
                    <p>• Prompt Optimizer (Claude)</p>
                    <p>• Hon AI Collab Sessions</p>
                  </div>
                </div>

                {/* Unique Features */}
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#dde3eb]">
                  <h3 className="font-['Inter'] font-bold text-[#070a0d] mb-3 text-sm sm:text-base">
                    Creator Platform Features
                  </h3>
                  <div className="space-y-2 font-['Inter'] text-[#929eaf] text-xs sm:text-sm">
                    <p>• Real-time collaboration</p>
                    <p>• Solana-based monetization</p>
                    <p>• Story creation tools</p>
                    <p>• Export & sharing</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <Footer />
        </div>
      </footer>
    </div>
  );
} 