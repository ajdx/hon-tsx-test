import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Phone, Volume2, VolumeX } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LandingPageHonAssistant } from './common/LandingPageHonAssistant';
import { LandingPageHonIndicator } from './common/LandingPageHonIndicator';

// Import actual model logos from assets
import veo3Logo from '../assets/veo3modelcion.png';
import fluxLogo from '../assets/fluxmodelcion.png';
import imagen4Logo from '../assets/image1modelcion.png';
import ray2Logo from '../assets/ray2modelcion.png';
import humeLogo from '../assets/humeoctavemodelcion.png';
import ideogramLogo from '../assets/ideogrammodelcion.png';
import runwayLogo from '../assets/runwaycion.png';
import elevenlabsLogo from '../assets/elevenlabscion.png';
import hunyuanLogo from '../assets/huanyuancion.png';
import pikaLogo from '../assets/pikacion.png';
import klingLogo from '../assets/klingcion.png';
import recraftLogo from '../assets/recraftcion.png';
import briaLogo from '../assets/briacion.jpg';
import seedanceLogo from '../assets/seedancecion.png';
import honLogo from '../assets/hon-logo.svg';

// Hero background videos for carousel
const heroVideos = [
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759090410/hon-comics/hon-remote-1759090408864.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759090158/hon-comics/hon-remote-1759090157461.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759088651/hon-comics/hon-remote-1759088651119.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759089540/hon-comics/hon-remote-1759089539697.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759087951/hon-comics/hon-remote-1759087950321.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759087618/hon-comics/hon-remote-1759087617340.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759087172/hon-comics/hon-remote-1759087171806.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759086745/hon-comics/hon-remote-1759086743717.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759085367/hon-comics/hon-remote-1759085366560.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1759084314/hon-comics/hon-remote-1759084313559.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1758899262/hon-comics/hon-remote-1758899260652.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1758807943/hon-remote-1758565550938_avp1ma.mp4"
];

// Collaboration section videos for "Speak your Ideas into existence"
const collaborationVideos = [
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1753181035/g4NUTn6wAXeL0WvTJRxvc_output_xoq0dx.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737821135/kken7aq3fm9sa8fslphu.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737725343/q4xw2bcf9iicvjapdwog.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737722943/byalgw4qijochkmc8enk.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1755382468/hon-comics/hon-remote-1755382467873.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1755382731/hon-comics/hon-remote-1755382731841.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1754755450/hon-comics/hon-remote-1754755450593.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1742178844/uknkfhy52rifcjmihxzk.mp4"
];

// Hon demo videos: handled directly on the <video> elements below (two clips only)

// AI Model data with actual logo files
const aiModels = [
  { name: 'Veo 3', logo: veo3Logo },
  { name: 'Flux', logo: fluxLogo },
  { name: 'Image-1', logo: imagen4Logo },
  { name: 'Ray 2', logo: ray2Logo },
  { name: 'Hume Octave', logo: humeLogo },
  { name: 'Ideogram', logo: ideogramLogo },
  { name: 'Runway', logo: runwayLogo },
  { name: 'Eleven Labs', logo: elevenlabsLogo },
  { name: 'Hunyuan', logo: hunyuanLogo },
  { name: 'Pika', logo: pikaLogo },
  { name: 'Kling', logo: klingLogo },
  { name: 'Recraft', logo: recraftLogo },
  { name: 'Bria', logo: briaLogo },
  { name: 'Seadance', logo: seedanceLogo }
];

