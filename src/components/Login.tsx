import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import honLogo from '../assets/hon-logo.svg';
import { WaitlistSignup } from './WaitlistSignup';

// Feature flag - set to false to switch back to full login functionality
const WAITLIST_MODE = true;

export default function Login() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isVideoTransitioning, setIsVideoTransitioning] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const video2Ref = React.useRef<HTMLVideoElement>(null);
  
  // Check if we're in development or preview environment
  const isDevelopment = import.meta.env.DEV || 
                       window.location.hostname.includes('vercel.app') ||
                       window.location.hostname.includes('netlify.app') ||
                       window.location.hostname === 'localhost';

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed');
    }
  }, [isAuthenticated, navigate]);

  // Listen for auth state changes and create profiles
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        const email = user.email || '';
        const provider = user.app_metadata?.provider || 'email';
        
        // Extract username based on provider
        let username = null;
        if (provider === 'discord') {
          username = user.user_metadata?.preferred_username || 
                    user.user_metadata?.username || 
                    user.user_metadata?.name ||
                    null;
        } else if (provider === 'google') {
          username = user.user_metadata?.name || 
                    user.user_metadata?.full_name ||
                    null;
        } else {
          username = user.user_metadata?.username || 
                    user.user_metadata?.display_name || 
                    null;
        }
        
        try {
          await createUserProfile(user.id, email, username, provider);
          // Profile created/updated (debug logs removed for production)
        } catch (error) {
          console.error(`Failed to create profile for ${provider} user:`, error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize videos properly
  React.useEffect(() => {
    const video1 = videoRef.current;
    const video2 = video2Ref.current;
    
    if (video1) {
      video1.muted = isMuted;
      // Only play the active video initially
      if (!isSignUpMode) {
        video1.play().catch(error => {
          // Video autoplay handled (debug logs removed for production)
        });
      }
    }
    
    if (video2) {
      video2.muted = true; // Keep inactive video muted
      // Don't autoplay the second video initially
    }
  }, []);

  // Handle video transitions when switching tabs
  React.useEffect(() => {
    const video1 = videoRef.current;
    const video2 = video2Ref.current;
    
    if (video1 && video2) {
      if (isSignUpMode) {
        // Switching to sign up - play video2, pause video1
        video1.pause();
        video2.muted = isMuted;
        video2.play().catch(error => {
          // Video playback handled (debug logs removed for production)
        });
      } else {
        // Switching to login - play video1, pause video2
        video2.pause();
        video1.muted = isMuted;
        video1.play().catch(error => {
          // Video playback handled (debug logs removed for production)
        });
      }
    }
  }, [isSignUpMode, isMuted]);

  // Create or update user profile in database
  const createUserProfile = async (userId: string, email: string, username?: string, authMethod: string = 'email') => {
    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing profile:', checkError);
        throw checkError;
      }

      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: username || null,
            email: email,
            subscription_tier: 'free',
            subscription_status: 'inactive',
            is_verified: false,
            is_creator: false,
            preferences: {},
            social_links: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
        
        // Profile created successfully (debug logs removed for production)
      }
    } catch (error) {
      console.error('Error managing user profile:', error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (WAITLIST_MODE) return; // Skip in waitlist mode
    
    if (!email) return;
    
    if (isSignUpMode && (!username || !password)) {
      alert('Please fill in all fields to create your account.');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isSignUpMode) {
        const signUpOptions: any = {
          data: {
            username: username,
            display_name: username
          },
          emailRedirectTo: window.location.origin + '/feed'
        };
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: signUpOptions
        });
        
        if (error) throw error;
        
        if (data.user && data.user.id) {
          try {
            await createUserProfile(data.user.id, email, username, 'email');
          } catch (profileError) {
            console.warn('Profile creation failed but auth succeeded:', profileError);
          }
        }
        
        alert('Check your email to confirm your account!');
      } else {
        const otpOptions: any = {
          emailRedirectTo: window.location.origin + '/feed'
        };
        
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: otpOptions
        });
        
        if (error) throw error;
        
        alert('Check your email for the login link!');
      }
    } catch (error) {
      console.error('Error with authentication:', error);
      alert(isSignUpMode ? 'Error creating account. Please try again.' : 'Error sending email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'discord' | 'google') => {
    if (WAITLIST_MODE) return; // Skip in waitlist mode
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/feed'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const handleJoinDiscord = () => {
    window.open('https://discord.gg/EPeaGUuzjV', '_blank');
  };

  const toggleMute = () => {
    const activeVideo = isSignUpMode ? video2Ref.current : videoRef.current;
    
    if (activeVideo) {
      activeVideo.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleModeToggle = (signUpMode: boolean) => {
    if (signUpMode === isSignUpMode) return;
    
    setIsSignUpMode(signUpMode);
    
    // Clear form fields when switching modes
    if (!signUpMode) {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Cyberpunk Background Videos */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Login Video */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transform scale-110 transition-opacity duration-300 ${
            !isSignUpMode ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectPosition: 'center center',
            transform: 'scale(1.1) translate(-2%, -3%)'
          }}
          loop
          muted={isMuted}
          playsInline
          preload="auto"
        >
          <source src="https://res.cloudinary.com/dz2kyqfj9/video/upload/v1753118711/Driving_through_the_202507211324_ymhjri.mp4" type="video/mp4" />
        </video>
        
        {/* Sign Up Video */}
        <video
          ref={video2Ref}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isSignUpMode ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectPosition: 'center center',
            transform: 'scale(1.15) translate(-3%, -4%)',
            minWidth: '100%',
            minHeight: '100%'
          }}
          loop
          muted={isMuted}
          playsInline
          preload="auto"
        >
          <source src="https://res.cloudinary.com/dz2kyqfj9/video/upload/v1753123257/The_driver_says_202507211440_tnbjnf.mp4" type="video/mp4" />
        </video>
      </div>
      {/* Video Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
      
      {/* Navigation */}
      <nav className="relative z-10 w-full h-20 flex items-center justify-between px-6 sm:px-8 lg:px-16">
        <Link to="/" className="flex items-center">
          <img 
            src={honLogo} 
            alt="Hon Logo" 
            className="h-7"
          />
        </Link>
        
        <div className="opacity-0 pointer-events-none">
          {/* Navigation items hidden on login page */}
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 sm:space-y-10">
          {/* Glassmorphic Toggle */}
          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-md rounded-full p-1 w-full max-w-[400px] h-[60px] sm:h-[76px] relative border border-white/20">
              <div 
                className={`absolute bg-white/20 backdrop-blur-sm rounded-full shadow-lg h-[52px] sm:h-[68px] w-1/2 top-1 transition-all duration-300 border border-white/30 ${
                  !isSignUpMode ? 'left-1' : 'left-1/2'
                }`}
              />
              <div className="flex h-full">
                <button
                  onClick={() => handleModeToggle(false)}
                  className={`flex-1 flex items-center justify-center font-['Inter'] font-bold text-base sm:text-[21px] transition-colors ${
                    !isSignUpMode ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Log in
                </button>
                <button
                  onClick={() => handleModeToggle(true)}
                  className={`flex-1 flex items-center justify-center font-['Inter'] font-bold text-base sm:text-[21px] transition-colors ${
                    isSignUpMode ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="space-y-6 sm:space-y-8">
            {WAITLIST_MODE ? (
              // Waitlist Mode - Replace form content only
              <>
                {!isSignUpMode ? (
                  // Login Tab - Access Code
                  <form className="space-y-4 sm:space-y-[18px]">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Access code"
                        className="w-full h-12 sm:h-[50px] px-6 sm:px-[30px] py-4 sm:py-5 bg-[rgba(7,10,13,0.8)] text-white placeholder-white/70 rounded-full border-none outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm sm:text-base text-center tracking-widest font-mono"
                        maxLength={8}
                        style={{ letterSpacing: '0.3em' }}
                        disabled
                      />
                      <button
                        type="button"
                        disabled
                        className="w-full h-12 sm:h-[50px] px-6 sm:px-[30px] py-4 sm:py-5 bg-[#872CFF] hover:bg-[#7A25E6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-full border border-[#6f00ff] transition-all text-base sm:text-[20px] flex items-center justify-center"
                      >
                        Enter
                      </button>
                    </div>
                  </form>
                ) : (
                  // Sign Up Tab - Waitlist
                  <WaitlistSignup />
                )}
              </>
            ) : (
              // Original Login Mode
              <>
                {/* Email Login Section */}
                <form onSubmit={handleEmailLogin} className="space-y-4 sm:space-y-[18px]">
                  <div className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full h-12 sm:h-[50px] px-6 sm:px-[30px] py-4 sm:py-5 bg-[rgba(7,10,13,0.8)] text-white placeholder-white/70 rounded-full border-none outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm sm:text-base"
                      required
                    />
                    
                    {/* Additional Sign Up Fields */}
                    {isSignUpMode && email && (
                      <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Choose a username"
                          className="w-full h-12 sm:h-[50px] px-6 sm:px-[30px] py-4 sm:py-5 bg-[rgba(7,10,13,0.8)] text-white placeholder-white/70 rounded-full border-none outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm sm:text-base"
                          required={isSignUpMode}
                        />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          className="w-full h-12 sm:h-[50px] px-6 sm:px-[30px] py-4 sm:py-5 bg-[rgba(7,10,13,0.8)] text-white placeholder-white/70 rounded-full border-none outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm sm:text-base"
                          required={isSignUpMode}
                          minLength={6}
                        />
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isLoading || !email || (isSignUpMode && (!username || !password))}
                      className="w-full h-12 sm:h-[50px] px-6 sm:px-[30px] py-4 sm:py-5 bg-[#872CFF] hover:bg-[#7A25E6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-full border border-[#6f00ff] transition-all text-base sm:text-[20px] flex items-center justify-center"
                    >
                      {isLoading ? 'Sending...' : isSignUpMode ? 'Create account' : 'Continue with email'}
                    </button>
                  </div>
                </form>

                {/* Divider */}
                <div className="text-center">
                  <span className="text-white font-bold text-lg">Or</span>
                </div>

                {/* Social Login Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center justify-center">
                  <button
                    onClick={() => handleSocialLogin('google')}
                    className="w-full sm:w-auto h-12 sm:h-[50px] px-6 sm:px-[30px] py-2.5 bg-[rgba(0,0,0,0.8)] hover:bg-[rgba(0,0,0,0.9)] text-white rounded-full transition-all flex items-center justify-center gap-4 sm:gap-5 text-base sm:text-[20px] min-w-[180px]"
                  >
                    <span>{isSignUpMode ? 'Sign up with' : 'Login with'}</span>
                    <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>

                  <button
                    onClick={() => handleSocialLogin('discord')}
                    className="w-full sm:w-auto h-12 sm:h-[50px] px-6 sm:px-[30px] py-2.5 bg-[rgba(0,0,0,0.8)] hover:bg-[rgba(0,0,0,0.9)] text-white rounded-full transition-all flex items-center justify-center gap-4 sm:gap-5 text-base sm:text-[20px] min-w-[180px]"
                  >
                    <span>{isSignUpMode ? 'Sign up with' : 'Login with'}</span>
                    <svg className="w-5 h-5 sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="#5865F2">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                    </svg>
                  </button>
                </div>
              </>
            )}

            {/* Wallet information text only - no connect button */}
            <div className="flex flex-col items-center gap-3">
              <div className="text-center space-y-2">
                <p className="text-white/70 text-xs sm:text-sm max-w-xs leading-relaxed">
                  You'll need a Solana Wallet to Send and receive Support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Links */}
      <div className="relative z-10 absolute bottom-8 w-full px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto">
          <div className="text-[#bbbbbb] text-xs mb-4 sm:mb-0">
            2025 Hon
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleJoinDiscord}
              className="flex items-center gap-2 text-white text-sm hover:text-gray-300 transition-colors"
            >
              <span>Join the discord</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
              </svg>
            </button>
            
            {/* Volume Toggle Button */}
            <button
              onClick={toggleMute}
              className="p-2 text-white hover:text-gray-300 transition-colors rounded-full hover:bg-white/10"
              title={isMuted ? 'Unmute background audio' : 'Mute background audio'}
            >
              {isMuted ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.54-.77 2.2-1.29l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.33-1.71-.71L7 9H4c-.55 0-1 .45-1 1zm13.5 2A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 4.45v.2c0 .38.25.71.6.85C17.18 6.53 19 9.06 19 12s-1.82 5.47-4.4 6.5c-.36.14-.6.47-.6.85v.2c0 .63.63 1.07 1.21.85C18.6 19.11 21 15.84 21 12s-2.4-7.11-5.79-8.4c-.58-.23-1.21.22-1.21.85z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 