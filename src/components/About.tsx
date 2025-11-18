import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import honLogo from '../assets/hon-logo.svg';

// Company Logo Animation Component
const CompanyLogoOverlay: React.FC<{ 
  logos: string[];
  hasAnimation: boolean;
}> = ({ logos, hasAnimation }) => {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);

  useEffect(() => {
    if (!hasAnimation || logos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentLogoIndex((prev) => (prev + 1) % logos.length);
    }, 4000); // Change logo every 4 seconds

    return () => clearInterval(interval);
  }, [logos.length, hasAnimation]);

  if (hasAnimation && logos.length > 1) {
    return (
      <div className="absolute bottom-3 right-3 w-[50px] h-[50px] bg-white rounded-full overflow-hidden flex items-center justify-center shadow-md">
        {logos.map((logo, index) => (
          <img
            key={index}
            src={logo}
            alt="Company logo"
            className={`absolute w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              index === currentLogoIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
    );
  }

  // Static logo for non-animated cases
  return (
    <div className="absolute bottom-3 right-3 w-[50px] h-[50px] bg-white rounded-full overflow-hidden flex items-center justify-center shadow-md">
      <img
        src={logos[0]}
        alt="Company logo"
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// Team member data from Figma design with high-quality SVG logos
const teamMembers = [
  {
    name: "Dervin Dimanche",
    role: "Founder, Context Engineer, Research",
    image: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753039753/dervin_ayddvc.png",
    companyLogos: [
      "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050832/googlesvg_xwllvv.svg",
      "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050833/metasvg_pgzppw.svg", 
      "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050835/microsoft_np9chg.svg"
    ],
    hasAnimation: true
  },
  {
    name: "Anwar Abrar",
    role: "SWE, 3D", 
    image: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753039732/anwar_fkpsfe.png",
    companyLogos: ["https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050837/ravesvg_cxdnh5.svg"],
    hasAnimation: false
  },
  {
    name: "Kordel Latimer",
    role: "Founder, Sr. SWE",
    image: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753039790/kordel_fkfyra.png",
    companyLogos: ["https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050832/aurasvg_gtkpub.svg"],
    hasAnimation: false
  },
  {
    name: "Jesse Aridoux", 
    role: "Founder, UX, Artist",
    image: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753039774/jesse_clgdas.png",
    companyLogos: [
      "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050831/altassiansvg_zi4mj1.svg",
      "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050837/workhumansvg_pk94br.svg"
    ],
    hasAnimation: true
  }
];

// Core values matching the exact Figma design with SVG icons
const coreValues = [
  {
    title: "Your story, your rules",
    description: "Hon doesn't claim your work. You do.",
    icon: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050343/yourstoryrules_vzqtny.svg"
  },
  {
    title: "Process over perfection", 
    description: "Behind every banger is a hundred experiments. Hon lets them live.",
    icon: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050329/processoverperfection_en5csf.svg"
  },
  {
    title: "Intelligence with empathy",
    description: "Our AI isn't just smart, it feels your vibe. It adapts. It grows with you.",
    icon: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050328/intelligencewithempathy_fxz1i4.svg"
  },
  {
    title: "Access for the many, not the few",
    description: "Hon is built for the diaspora of creators who've been left out of the mainstream loop.",
    icon: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050328/access_y9mjmw.svg"
  },
  {
    title: "Community as currency", 
    description: "Followers are fine, but we're building real fans. Real value. Real love. This is the future of storytelling. Messy. Emotional. Multi-modal. Yours. Welcome to Hon.",
    icon: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1753050327/currencycommunity_diehld.svg"
  }
];

export default function About() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<'welcome' | 'team'>('welcome');
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJoinCommunity = () => {
    window.open('https://discord.gg/EPeaGUuzjV', '_blank');
  };

  const handleGoToFeed = () => {
    navigate('/feed');
  };

  return (
    <div className="bg-white relative min-h-screen">
      {/* Fixed Navigation Bar */}
      <nav className={`w-full h-20 fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'backdrop-blur-[20px] backdrop-filter bg-[rgba(255,255,255,0.9)]' 
          : 'backdrop-blur-[12.5px] backdrop-filter bg-[rgba(255,255,255,0.01)]'
      }`}>
        <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between px-10">
          {/* Logo - centered */}
          <div className="flex-1"></div>
          <div className="flex h-7 items-center justify-center">
            <img 
              src={honLogo} 
              alt="Hon Logo" 
              className="h-7 filter invert mix-blend-exclusion"
            />
          </div>
          <div className="flex-1"></div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20">
        {/* Toggle Switcher */}
        <div className="flex justify-center pt-[100px] pb-[40px]">
          <div className="bg-[#f0f3f7] rounded-[100px] p-1 w-[624px] h-[76px] relative">
            <div 
              className={`absolute bg-white rounded-[100px] shadow-[0px_0px_4px_0px_#c7ced8] h-[68px] w-[308px] top-1 transition-all duration-300 ${
                activeTab === 'welcome' ? 'left-1' : 'left-[308px]'
              }`}
            />
            <div className="flex h-full">
              <button
                onClick={() => setActiveTab('welcome')}
                className={`flex-1 flex items-center justify-center font-['Inter'] font-bold text-[21px] transition-colors ${
                  activeTab === 'welcome' ? 'text-black' : 'text-[#929eaf]'
                }`}
              >
                Welcome to Hon
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex-1 flex items-center justify-center font-['Inter'] font-bold text-[21px] transition-colors ${
                  activeTab === 'team' ? 'text-black' : 'text-[#929eaf]'
                }`}
              >
                Meet the team
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'welcome' ? (
          /* Welcome Content */
          <div>
            {/* Hero Section with Gradient Text */}
            <section className="max-w-[800px] mx-auto px-8 pb-[50px] text-center">
              <div className="space-y-[20px] mb-[30px]">
                <h1 className="font-['Inter'] font-bold text-[28px] leading-tight mb-[20px]">
                  <div 
                    style={{
                      background: 'linear-gradient(82.082deg, rgb(0, 187, 238) 3.7465%, rgb(244, 139, 2) 55.113%, rgb(248, 36, 255) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    At Hon, we believe creating should feel alive; it should be personal, and owned. Not just generated and forgotten — but felt, shared, and celebrated.
                  </div>
                </h1>
                <h2 className="font-['Inter'] font-bold text-[28px] leading-tight">
                  <div 
                    style={{
                      background: 'linear-gradient(82.082deg, rgb(0, 187, 238) 3.7465%, rgb(244, 139, 2) 55.113%, rgb(248, 36, 255) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    We've built a Generative AI platform for crafters and consumers of content. Storytellers, thinkers, hackers, and dreamers.
                  </div>
                </h2>
              </div>
              
              <div className="space-y-[20px]">
                <p className="font-['Inter'] font-normal text-[16px] text-black leading-relaxed">
                  Hon is more than a tool. It's a canvas, a voice, and a stage. You create with voice, visuals, motion, and meaning — you share it with a community that values originality over virality. We're not here to replace creators. We're here to amplify them.
                </p>
                <p className="font-['Inter'] font-normal text-[16px] text-black leading-relaxed">
                  The AI works with you — it responds to your rhythm, remembers your aesthetic, and speaks your language. When you're ready, your work doesn't just sit in a feed. It becomes part of your evolving archive — a prompt library, a collection of Stories, a growing universe you can showcase, remix, and monetize with crypto — on your terms.
                </p>
              </div>
            </section>

            {/* Core Values Section */}
            <section className="max-w-[933px] mx-auto px-8 pb-16">
              <div className="text-center mb-[40px]">
                <h2 className="font-['Inter'] font-bold text-[28px] text-black leading-[1.5]">We believe</h2>
              </div>
              
              <div className="space-y-12">
                {/* First row - 3 items */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-[150px] md:gap-[80px] lg:gap-[150px]">
                  {coreValues.slice(0, 3).map((value, index) => (
                    <div key={index} className="text-center">
                      <div className="mb-4">
                        <div className="w-[54px] h-[54px] mx-auto mb-4 rounded-full overflow-hidden">
                          <img 
                            src={value.icon} 
                            alt={value.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="font-['Inter'] font-bold text-[20px] text-black leading-normal mb-4">
                          {value.title}
                        </h3>
                      </div>
                      <p className="font-['Inter'] font-normal text-[16px] text-black leading-normal">
                        {value.description}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Second row - 2 items centered */}
                <div className="flex justify-center">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[150px] md:gap-[80px] lg:gap-[150px]">
                    {coreValues.slice(3, 5).map((value, index) => (
                      <div key={index + 3} className="text-center w-[294px]">
                        <div className="mb-4">
                          <div className="w-[54px] h-[54px] mx-auto mb-4 rounded-full overflow-hidden">
                            <img 
                              src={value.icon} 
                              alt={value.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h3 className="font-['Inter'] font-bold text-[20px] text-black leading-normal mb-4">
                            {value.title}
                          </h3>
                        </div>
                        <p className="font-['Inter'] font-normal text-[16px] text-black leading-normal">
                          {value.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* Team Content */
          <div>
            <section className="max-w-6xl mx-auto px-8 py-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-black mb-6">Meet the Team</h2>
                <p className="text-base text-gray-700 max-w-4xl mx-auto leading-relaxed mb-8">
                  Our team brings together diverse backgrounds in design, engineering, research, talent and the creative arts. 
                  What connects us is a shared belief that technology should expand, not replace, human imagination. This canvas is built for beginners and pros alike with a Voice first companion to optimize your creativity along the way. But Voice is just the start...
                </p>
              </div>
              
              <div className="flex justify-center gap-[90px] flex-wrap">
                {teamMembers.map((member, index) => (
                  <div key={index} className="flex flex-col items-center gap-4 w-[182px]">
                    <div className="bg-white h-[179px] w-full overflow-hidden relative rounded-lg">
                      <div className="absolute left-[5px] top-[5px] w-[169px] h-[169px] rounded-full overflow-hidden bg-[#ededed]">
                        <img 
                          src={member.image} 
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CompanyLogoOverlay 
                        logos={member.companyLogos}
                        hasAnimation={member.hasAnimation}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center w-full">
                      <div className="flex gap-1">
                        <span className="font-['Inter'] font-bold text-[14px] text-[#070a0d]">
                          {member.name.split(' ')[0]}
                        </span>
                        <span className="font-['Inter'] font-bold text-[14px] text-[#070a0d]">
                          {member.name.split(' ')[1]}
                        </span>
                      </div>
                      <p className="font-['Inter'] font-normal text-[14px] text-[#070a0d] leading-normal">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white py-[30px] pl-10">
        <div className="flex gap-7">
          <span className="font-['Inter'] font-normal text-[12px] text-[#929eaf]">
            Hon ©2025. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
} 