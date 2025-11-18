import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingPageHonAssistant } from './common/LandingPageHonAssistant';
import { LandingPageHonIndicator } from './common/LandingPageHonIndicator';
import "./styles.css"; // keep the CSS file separate as requested

// Import Figma assets mapped to index.html
const imgRecraftText = "/d2c7e7b159ca54cddf9e55e4baf127e4ea48e490.svg";
const imgIdeogramSeeklogo = "/2608c87450d2c2cfd3986eee5eeb89286c121956.svg";
const imgRunwaySeeklogo = "/d48527ee170a697a567b5ddc39e87d887f1751e8.svg";
const imgDeepmindLogo = "/8fb93f1f249fe7574b42796b58da2ebda9ad5bcf.svg";
const imgUnknown = "/b9ebc15eecfcafa2fd2478b248203a8a93a57804.svg";

const imgBg = "/6d897dce03aa9dd5b57abf308837d309cd84770a.svg";
const imgHonLogoVector = "/8e441a597518a0b56ca494f8b68dd550ae944a1e.svg";
const imgSocialIcon1 = "/6e04c0944e10ef168f8e4313c484fe27cfc42a5e.svg";
const imgSocialIcon2 = "/8669cd68928501b5bc9c68b3eafcfc2c52e27c87.svg";

// Video URLs
const heroVideoUrls = [
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963470/hero-slide111_yh6t7r.webm",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963467/hero-slide333_uo3uud.webm",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963475/heero_slider222_byuvaw.webm"
];

const voiceFirstVideoUrl =
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761963637/HON-voice-first_erhvxr.webm";

const communitySupportVideoUrl =
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761967980/HON-community-support-first_mruz4l.webm";

const createShareMonetizeVideoUrl =
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1761967988/HON-create-share-monetize_1_d0kxpk.webm";

