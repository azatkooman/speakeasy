
import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeakEasyProvider, useSpeakEasy } from './contexts/SpeakEasyContext.tsx';
import { Header } from './components/Header.tsx';
import { BoardPage } from './pages/BoardPage.tsx';
import { audioPlayer } from './services/audioPlayer.ts';
import { SplashScreen } from '@capacitor/splash-screen';

const MainLayout: React.FC = () => {
  const { isInitializing, initError, settings } = useSpeakEasy();

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

  /*
   * A recoverable failure screen, not an endless spinner. If start-up throws —
   * a blocked IndexedDB, a migration that cannot run, a corrupt profile — the
   * app used to sit on the loading spinner permanently, which for a
   * communication device means the child has no voice and nobody on screen is
   * told why or what to do. Retry is a reload: most of these are transient
   * (another tab holding the database open, storage pressure) and clear on a
   * second attempt.
   *
   * Deliberately not translated through `t`: the settings that carry the
   * language live in the profile this screen exists because it could not load.
   */
  if (initError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background p-6">
        <div role="alert" className="max-w-md text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">SpeakEasy could not start</h1>
          <p className="text-sm text-slate-500">
            Your boards and cards are still saved on this device. Restarting usually fixes this.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
          >
            Try again
          </button>
          <p className="text-[11px] font-mono text-slate-400 break-words pt-2">{initError}</p>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin text-primary rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div data-shell={settings.shell || 'youngLearner'}
      className="h-screen w-full bg-background flex flex-col overflow-hidden font-sans select-none">
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
