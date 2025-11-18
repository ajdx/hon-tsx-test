import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingPageHonAssistant } from './common/LandingPageHonAssistant';
import { LandingPageHonIndicator } from './common/LandingPageHonIndicator';

// Import Figma assets
const imgScreenshot = "/b080781ae9e2dafd120f474c463c8ece37cc3783.png";
const imgRecraftText = "/d2c7e7b159ca54cddf9e55e4baf127e4ea48e490.svg";
const imgIdeogramSeeklogo = "/2608c87450d2c2cfd3986eee5eeb89286c121956.svg";
const imgRunwaySeeklogo = "/d48527ee170a697a567b5ddc39e87d887f1751e8.svg";
const imgDeepmindLogo = "/8fb93f1f249fe7574b42796b58da2ebda9ad5bcf.svg";
const imgUnknown = "/b9ebc15eecfcafa2fd2478b248203a8a93a57804.svg";
const imgRow1 = "/a889ff6b068552e1b942f91f9955939f914c4c19.svg";
const imgBg = "/6d897dce03aa9dd5b57abf308837d309cd84770a.svg";
const imgDisplayHeading = "/719fff46ffb2c58360082dab7211aa33faf5acab.svg";
const imgArrowIcon = "/59a97a7734bf509b11534d0b4d0e9a13769964c5.svg";
const imgHonLogoVector = "/8e441a597518a0b56ca494f8b68dd550ae944a1e.svg";
const imgSocialIcon1 = "/6e04c0944e10ef168f8e4313c484fe27cfc42a5e.svg";
const imgSocialIcon2 = "/8669cd68928501b5bc9c68b3eafcfc2c52e27c87.svg";
const imgFrame583 = "/fc4657236f2130729b85a882f6238206ef726817.svg";

// Video URLs from Figma design - Cloudinary hosted
const heroVideoUrls = [
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963470/hero-slide111_yh6t7r.webm",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963467/hero-slide333_uo3uud.webm",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963475/heero_slider222_byuvaw.webm"
];
const voiceFirstVideoUrl = "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963637/HON-voice-first_erhvxr.webm";
const communitySupportVideoUrl = "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761967980/HON-community-support-first_mruz4l.webm";
const createShareMonetizeVideoUrl = "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761967988/HON-create-share-monetize_1_d0kxpk.webm";