// Sample story data - supports both videos and images
const sampleStories = [
  {
    id: 1,
    creator: "40rge",
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737831905/zkqyrtqv2zphvzifp24z.mp4",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1741875825/ssjp8m9sazb1yjakxlbb.jpg"
  },
  {
    id: 2,
    creator: "Alex", 
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737488526/huodxykcghmpzgqacerw.mp4",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1737428271/ojwa4kj6xouavjukzmxc.jpg"
  },
  {
    id: 3,
    creator: "0xJackie",
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1738557031/h2mdrergcjumm7qjkyiz.mp4",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1736999301/orihyxp0a4pcv7vfebqh.jpg"
  },
  {
    id: 4,
    creator: "Gojo23",
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1742135429/ppvkmpobai93co8cyugu.mov",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1736306764/hcwtafjv4j0d6kxdeb74.jpg"
  },
  {
    id: 5,
    creator: "Erin",
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1736469590/mwpv4qbtqa2jkxjfyojl.mp4",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1742364172/raliq39cmkifyf7yrvsy.png"
  },
  {
    id: 6,
    creator: "sylvai",
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1753216245/ja4c8Gn5CNiQrle5ZWsT2_output_pdz9f4.mp4",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1742145133/rtydgwj3b1u1r1nrpind.jpg"
  },
  {
    id: 7,
    creator: "aridraws",
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1753215402/GSNL__vSGYVtB-esWNQkW_output_by1tz8.mp4",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1744424376/f3vp9csrak8u3qtwm7fu.png"
  },
  {
    id: 8,
    creator: "kenji",
    media: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1754067507/hightechlens_rmsaw8.mp4",
    type: "video",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1745373842/jzc5wvrhqnpbjwxownht.jpg"
  }
];