export default function LandingPageNew() {
  const navigate = useNavigate();

  const [showLandingHonAssistant, setShowLandingHonAssistant] = useState(false);
  const [currentHeroVideoIndex, setCurrentHeroVideoIndex] = useState(0);

  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Mobile redirect
  useEffect(() => {
    const isMobile =
      window.innerWidth <= 480 || /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
      navigate("/m", { replace: true });
    }
  }, [navigate]);

  // Hero video rotation
  useEffect(() => {
    const videoElement = heroVideoRef.current;
    if (!videoElement) return;

    const handleVideoEnd = () => {
      setCurrentHeroVideoIndex(
        (prev) => (prev + 1) % heroVideoUrls.length
      );
    };

    videoElement.addEventListener("ended", handleVideoEnd);
    return () => videoElement.removeEventListener("ended", handleVideoEnd);
  }, []);

  // Load next video
  useEffect(() => {
    const videoElement = heroVideoRef.current;
    if (videoElement) {
      videoElement.load();
      videoElement
        .play()
        .catch(() => console.warn("Autoplay blocked by browser"));
    }
  }, [currentHeroVideoIndex]);

  // Handlers
  const handleWaitlistClick = () => navigate("/login");
  const handleTalkToHon = () => setShowLandingHonAssistant(true);

  return (
    <>
      {/* ---------------- INDEX.HTML CONTENT (converted to JSX) ---------------- */}
      <>
        {/* HEADER NAV */}
        <nav className="nav">
          <div className="brand-logo">
            <img src={imgHonLogoVector} alt="Hon logo" />
          </div>

          <div className="menu">
            <a
              href="https://tellhon.beehiiv.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="text-button">News</button>
            </a>

            <a href="https://www.tellhon.com/login">
              <button className="primary-button" onClick={handleWaitlistClick}>
                Waitlist
              </button>
            </a>
          </div>
        </nav>

        {/* Floating Social Icons */}
        <div className="social">
          <div className="nav-social-icon">
            <a
              href="https://discord.gg/qskrDQw8Xe"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={imgSocialIcon1} alt="Discord" />
            </a>
          </div>
          <div className="nav-social-icon">
            <a
              href="https://x.com/H0n__AI"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={imgSocialIcon2} alt="X" />
            </a>
          </div>
        </div>

        {/* HERO + SECTION 1 */}
        <div className="section-wrapper-1">
          <div className="hero">
            <video
              className="hero-video"
              autoPlay
              muted
              playsInline
              onEnded={() =>
                setCurrentHeroVideoIndex(
                  (prev) => (prev + 1) % heroVideoUrls.length
                )
              }
            >
              <source
                src={heroVideoUrls[currentHeroVideoIndex]}
                type="video/webm"
              />
              <source
                src={heroVideoUrls[currentHeroVideoIndex].replace(".webm", ".mp4")}
                type="video/mp4"
              />
            </video>
          </div>

          <div className="section_1">
            <h1>The first creative canvas you control with your voice.</h1>

            <p className="models-heading">
              HON is powered by the best SOTA models
            </p>

            <div className="logo-row">
              <img src={imgRecraftText} className="logo" alt="Recraft" />
              <img src={imgIdeogramSeeklogo} className="logo" alt="Ideogram" />
              <img src={imgRunwaySeeklogo} className="logo" alt="Runway" />
              <img src={imgDeepmindLogo} className="logo" alt="DeepMind" />
              <img src={imgUnknown} className="logo" alt="Unknown" />
            </div>
          </div>
        </div>

        {/* SECTION 2 + 3 */}
        <div className="section-wrapper-2">
          <div className="section_2">
            <p className="body-copy">
              <b>Interfaces evolve toward intuition.</b> From command lines to
              GUIs, from code to nodes — the next leap is conversation. Every
              generation of creative tools has moved closer to how humans
              naturally think and express themselves. Hon continues that
              evolution — turning creation itself into conversation.
            </p>
          </div>

          <div className="section_3">
            <h2>Reasons to create with HON</h2>

            {/* Feature 1 */}
            <div className="inner-section">
              <video className="inner-section-video" autoPlay muted loop playsInline>
                <source src={voiceFirstVideoUrl} type="video/webm" />
                <source
                  src={voiceFirstVideoUrl.replace(".webm", ".mp4")}
                  type="video/mp4"
                />
              </video>

              <div className="text-block">
                <h3>Voice first</h3>
                <p className="body-copy">
                  <b>Create through dialogue.</b> Hon listens, learns, and builds
                  with you — turning imagination into tangible work across every
                  medium.
                </p>

                <button className="primary-icon-button" onClick={handleTalkToHon}>
                  Talk to HON <img src={imgSocialIcon1} className="mic-icon" alt="mic" />
                </button>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="inner-section reverse">
              <div className="text-block">
                <h3>Community support</h3>
                <p className="body-copy">
                  Receive meaningful support from your community through{" "}
                  <b>seamless crypto payments.</b> Get recognized—and rewarded—for
                  what you create and publish.
                </p>

                <button className="primary-button" onClick={handleWaitlistClick}>
                  Start earning
                </button>
              </div>

              <video className="inner-section-video" autoPlay muted loop playsInline>
                <source src={communitySupportVideoUrl} type="video/webm" />
                <source
                  src={communitySupportVideoUrl.replace(".webm", ".mp4")}
                  type="video/mp4"
                />
              </video>
            </div>
          </div>
        </div>

        {/* SECTION 4 */}
        <div className="section_4" style={{ backgroundImage: `url(${imgBg})` }}>
          <div className="display-heading">
            Create, share, monetize. Publish, and earn support
          </div>

          <video className="full-width-video" autoPlay muted loop playsInline>
            <source src={createShareMonetizeVideoUrl} type="video/webm" />
            <source
              src={createShareMonetizeVideoUrl.replace(".webm", ".mp4")}
              type="video/mp4"
            />
          </video>
        </div>

        {/* FOOTER */}
        <footer>
          <ul className="footer-links">
            <li>Hon ©2025. All rights reserved.</li>
          </ul>

          <ul className="footer-links">
            <li>
              <a
                href="https://www.tellhon.com/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Use
              </a>
            </li>
            <li>
              <a href="mailto:info@tellhon.com">Contact</a>
            </li>
            <li>
              <a
                href="https://hon-organization.gitbook.io/hon-docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Docs
              </a>
            </li>
          </ul>

          <div className="footer-social">
            <div className="nav-social-icon">
              <a
                href="https://discord.gg/qskrDQw8Xe"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={imgSocialIcon1} alt="Discord" />
              </a>
            </div>

            <div className="nav-social-icon">
              <a
                href="https://x.com/H0n__AI"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={imgSocialIcon2} alt="X" />
              </a>
            </div>
          </div>
        </footer>
      </>

      {/* HON ASSISTANT */}
      {showLandingHonAssistant && (
        <>
          <LandingPageHonIndicator />
          <LandingPageHonAssistant
            onClose={() => setShowLandingHonAssistant(false)}
          />
        </>
      )}
    </>
  );
}