export default function LandingPageNew() {
  const navigate = useNavigate();
  const [showLandingHonAssistant, setShowLandingHonAssistant] = useState(false);
  const [currentHeroVideoIndex, setCurrentHeroVideoIndex] = useState(0);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Redirect mobile users to the mobile waitlist page
  useEffect(() => {
    const isMobile = window.innerWidth <= 480 || /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
      navigate('/m', { replace: true });
    }
  }, [navigate]);

  // Hero video carousel - rotate through videos
  useEffect(() => {
    const videoElement = heroVideoRef.current;
    if (!videoElement) return;

    const handleVideoEnd = () => {
      setCurrentHeroVideoIndex((prev) => (prev + 1) % heroVideoUrls.length);
    };

    videoElement.addEventListener('ended', handleVideoEnd);
    return () => videoElement.removeEventListener('ended', handleVideoEnd);
  }, []);

  // Update video source when index changes
  useEffect(() => {
    const videoElement = heroVideoRef.current;
    if (videoElement) {
      videoElement.load();
      videoElement.play().catch(err => console.log('Video autoplay prevented:', err));
    }
  }, [currentHeroVideoIndex]);

  const handleWaitlistClick = () => {
    navigate('/login');
  };

  const handleTalkToHon = () => {
    setShowLandingHonAssistant(true);
  };

  return (
    <>
      <style>{`
        @media (max-width: 1440px) {
          .landing-nav-container {
            width: calc(100% - 80px) !important;
            max-width: 1280px !important;
          }
          .landing-hero-section {
            padding: 0 40px !important;
          }
        }
        @media (max-width: 1024px) {
          .landing-nav-container {
            width: calc(100% - 40px) !important;
          }
          .landing-hero-video {
            width: 90% !important;
            height: auto !important;
            aspect-ratio: 16/9 !important;
          }
          .landing-hero-heading {
            font-size: 42px !important;
          }
          .landing-feature-card {
            flex-direction: column !important;
            height: auto !important;
            min-height: 460px !important;
          }
          .landing-feature-video,
          .landing-feature-content {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            padding: 40px !important;
          }
        }
        @media (max-width: 768px) {
          .landing-nav-main {
            padding: 0 20px !important;
          }
          .landing-nav-logo {
            width: 50px !important;
          }
          .landing-nav-button {
            padding: 15px 25px !important;
            font-size: 14px !important;
          }
          .landing-hero-heading {
            font-size: 32px !important;
            padding: 0 20px !important;
          }
          .landing-models-heading {
            font-size: 13px !important;
          }
          .landing-section-heading {
            font-size: 36px !important;
          }
          .landing-feature-heading {
            font-size: 28px !important;
          }
        }
      `}</style>
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        overflow: 'hidden'
      }}>
      {/* Navigation */}
      <div className="landing-nav-container" style={{
        position: 'absolute',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1280px',
        maxWidth: 'calc(100% - 160px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '14px'
      }}>
        {/* Main Nav */}
        <div className="landing-nav-main" style={{
          width: '100%',
          height: '70px',
          backgroundColor: 'transparent',
          borderRadius: '150px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px 0 40px',
          boxSizing: 'border-box'
        }}>
          {/* Logo */}
          <div className="landing-nav-logo" style={{
            width: '70px',
            height: '29px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mixBlendMode: 'difference',
            flexShrink: 0
          }}>
            <img 
              src={imgHonLogoVector} 
              alt="Hon" 
              style={{
                width: '29px',
                height: '70px',
                transform: 'rotate(270deg)'
              }}
            />
          </div>

          {/* Right side with News and Waitlist */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexShrink: 0 }}>
            <a 
              href="https://tellhon.beehiiv.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-button" 
              style={{
                height: '38px',
                padding: '20px 40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '106px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '16px',
                color: '#000000',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                textDecoration: 'none'
              }}
            >
              News
            </a>
            <button 
              onClick={handleWaitlistClick}
              className="landing-nav-button"
              style={{
                height: '38px',
                padding: '20px 40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '106px',
                background: '#6f00ff',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '16px',
                color: '#ffffff',
                lineHeight: 1.5,
                whiteSpace: 'nowrap'
              }}
            >
              Waitlist
            </button>
          </div>
        </div>

        {/* Social Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '26px',
          height: '30px',
          paddingRight: '20px'
        }}>
          <a 
            href="https://discord.gg/qskrDQw8Xe" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              width: '28.5px',
              height: '28.5px',
              borderRadius: '91px',
              backgroundColor: '#ffffff',
              border: '0.65px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.2368 1.16667C14.0789 0.633333 12.8421 0.233333 11.5526 0C11.3947 0.291667 11.2105 0.683333 11.0789 1 9.68421 0.791667 8.30263 0.791667 6.92105 1C6.78947 0.683333 6.60526 0.291667 6.44737 0C5.15789 0.233333 3.92105 0.633333 2.76316 1.16667C0.394737 4.66667 -0.236842 8.08333 0.0789474 11.4583C1.65789 12.625 3.18421 13.3333 4.68421 13.7917C5.05263 13.2917 5.38158 12.7583 5.67105 12.1917C5.13158 11.9917 4.61842 11.7417 4.13158 11.4583C4.26316 11.3583 4.39474 11.2583 4.51316 11.1583C7.51316 12.5417 10.7895 12.5417 13.7632 11.1583C13.8947 11.2583 14.0263 11.3583 14.1447 11.4583C13.6579 11.7417 13.1447 11.9917 12.6053 12.1917C12.8947 12.7583 13.2237 13.2917 13.5921 13.7917C15.0921 13.3333 16.6184 12.625 18.1974 11.4583C18.5658 7.58333 17.5789 4.20833 15.2368 1.16667ZM6.05263 9.375C5.15789 9.375 4.42105 8.54167 4.42105 7.54167C4.42105 6.54167 5.13158 5.70833 6.05263 5.70833C6.97368 5.70833 7.69737 6.54167 7.68421 7.54167C7.68421 8.54167 6.97368 9.375 6.05263 9.375ZM12.2237 9.375C11.3289 9.375 10.5921 8.54167 10.5921 7.54167C10.5921 6.54167 11.3026 5.70833 12.2237 5.70833C13.1447 5.70833 13.8684 6.54167 13.8553 7.54167C13.8553 8.54167 13.1447 9.375 12.2237 9.375Z" fill="#000000"/>
            </svg>
          </a>
          <a 
            href="https://x.com/H0n__AI" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              width: '28.5px',
              height: '28.5px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            <img src={imgFrame583} alt="X (Twitter)" style={{ width: '100%', height: '100%' }} />
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <div className="landing-hero-section" style={{
        position: 'relative',
        width: '100%',
        minHeight: 'auto',
        backgroundColor: '#eff1f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '76px',
        paddingBottom: '50px',
        overflow: 'hidden'
      }}>
        {/* Hero Video */}
        <div className="landing-hero-video" style={{
          width: '1100px',
          maxWidth: '90%',
          height: '523px',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '50px'
        }}>
          <video 
            ref={heroVideoRef}
            autoPlay 
            muted 
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          >
            <source src={heroVideoUrls[currentHeroVideoIndex]} type="video/webm" />
          </video>
        </div>

        {/* Hero Content */}
        <div style={{
          width: '1280px',
          maxWidth: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: '30px',
          alignItems: 'center'
        }}>
          {/* Headline */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center'
          }}>
            <h1 className="landing-hero-heading" style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '55px',
              fontWeight: 400,
              color: '#000000',
              textAlign: 'center',
              lineHeight: 1.3,
              margin: 0
            }}>
              The first creative canvas<br />
              you control with your voice.
            </h1>
          </div>

          {/* Models Section */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Micro Heading */}
            <div style={{
              width: '100%',
              height: '27px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '31px'
            }}>
              <p className="landing-models-heading" style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '15px',
                fontWeight: 400,
                color: '#000000',
                textAlign: 'center',
                lineHeight: '27px',
                margin: 0,
                width: '387px',
                maxWidth: '100%'
              }}>
                HON is powered by the best SOTA models
              </p>
            </div>

            {/* Model Logos */}
            <div style={{
              width: '100%',
              height: '101px',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '80px'
            }}>
              {/* Row 2 */}
              <div style={{
                position: 'absolute',
                top: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '35px',
                alignItems: 'center'
              }}>
                <img src={imgRecraftText} alt="Recraft" style={{ width: '76px', height: '20.5px' }} />
                <img src={imgIdeogramSeeklogo} alt="Ideogram" style={{ width: '25px', height: '25px' }} />
                <img src={imgRunwaySeeklogo} alt="Runway" style={{ width: '88px', height: '18px' }} />
                <img src={imgDeepmindLogo} alt="DeepMind" style={{ width: '97.5px', height: '23.78px' }} />
                <img src={imgUnknown} alt="Model" style={{ width: '83px', height: '22px' }} />
              </div>

              {/* Row 1 */}
              <div style={{
                position: 'absolute',
                top: '61px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '509px',
                height: '22.75px'
              }}>
                <img src={imgRow1} alt="Models" style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reasons to Create with HON Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '1380px',
        backgroundColor: '#1f0e40',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 0'
      }}>
        <div style={{
          width: '1116px',
          maxWidth: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: '70px',
          alignItems: 'center'
        }}>
          {/* Section Description */}
          <div style={{
            width: '800px',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '18px',
              fontWeight: 400,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.6,
              margin: 0
            }}>
              <strong style={{ fontWeight: 700 }}>Interfaces evolve toward intuition.</strong> From command lines to GUIs, from code to nodes — the next leap is conversation. Every generation of creative tools has moved closer to how humans naturally think and express themselves. Hon continues that evolution — turning creation itself into conversation.
            </p>
          </div>

          {/* Section Heading */}
          <h2 className="landing-section-heading" style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '49px',
            fontWeight: 400,
            color: '#ffffff',
            textAlign: 'center',
            margin: 0,
            width: '900px',
            maxWidth: '100%'
          }}>
            Reasons to create with HON
          </h2>

          {/* Feature Cards */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px'
          }}>
            {/* Voice First Card */}
            <div className="landing-feature-card" style={{
              width: '100%',
              height: '460px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '0.5px solid #bebfc5',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex'
            }}>
              {/* Video */}
              <div className="landing-feature-video" style={{
                position: 'absolute',
                left: '37px',
                top: 0,
                width: '614px',
                height: '460px',
                overflow: 'hidden'
              }}>
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                >
                  <source src={voiceFirstVideoUrl} type="video/webm" />
                </video>
              </div>

              {/* Content */}
              <div className="landing-feature-content" style={{
                position: 'absolute',
                left: '696px',
                top: '102px',
                width: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '52px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <h3 className="landing-feature-heading" style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '39px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: 1.35,
                    letterSpacing: '0.78px',
                    margin: 0
                  }}>
                    Voice first
                  </h3>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '18px',
                    fontWeight: 400,
                    color: '#000000',
                    lineHeight: 1.5,
                    margin: 0
                  }}>
                    <strong style={{ fontWeight: 700 }}>Create through dialogue.</strong>
                    {' '}Hon listens, learns, and builds with you — turning imagination into tangible work across every medium
                  </p>
                </div>

                <button 
                  onClick={handleTalkToHon}
                  style={{
                    height: '60px',
                    padding: '20px 12px 20px 50px',
                    backgroundColor: '#6f00ff',
                    borderRadius: '106px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '40px'
                  }}
                >
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap'
                  }}>
                    Talk to Hon
                  </span>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="12" width="3" height="12" rx="1.5" fill="white">
                        <animate attributeName="height" values="12;24;12" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="y" values="12;6;12" dur="1s" repeatCount="indefinite" />
                      </rect>
                      <rect x="10" y="8" width="3" height="20" rx="1.5" fill="white">
                        <animate attributeName="height" values="20;28;20" dur="0.8s" repeatCount="indefinite" />
                        <animate attributeName="y" values="8;4;8" dur="0.8s" repeatCount="indefinite" />
                      </rect>
                      <rect x="16" y="4" width="3" height="28" rx="1.5" fill="white">
                        <animate attributeName="height" values="28;32;28" dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="y" values="4;2;4" dur="1.2s" repeatCount="indefinite" />
                      </rect>
                      <rect x="22" y="10" width="3" height="16" rx="1.5" fill="white">
                        <animate attributeName="height" values="16;22;16" dur="0.9s" repeatCount="indefinite" />
                        <animate attributeName="y" values="10;7;10" dur="0.9s" repeatCount="indefinite" />
                      </rect>
                      <rect x="28" y="14" width="3" height="8" rx="1.5" fill="white">
                        <animate attributeName="height" values="8;18;8" dur="1.1s" repeatCount="indefinite" />
                        <animate attributeName="y" values="14;9;14" dur="1.1s" repeatCount="indefinite" />
                      </rect>
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* Community Support Card */}
            <div className="landing-feature-card" style={{
              width: '100%',
              height: '460px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex'
            }}>
              {/* Content */}
              <div className="landing-feature-content" style={{
                position: 'absolute',
                left: '45px',
                top: '88px',
                width: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '52px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <h3 className="landing-feature-heading" style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '39px',
                    fontWeight: 700,
                    color: '#0c0c0d',
                    lineHeight: 1.35,
                    letterSpacing: '0.78px',
                    margin: 0
                  }}>
                    Community support
                  </h3>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '18px',
                    fontWeight: 400,
                    color: '#0c0c0d',
                    lineHeight: 1.5,
                    margin: 0
                  }}>
                    Receive meaningful support from your community through{' '}
                    <strong style={{ fontWeight: 700 }}>seamless crypto payments.</strong>
                    {' '}Get recognized—and rewarded—for what you create and publish.
                  </p>
                </div>

                <button 
                  onClick={handleWaitlistClick}
                  style={{
                    height: '60px',
                    padding: '20px 50px',
                    border: '2px solid #000000',
                    borderRadius: '106px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    opacity: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px'
                  }}
                >
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    color: '#0c0c0d',
                    whiteSpace: 'nowrap'
                  }}>
                    Start earning
                  </span>
                </button>
              </div>

              {/* Video */}
              <div className="landing-feature-video" style={{
                position: 'absolute',
                left: '538px',
                top: '55px',
                width: '535px',
                height: '353px',
                overflow: 'hidden'
              }}>
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  style={{
                    width: '100.37%',
                    height: '100.11%',
                    objectFit: 'cover'
                  }}
                >
                  <source src={communitySupportVideoUrl} type="video/webm" />
                </video>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create, Share, Monetize Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '1322px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: '80px'
      }}>
        {/* Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%'
        }}>
          <img src={imgBg} alt="Background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* Content with mask */}
        <div style={{
          position: 'relative',
          width: '1063px',
          maxWidth: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: '50px',
          alignItems: 'center',
          WebkitMaskImage: `url('${imgDisplayHeading}')`,
          maskImage: `url('${imgDisplayHeading}')`,
          WebkitMaskSize: '1280px 1362px',
          maskSize: '1280px 1362px',
          WebkitMaskPosition: '-108px -81px',
          maskPosition: '-108px -81px',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat'
        }}>
          {/* Heading */}
          <h2 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '61px',
            fontWeight: 400,
            color: '#0c0c0d',
            textAlign: 'center',
            lineHeight: 1.25,
            margin: 0,
            width: '889px',
            maxWidth: '100%'
          }}>
            Create, share, monetize. Publish, and earn support
          </h2>

          {/* Video */}
          <div style={{
            width: '986px',
            height: '759px',
            maxWidth: '100%',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: '12px',
            backgroundColor: '#EFF1F5'
          }}>
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              style={{
                width: '101%',
                height: '101%',
                objectFit: 'cover',
                position: 'absolute',
                top: '-0.5%',
                left: '-0.5%',
                display: 'block'
              }}
            >
              <source src={createShareMonetizeVideoUrl} type="video/webm" />
            </video>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        padding: '32px 0',
        width: '100%',
        marginTop: '80px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 16px'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '32px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            <span>Hon ©2025. All rights reserved.</span>
            <a 
              href="/terms" 
              style={{
                color: '#6b7280',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              Terms of Use
            </a>
            <a 
              href="mailto:info@tellhon.com" 
              style={{
                color: '#6b7280',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              Contact
            </a>
            <button 
              onClick={() => window.open('https://hon-organization.gitbook.io/hon-docs', '_blank')}
              style={{
                color: '#6b7280',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              Docs
            </button>
            <a
              href="https://discord.gg/qskrDQw8Xe"
              target="_blank"
              rel="noopener noreferrer"
              title="Join our Discord"
              aria-label="Discord"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#6b7280',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ height: '20px', width: '20px' }} fill="currentColor">
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 8.33 8.33 0 0 0-.608 1.25 17.18 17.18 0 0 0-5.345 0 8.35 8.35 0 0 0-.618-1.25.077.077 0 0 0-.078-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056c2.053 1.508 4.042 2.423 5.994 3.03a.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 10.66 10.66 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.251-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.121.099.247.198.372.292a.077.077 0 0 1-.007.128c-.598.352-1.22.645-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029c1.961-.607 3.95-1.522 6.003-3.03a.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.419 0 1.333-.946 2.419-2.157 2.419Z"/>
              </svg>
            </a>
            <a
              href="https://x.com/H0n__AI"
              target="_blank"
              rel="noopener noreferrer"
              title="Follow us on X"
              aria-label="X"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#6b7280',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ height: '20px', width: '20px' }} fill="currentColor">
                <path d="M22.54 0h-3.33L13.1 9.27 7.59 0H0l9.5 14.33L0 24h3.33l6.53-9.27L16.41 24H24l-9.88-14.73L24 0z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Hon Assistant */}
      {showLandingHonAssistant && (
        <>
          <LandingPageHonIndicator />
          <LandingPageHonAssistant onClose={() => setShowLandingHonAssistant(false)} />
        </>
      )}
      </div>
    </>
  );
}

