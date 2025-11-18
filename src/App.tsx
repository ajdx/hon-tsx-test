import { useState, useEffect } from 'react';
import { PenLine, Home, BookOpen, User, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { Reader } from './components/Reader';
import { Creator } from './components/Creator';
import { ComicGrid } from './components/ComicGrid';
import { Feed } from './components/media/Feed';
import { ProfilePage } from './components/Profile/ProfilePage';
import { useComicStore } from './store/useComicStore';
import { Comic } from './types';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from './components/wallet/WalletButton';
import { nanoid } from 'nanoid';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { LoginOptions } from './components/auth/LoginOptions';
import { LoginDropdown } from './components/auth/LoginDropdown';
import LandingPage from './components/LandingPageNew';
import MobileWaitlist from './components/MobileWaitlist';
import TermsOfUse from './components/TermsOfUse';
import About from './components/About';
import Login from './components/Login';
import SubscriptionPage from './components/SubscriptionPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/common/ThemeToggle';
import SupabaseDiagnostic from './components/SupabaseDiagnostic';
import { CloudinaryTester } from './components/CloudinaryTester';
import { CollaborationProvider } from './contexts/CollaborationContext';
import { SolanaProvider } from './contexts/SolanaContext';

// Protected route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireWallet?: boolean }> = ({ 
  children, 
  requireWallet = false 
}) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated || (requireWallet && !user?.wallet)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-8">
        <h2 className="text-2xl font-bold text-white mb-4">
          {!isAuthenticated 
            ? 'Sign In or Connect Wallet' 
            : 'Connect Your Wallet'}
        </h2>
        <p className="text-gray-400 mb-6">
          {!isAuthenticated 
            ? 'Please sign in with your preferred method' 
            : 'Please connect your wallet to access this feature'}
        </p>
        <LoginOptions />
      </div>
    );
  }

  return <>{children}</>;
};

// Wrap the creator component with the collaboration provider
const CollaborativeCreator: React.FC = () => (
  <ProtectedRoute>
    <CollaborationProvider>
      <Creator />
    </CollaborationProvider>
  </ProtectedRoute>
);

// This component now contains the main app logic and uses hooks
const AppContent = () => {
  // Hooks called INSIDE providers - OK!
  const { isAuthenticated } = useAuth(); 
  const { isCreatorMode, toggleCreatorMode, currentComic, setCurrentComic } = useComicStore();
  const [showMyComics, setShowMyComics] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const isReaderMode = location.pathname === '/reader';
  const isProfilePage = location.pathname === '/profile';
  const isMyComicsPage = location.pathname === '/my-comics';
  const isLandingPage = location.pathname === '/' && !isAuthenticated;
  const isAboutPage = location.pathname === '/about';
  const isLoginPage = location.pathname === '/login' && !isAuthenticated;
  const isSubscriptionPage = location.pathname === '/subscription';
  const isMobileWaitlistPage = location.pathname === '/m';
  const isTermsPage = location.pathname === '/terms';
  const isCreatorPage = location.pathname === '/creator';
  const isStandalonePage = isLandingPage || isAboutPage || isLoginPage || isSubscriptionPage || isMobileWaitlistPage;

  // Monitor authentication state and redirect if needed
  useEffect(() => {
    if (!isAuthenticated && 
        location.pathname !== '/' && 
        location.pathname !== '/m' && 
        location.pathname !== '/about' &&
        location.pathname !== '/login' &&
        location.pathname !== '/subscription' &&
        location.pathname !== '/terms' &&
        location.pathname !== '/cloudinary-tester' &&
        location.pathname !== '/supabase-diagnostic') {
      navigate('/');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // Handle Create button click
  const handleCreateNew = () => {
    const newComic: Comic = {
      id: `draft-${nanoid()}`,
      title: 'Untitled Comic',
      creator: 'Anonymous',
      creatorWallet: 'placeholder-wallet-address', // Use placeholder instead of publicKey.toBase58()
      coverImage: '',
      coverType: 'image' as const,
      pages: [[]],
      pageTemplates: [],
      narrations: {},
      createdAt: new Date(),
      lastModified: new Date()
    };
    setCurrentComic(newComic);
    if (!isCreatorMode) {
      toggleCreatorMode();
    }
    navigate('/creator');
  };

  const handleLogoClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentComic(null);
    setShowMyComics(false);
    setShowProfile(false);
    if (isCreatorMode) {
      toggleCreatorMode();
    }
    navigate('/feed');
  };

  const handleMyComicsClick = () => {
    setShowMyComics(true);
    setShowProfile(false);
    navigate('/my-comics');
  };

  const handleProfileClick = () => {
    setShowProfile(true);
    setShowMyComics(false);
    navigate('/profile');
  };

  return (
    <ThemeProvider>
      <div className={`min-h-screen overflow-x-hidden ${
        isSubscriptionPage 
          ? 'bg-white text-gray-900' 
          : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
      }`}>
        {!isStandalonePage && !isCreatorPage && !isTermsPage && (
          <nav className="fixed top-0 inset-x-0 z-50 bg-gray-800 border-b border-gray-700">
            <div className="h-16 flex items-center justify-between">
              <button 
                onClick={(e) => handleLogoClick(e)}
                className="flex items-center hover:opacity-80 transition-opacity h-full px-6"
              >
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-white -mr-0.5">H</span>
                  <div className="flex items-center relative translate-y-1">
                    <Circle className="w-4 h-4 text-blue-400" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-3 h-3 text-blue-400" />
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-white -ml-0.5">n</span>
                </div>
              </button>
              <div className="flex items-center space-x-4 h-full px-6">
                <LoginDropdown isNavbar />
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center space-x-2 transition-colors"
                >
                  <PenLine size={16} />
                  <span>Create</span>
                </button>
              </div>
            </div>
          </nav>
        )}

        <div className={isStandalonePage || isCreatorPage || isTermsPage ? "" : "pt-16"}>
          <Routes>
            <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/feed" />} />
            <Route path="/m" element={<MobileWaitlist />} />
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/feed" />} />
            <Route path="/about" element={<About />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/reader" element={<Reader />} />
            <Route path="/creator" element={<CollaborativeCreator />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/my-comics" element={
              <ProtectedRoute>
                <ComicGrid onCreateNew={handleCreateNew} setShowMyComics={setShowMyComics} />
              </ProtectedRoute>
            } />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/supabase-diagnostic" element={<SupabaseDiagnostic />} />
            <Route path="/cloudinary-tester" element={<CloudinaryTester />} />
          </Routes>
        </div>

        {!isCreatorMode && (!isReaderMode || !currentComic) && !isStandalonePage && !isTermsPage && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white/10 backdrop-blur-md rounded-full px-2 py-1.5 flex items-center space-x-1">
              <button
                onClick={(e) => handleLogoClick(e)}
                className={`p-2 rounded-full transition-colors ${!showMyComics && !showProfile && !currentComic ? 'bg-blue-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              >
                <Home size={20} />
              </button>
              <button
                onClick={handleMyComicsClick}
                className={`p-2 rounded-full transition-colors ${showMyComics ? 'bg-blue-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              >
                <BookOpen size={20} />
              </button>
              <button
                onClick={handleProfileClick}
                className={`p-2 rounded-full transition-colors ${showProfile ? 'bg-blue-500 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              >
                <User size={20} />
              </button>
              
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

// App just sets up the providers now
function App() {
  return (
    <AppContent />
  );
}

export default App;