function PaginationControl() {
  return (
    <div className="flex items-center gap-4">
      <button className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>
      <div className="flex gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
      </div>
      <button className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
}

export default function LandingPage() {

  const [scrolled, setScrolled] = useState(false);
  const [navTextColor, setNavTextColor] = useState('#FFFFFF'); // Dynamic nav text color - start with white over video
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0); // 0 for video1, 1 for video2
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [showLandingHonAssistant, setShowLandingHonAssistant] = useState(false);
  // Collaboration video state
  const [collabCurrentVideoIndex, setCollabCurrentVideoIndex] = useState(0);
  const [collabActiveVideoIndex, setCollabActiveVideoIndex] = useState(0);
  const [collabIsTransitioning, setCollabIsTransitioning] = useState(false);
  
  // Hon demo video state
  const [honDemoVideoMuted, setHonDemoVideoMuted] = useState(true);
  const [honDemoCurrentVideo, setHonDemoCurrentVideo] = useState(0); // 0 for first video, 1 for second
  
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const collabVideo1Ref = useRef<HTMLVideoElement>(null);
  const collabVideo2Ref = useRef<HTMLVideoElement>(null);
  const honDemoVideo1Ref = useRef<HTMLVideoElement>(null);
  const honDemoVideo2Ref = useRef<HTMLVideoElement>(null);

  const navigate = useNavigate();

  // Redirect mobile users to the mobile waitlist page
  React.useEffect(() => {
    const isMobile = window.innerWidth <= 480 || /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
      navigate('/m', { replace: true });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 0;
      setScrolled(isScrolled);
      
      // Change navigation colors based on scroll position
      // When at top (hero section with gradient), use black text
      // When scrolled (over content), adjust as needed
      const heroSectionHeight = window.innerHeight; // Assuming hero is min-h-screen
      
      if (window.scrollY < heroSectionHeight - 100) {
        // At top and over hero video section - use white text
        setNavTextColor('#FFFFFF'); // White text over video background
      } else {
        // Past hero section - switch to black for white background
        setNavTextColor('#000000'); // Black text over white background
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Set initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize first video on mount
  useEffect(() => {
    const video1 = video1Ref.current;
    if (!video1) return;

    video1.src = heroVideos[0];
    video1.load();
    video1.play().catch(console.error);

    // Performance monitoring (development only)
    if (import.meta.env.DEV) {
      console.log('🎥 Hero video carousel initialized with dual-video system');
      
      // Monitor memory usage
      const logMemoryUsage = () => {
        if ('memory' in performance) {
          const memInfo = (performance as any).memory;
          console.log('📊 Video Memory Usage:', {
            used: `${(memInfo.usedJSHeapSize / 1048576).toFixed(2)}MB`,
            total: `${(memInfo.totalJSHeapSize / 1048576).toFixed(2)}MB`,
            limit: `${(memInfo.jsHeapSizeLimit / 1048576).toFixed(2)}MB`
          });
        }
      };
      
      // Log initial memory
      logMemoryUsage();
      
      // Monitor every 30 seconds
      const memoryInterval = setInterval(logMemoryUsage, 30000);
      
      return () => clearInterval(memoryInterval);
    }
  }, []);

  // Video carousel management with smooth transitions
  useEffect(() => {
    const activeVideo = activeVideoIndex === 0 ? video1Ref.current : video2Ref.current;
    if (!activeVideo) return;

    const handleVideoEnd = () => {
      const nextVideoIndex = (currentVideoIndex + 1) % heroVideos.length;
      const inactiveVideo = activeVideoIndex === 0 ? video2Ref.current : video1Ref.current;
      
      if (inactiveVideo) {
        // Preload next video on inactive video element
        inactiveVideo.src = heroVideos[nextVideoIndex];
        inactiveVideo.load();
        
        // Wait for video to be ready, then transition
        const handleCanPlay = () => {
          setIsTransitioning(true);
          inactiveVideo.play().catch(console.error);
          
          // Fade transition
          setTimeout(() => {
            setActiveVideoIndex(prev => prev === 0 ? 1 : 0);
            setCurrentVideoIndex(nextVideoIndex);
            setIsTransitioning(false);
          }, 300); // 300ms fade duration
          
          inactiveVideo.removeEventListener('canplay', handleCanPlay);
        };
        
        inactiveVideo.addEventListener('canplay', handleCanPlay);
      }
    };

    activeVideo.addEventListener('ended', handleVideoEnd);
    
    return () => {
      activeVideo.removeEventListener('ended', handleVideoEnd);
    };
  }, [currentVideoIndex, activeVideoIndex]);

  // Initialize collaboration videos on mount
  useEffect(() => {
    const collabVideo1 = collabVideo1Ref.current;
    if (!collabVideo1) return;

    collabVideo1.src = collaborationVideos[0];
    collabVideo1.load();
    collabVideo1.play().catch(console.error);
  }, []);

  // Collaboration video carousel management with smooth transitions
  useEffect(() => {
    const activeCollabVideo = collabActiveVideoIndex === 0 ? collabVideo1Ref.current : collabVideo2Ref.current;
    if (!activeCollabVideo) return;

    const handleCollabVideoEnd = () => {
      const nextVideoIndex = (collabCurrentVideoIndex + 1) % collaborationVideos.length;
      const inactiveCollabVideo = collabActiveVideoIndex === 0 ? collabVideo2Ref.current : collabVideo1Ref.current;
      
      if (inactiveCollabVideo) {
        // Preload next video on inactive video element
        inactiveCollabVideo.src = collaborationVideos[nextVideoIndex];
        inactiveCollabVideo.load();
        
        // Wait for video to be ready, then transition
        const handleCanPlay = () => {
          setCollabIsTransitioning(true);
          inactiveCollabVideo.play().catch(console.error);
          
          // Fade transition
          setTimeout(() => {
            setCollabActiveVideoIndex(prev => prev === 0 ? 1 : 0);
            setCollabCurrentVideoIndex(nextVideoIndex);
            setCollabIsTransitioning(false);
          }, 300); // 300ms fade duration
          
          inactiveCollabVideo.removeEventListener('canplay', handleCanPlay);
        };
        
        inactiveCollabVideo.addEventListener('canplay', handleCanPlay);
      }
    };

    activeCollabVideo.addEventListener('ended', handleCollabVideoEnd);
    
    return () => {
      activeCollabVideo.removeEventListener('ended', handleCollabVideoEnd);
    };
  }, [collabCurrentVideoIndex, collabActiveVideoIndex]);

  // Hon demo video sequence management with mobile optimization
  useEffect(() => {
    const video1 = honDemoVideo1Ref.current;
    const video2 = honDemoVideo2Ref.current;
    
    if (!video1 || !video2) return;
    
    // Ensure both videos have proper mobile settings
    [video1, video2].forEach(video => {
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.style.display = 'block';
      
      // Mobile optimization: prevent default play button
      video.addEventListener('loadstart', () => {
        video.style.pointerEvents = 'none';
        setTimeout(() => {
          video.style.pointerEvents = 'auto';
        }, 100);
      });
      
      // Ensure video plays on mobile
      video.addEventListener('canplaythrough', () => {
        if (video === video1 && honDemoCurrentVideo === 0) {
          video.play().catch(console.error);
        } else if (video === video2 && honDemoCurrentVideo === 1) {
          video.play().catch(console.error);
        }
      });
    });
    
    // Initialize videos with proper mute states and playback control
    video1.muted = honDemoVideoMuted; // First video inherits current mute state
    video2.muted = true; // Second video starts muted
    video2.pause(); // Ensure second video is completely stopped
    video1.load();
    video2.load();
    
    return () => {
      [video1, video2].forEach(video => {
        video.removeEventListener('loadstart', () => {});
        video.removeEventListener('canplaythrough', () => {});
      });
    };
  }, [honDemoCurrentVideo]);





  const handleStartCreating = () => {
    navigate('/creator');
  };

  const handleStartCollaborating = () => {
    setShowLandingHonAssistant(true);
  };

  const handleStartEarning = (e?: React.MouseEvent) => {
    e?.preventDefault(); // Prevent any default behavior
    // Animation removed per user request
    navigate('/feed');
  };
  
  const handleJoinCommunity = () => {
    window.open('https://discord.gg/EPeaGUuzjV', '_blank');
  };

  const handleInfoButton = () => {
    // Placeholder for future i button functionality (debug logs removed for production)
  };

  const handleHonDemoVideoToggleMute = () => {
    const newMutedState = !honDemoVideoMuted;
    setHonDemoVideoMuted(newMutedState);
    
    // Only unmute the currently displayed video
    const currentVideo = honDemoCurrentVideo === 0 ? honDemoVideo1Ref.current : honDemoVideo2Ref.current;
    const otherVideo = honDemoCurrentVideo === 0 ? honDemoVideo2Ref.current : honDemoVideo1Ref.current;
    
    // Apply mute state ONLY to the currently active video
    if (currentVideo) {
      currentVideo.muted = newMutedState;
    }
    
    // FORCE the non-active video to be completely silent and stopped
    if (otherVideo) {
      otherVideo.muted = true; // Always muted
      otherVideo.pause(); // Always paused
      otherVideo.currentTime = 0; // Reset to prevent audio memory
    }
  };

  const handleHonDemoVideoEnded = () => {
    // Switch to the next video in sequence
    const nextVideo = honDemoCurrentVideo === 0 ? 1 : 0;
    const currentVideoRef = honDemoCurrentVideo === 0 ? honDemoVideo1Ref.current : honDemoVideo2Ref.current;
    const nextVideoRef = nextVideo === 0 ? honDemoVideo1Ref.current : honDemoVideo2Ref.current;
    
    if (!currentVideoRef || !nextVideoRef) return;
    
    // COMPLETELY stop the current video that just ended - prevent any audio leakage
    currentVideoRef.pause();
    currentVideoRef.muted = true; // Force muted
    currentVideoRef.currentTime = 0; // Reset to start
    
    // Remove any event listeners that might restart playback
    currentVideoRef.removeEventListener('loadeddata', () => currentVideoRef.play());
    currentVideoRef.removeEventListener('canplay', () => currentVideoRef.play());
    
    setHonDemoCurrentVideo(nextVideo);
    
    // Start the next video with proper mute state (only active video respects user preference)
    nextVideoRef.currentTime = 0;
    nextVideoRef.muted = honDemoVideoMuted; // Only the active video gets user's preference
    nextVideoRef.play().catch(console.error);
  };

  return (
    <div className="bg-white relative min-h-screen">
      {/* Fixed Navigation Bar - with dynamic colors instead of mix-blend-difference */}
      <nav className={`w-full max-w-none h-20 fixed top-0 left-1/2 transform -translate-x-1/2 z-50 box-border flex items-center justify-center transition-all duration-300 ${
        scrolled 
          ? 'backdrop-blur-[20px] backdrop-filter bg-[rgba(255,255,255,0.05)]' 
          : 'backdrop-blur-[12.5px] backdrop-filter bg-[rgba(255,255,255,0.01)]'
      }`}>
        <div className="w-full max-w-[1400px] flex items-center justify-between px-4 sm:px-6 lg:px-10">
          {/* Logo Section with dynamic color */}
          <div className="flex items-center justify-center relative w-[70px]">
            <img 
              src={honLogo} 
              alt="Hon Logo" 
              className="h-7 transition-all duration-300"
              style={{ 
                filter: navTextColor === '#000000' ? 'invert(1)' : 'invert(0)'
              }}
            />
          </div>
          
          {/* Navigation Items */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-[30px]">
            <div className="bg-[#070a0d] flex items-center justify-center h-[34px] px-3 sm:px-4 rounded-[106px]">
              <a 
                href="https://tellhon.beehiiv.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-['Inter'] font-bold text-[#ffffff] text-[12px] sm:text-[14px] hover:opacity-80 transition-opacity"
              >
                News
              </a>
            </div>
            <div className="bg-[#070a0d] flex items-center justify-center h-[34px] px-3 sm:px-4 rounded-[106px]">
              <Link 
                to="/login"
                onClick={() => {
                  // Navigation handled by React Router (debug logs removed for production)
                  navigate('/login');
                }}
                className="font-['Inter'] font-bold text-[#ffffff] text-[12px] sm:text-[14px] hover:opacity-80 transition-opacity"
              >
                Waitlist
              </Link>
            </div>
          </div>
        </div>
      </nav>


        
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center text-white overflow-hidden">
        {/* Background Video Carousel - Dual Video System for Smooth Transitions */}
        <video
          ref={video1Ref}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            activeVideoIndex === 0 ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay
          muted
          playsInline
        />
        <video
          ref={video2Ref}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            activeVideoIndex === 1 ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Hero Content - adjusted position to be slightly lower */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center mt-20 sm:mt-32" id="hero-content-wrapper">
          {/* Updated to match Figma specs: Inter Bold, responsive sizing */}
          <h1 className="font-['Inter'] font-bold text-[32px] sm:text-[40px] md:text-[48px] xl:text-[55px] leading-tight sm:leading-[100%] mb-8 sm:mb-12 text-white">
            Your Story Your Voice Your Platform
          </h1>
          <div className="flex items-center justify-center gap-6">
            <a
              href="https://discord.gg/EPeaGUuzjV"
              target="_blank"
              rel="noopener noreferrer"
              title="Join our Discord"
              aria-label="Discord"
              className="text-white/90 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 8.33 8.33 0 0 0-.608 1.25 17.18 17.18 0 0 0-5.345 0 8.35 8.35 0 0 0-.618-1.25.077.077 0 0 0-.078-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056c2.053 1.508 4.042 2.423 5.994 3.03a.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 10.66 10.66 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.251-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.121.099.247.198.372.292a.077.077 0 0 1-.007.128c-.598.352-1.22.645-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029c1.961-.607 3.95-1.522 6.003-3.03a.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.946 2.419-2.157 2.419Z"/>
              </svg>
            </a>
            <a
              href="https://x.com/H0n__AI"
              target="_blank"
              rel="noopener noreferrer"
              title="Follow us on X"
              aria-label="X"
              className="text-white/90 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M22.54 0h-3.33L13.1 9.27 7.59 0H0l9.5 14.33L0 24h3.33l6.53-9.27L16.41 24H24l-9.88-14.73L24 0z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Body Content */}
      <div className="w-full py-24 space-y-32 overflow-x-hidden">
        
        {/* Uninterrupted Workflow Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="w-full flex flex-col justify-start items-center gap-14">
            <div className="max-w-[898px] w-full mx-auto px-6 flex flex-col justify-center items-center gap-2.5">
              <h2 className="self-stretch text-center justify-center text-black text-2xl sm:text-3xl lg:text-4xl font-bold font-['Inter'] leading-tight">
                Uninterrupted Workflow
              </h2>
              <p className="max-w-[556px] w-full text-center justify-center text-black text-base font-normal font-['Inter'] leading-relaxed">
                No more subscription chaos. With Hon, you get access to the best creative models — all in one seamless canvas.
              </p>
            </div>
            
            {/* Tools Slider with actual model logos */}
            <div className="w-full overflow-hidden">
              <div data-property-1="tools slider1" className="flex gap-3 animate-scroll whitespace-nowrap">
                {[...aiModels, ...aiModels].map((model, index) => (
                  <div key={index} className="flex-shrink-0 pl-2.5 pr-10 py-2.5 bg-[#F0F3F7] rounded-xl flex justify-start items-center gap-7">
                    <div className="w-20 h-20 relative bg-white rounded-lg overflow-hidden">
                      <img 
                        className="w-20 h-20 left-[-1px] top-0 absolute object-contain" 
                        src={model.logo} 
                        alt={`${model.name} logo`}
                      />
                    </div>
                    <div className="inline-flex flex-col justify-start items-start gap-3">
                      <div className="self-stretch justify-center text-zinc-950 text-lg font-medium font-['Inter'] leading-normal">
                        {model.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Two Big Reasons Section - Mobile Optimized */}
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 lg:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black px-4 leading-tight">
              Two Big Reasons To Create Here
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Card 1 - Voice Collaboration */}
            <div className="relative rounded-xl overflow-hidden h-[500px] sm:h-[550px] lg:h-[750px]">
              {/* Background Video Sequence - Dual Video System for Smooth Transitions */}
              <video
                ref={collabVideo1Ref}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  collabActiveVideoIndex === 0 ? 'opacity-100' : 'opacity-0'
                }`}
                autoPlay
                muted
                playsInline
              />
              <video
                ref={collabVideo2Ref}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  collabActiveVideoIndex === 1 ? 'opacity-100' : 'opacity-0'
                }`}
                muted
                playsInline
              />
              
              {/* Enhanced gradient overlay for better text readability */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.65) 60%, rgba(0, 0, 0, 0.9) 100%)'
                }}
              />
              
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-12">
                <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 leading-tight">
                      Speak your ideas into existence
                    </h3>
                    <p className="text-white text-sm sm:text-base lg:text-lg opacity-90 mb-4 sm:mb-6 lg:mb-8 leading-relaxed max-w-md">
                      Hon can see your Canvas in Realtime, collaborate with you on your idea, generate & edit Videos, Images, 3D objects on your behalf.
                    </p>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    <button
                      onClick={handleStartCollaborating}
                      className="bg-white text-black px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-full text-sm sm:text-base lg:text-lg font-bold hover:bg-gray-100 transition-colors border border-gray-200 w-full sm:w-auto flex items-center gap-2 justify-center"
                    >
                      <LandingPageHonIndicator size="sm" />
                      Talk to Hon
                    </button>
                  </div>
                </div>
              </div>
            </div>
                
            {/* Card 2 - Monetization */}
            <div className="relative rounded-xl overflow-hidden h-[500px] sm:h-[550px] lg:h-[750px]">
              {/* Background Video */}
              <video
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                controls={false}
                disablePictureInPicture
                webkit-playsinline="true"
                x5-playsinline="true"
              >
                <source src="https://res.cloudinary.com/dz2kyqfj9/video/upload/v1753214510/oYFUIhBuQDU5jbpBMc_MR_output_xeukjc.mp4" type="video/mp4" />
              </video>
              
              {/* Enhanced gradient overlay matching Figma design */}
              <div 
                className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90"
              />
              
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-12">
                <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 leading-tight">
                      Your work deserves more than likes
                    </h3>
                    <p className="text-white text-sm sm:text-base lg:text-lg opacity-90 mb-4 sm:mb-6 lg:mb-8 leading-relaxed max-w-md">
                      Receive meaningful support from your community through seamless crypto payments. Get recognized—and rewarded—for what you create.
                    </p>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    <button
                      className="bg-white text-black px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-full text-sm sm:text-base lg:text-lg font-bold hover:bg-gray-100 transition-colors border border-gray-200 w-full sm:w-auto"
                    >
                      Start earning
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Manifesto Section */}
        <section className="text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            <div 
              className="text-2xl sm:text-3xl lg:text-4xl leading-relaxed font-medium"
              style={{
                background: 'linear-gradient(82.082deg, rgb(0, 187, 238) 3.7465%, rgb(244, 139, 2) 55.113%, rgb(248, 36, 255) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Unlock, Share Or Monetize Your Prompt Library. Publish Crafted Stories, Earn Support.
            </div>
            
            {/* Prompt Library Video */}
            <div className="relative max-w-5xl mx-auto" id="prompt-video-container">
              <div className="w-full rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
                <video
                  className="w-full h-auto max-h-full"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
                  src="https://res.cloudinary.com/dz2kyqfj9/video/upload/v1753278547/hon-platform-video_v0lgbl.webm"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* New Section: Voice Building Text */}
            <div className="text-2xl sm:text-3xl lg:text-4xl leading-relaxed font-medium text-black">
              This is how Creators use Voice to build with Hon
            </div>

            {/* Voice Building Description */}
            <div className="max-w-4xl mx-auto">
              <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed font-normal">
                Watch in real time how Hon turns simple Voice conversations into fully realized creative assets—2D visuals, videos, even 3D scenes. No typing. No timelines. Just you, your voice, and infinite output possibilities.
              </p>
            </div>
            
            {/* Hon Demo Video Sequence with Audio Controls */}
            <div className="relative max-w-5xl mx-auto group" id="hon-demo-video-container">
              <div className="w-full flex items-center justify-center relative min-h-[300px] sm:min-h-[400px]">
                {/* First Video */}
                <video
                  ref={honDemoVideo1Ref}
                  className={`w-full h-auto max-h-full transition-opacity duration-300 ${
                    honDemoCurrentVideo === 0 ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ position: honDemoCurrentVideo === 0 ? 'relative' : 'absolute', top: 0, left: 0 }}
                  autoPlay
                  muted={honDemoCurrentVideo !== 0 || honDemoVideoMuted}
                  playsInline
                  controls={false}
                  preload="auto"
                  onEnded={handleHonDemoVideoEnded}
                  src="https://res.cloudinary.com/dz2kyqfj9/video/upload/v1754041079/hondemolanding_online-video-cutter.com_rl9jbq.mp4"
                >
                  Your browser does not support the video tag.
                </video>
                
                {/* Second Video */}
                <video
                  ref={honDemoVideo2Ref}
                  className={`w-full h-auto max-h-full transition-opacity duration-300 ${
                    honDemoCurrentVideo === 1 ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ position: honDemoCurrentVideo === 1 ? 'relative' : 'absolute', top: 0, left: 0 }}
                  muted={honDemoCurrentVideo !== 1 || honDemoVideoMuted}
                  playsInline
                  controls={false}
                  preload="auto"
                  onEnded={handleHonDemoVideoEnded}
                  src="https://res.cloudinary.com/dz2kyqfj9/video/upload/v1754188227/hondemo2_online-video-cutter.com_loax9x.mp4"
                >
                  Your browser does not support the video tag.
                </video>
                
                {/* Audio Control Button - Hidden on mobile when loading */}
                <button
                  onClick={handleHonDemoVideoToggleMute}
                  className="hidden md:block absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                  aria-label={honDemoVideoMuted ? "Unmute video" : "Mute video"}
                >
                  {honDemoVideoMuted ? (
                    <VolumeX size={20} />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </button>
                
                {/* Mobile Audio Control - Always visible on mobile */}
                <button
                  onClick={handleHonDemoVideoToggleMute}
                  className="absolute bottom-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 md:hidden"
                  aria-label={honDemoVideoMuted ? "Unmute video" : "Mute video"}
                >
                  {honDemoVideoMuted ? (
                    <VolumeX size={16} />
                  ) : (
                    <Volume2 size={16} />
                  )}
                </button>
              </div>
            </div>
              
            <div className="flex flex-wrap justify-center gap-6">
              <button
                onClick={handleJoinCommunity}
                className="bg-white text-black px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Join the community
              </button>
            </div>
        </div>
        </section>

        {/* Discover Stories Section - Fixed to remove descriptors */}
        <section>
          <div className="text-center mb-8 sm:mb-14 px-4 sm:px-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black">Discover Stories</h2>
        </div>
        
          {/* Stories Slider with auto-scroll animation */}
          <div className="w-full overflow-hidden">
            <div className="flex gap-3 animate-scroll whitespace-nowrap">
              {[...sampleStories, ...sampleStories].map((story, index) => (
                <div 
                  key={`${story.id}-${index}`}
                  className="relative w-80 h-[680px] rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                >
                  {/* Media Background - Video or Image */}
                  {story.type === 'video' ? (
                    <video
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      src={story.media}
                    />
                  ) : (
                    <img
                      className="absolute inset-0 w-full h-full object-cover"
                      src={story.media}
                      alt={`${story.creator}'s story`}
                      loading="lazy"
                    />
                  )}
                  
                  {/* Story overlay - Only creator info, no descriptors */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      {/* Creator Info Only */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={story.profileImage} 
                            alt={`${story.creator} profile`}
                            className="w-11 h-11 rounded-full object-cover border-2 border-white/20"
                          />
                          <span className="text-white text-sm">{story.creator}</span>
                        </div>
                        <button className="text-white text-sm px-4 py-2 border border-white/50 rounded-full hover:bg-white/10 transition-colors">
                          Support creator
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <span>Hon ©2025. All rights reserved.</span>
            <a href="/terms" className="hover:text-gray-700 transition-colors">Terms of Use</a>
            <a href="mailto:info@tellhon.com" className="hover:text-gray-700 transition-colors">Contact</a>
            <button 
              onClick={() => window.open('https://hon-organization.gitbook.io/hon-docs', '_blank')}
              className="hover:text-gray-700 transition-colors"
            >
              Docs
            </button>
            <a
              href="https://discord.gg/EPeaGUuzjV"
              target="_blank"
              rel="noopener noreferrer"
              title="Join our Discord"
              aria-label="Discord"
              className="inline-flex items-center hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 8.33 8.33 0 0 0-.608 1.25 17.18 17.18 0 0 0-5.345 0 8.35 8.35 0 0 0-.618-1.25.077.077 0 0 0-.078-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056c2.053 1.508 4.042 2.423 5.994 3.03a.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 10.66 10.66 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.251-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.121.099.247.198.372.292a.077.077 0 0 1-.007.128c-.598.352-1.22.645-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029c1.961-.607 3.95-1.522 6.003-3.03a.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.946 2.419-2.157 2.419Z"/>
              </svg>
            </a>
            <a
              href="https://x.com/H0n__AI"
              target="_blank"
              rel="noopener noreferrer"
              title="Follow us on X"
              aria-label="X"
              className="inline-flex items-center hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M22.54 0h-3.33L13.1 9.27 7.59 0H0l9.5 14.33L0 24h3.33l6.53-9.27L16.41 24H24l-9.88-14.73L24 0z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Landing Page Hon Assistant Modal */}
      <AnimatePresence>
        {showLandingHonAssistant && (
          <LandingPageHonAssistant 
            onClose={() => setShowLandingHonAssistant(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 