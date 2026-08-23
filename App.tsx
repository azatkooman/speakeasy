
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeakEasyProvider, useSpeakEasy } from './contexts/SpeakEasyContext.tsx';
import { Header } from './components/Header.tsx';
import { BoardPage } from './pages/BoardPage.tsx';
import { audioPlayer } from './services/audioPlayer.ts';
import { SplashScreen } from '@capacitor/splash-screen';

const MainLayout: React.FC = () => {
  const { isInitializing } = useSpeakEasy();

  // Hide Splash Screen when data is loaded
  useEffect(() => {
    if (!isInitializing) {
      const hideSplash = async () => {
        try {
          await SplashScreen.hide({
             fadeOutDuration: 500
          });
        } catch (e) {
          console.log('Splash screen hide failed (likely running in browser)', e);
        }
      };
      hideSplash();
    }
  }, [isInitializing]);

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin text-primary rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden font-sans select-none">
      <Header />
      <Routes>
        <Route path="/" element={<BoardPage />} />
      </Routes>
    </div>
  );
};

function App() {
  // Global audio unlock on first interaction
  useEffect(() => {
    const unlock = () => {
      audioPlayer.unlock();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <SpeakEasyProvider>
      <Router>
        <MainLayout />
      </Router>
    </SpeakEasyProvider>
  );
}

export default App;
