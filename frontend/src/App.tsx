import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Helmet } from 'react-helmet';
import { getMessaging, isSupported } from 'firebase/messaging';
import { router } from './routes';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';
import { SocketProvider } from './SocketContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { getOrInitFirebaseApp, initForegroundMessaging, registerMessagingServiceWorker } from './lib/fcm';

const AppContent = () => {
  const { theme } = useTheme();

  useEffect(() => {
    let stopForeground: (() => void) | undefined;
    void (async () => {
      if (!(await isSupported())) return;
      await registerMessagingServiceWorker();
      const app = getOrInitFirebaseApp();
      const messaging = getMessaging(app);
      stopForeground = initForegroundMessaging(messaging);
    })();
    return () => {
      stopForeground?.();
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Arena Gameroom</title>
      </Helmet>
      <ErrorBoundary>
        <div
          className={`relative isolate flex w-full min-h-screen ${
            theme === 'light' ? 'bg-[#ffffff] text-black' : 'bg-gray-900 text-white'
          }`}
        >
          {/* Ambient violet: plain CSS in index.css (.ambient-*) */}
          <div
            aria-hidden
            className={`pointer-events-none fixed inset-0 z-0 ${
              theme === 'light' ? 'ambient-light' : 'ambient-dark'
            }`}
          />
          <div
            aria-hidden
            className={`pointer-events-none fixed inset-0 z-0 ${
              theme === 'light' ? 'ambient-fog-light' : 'ambient-fog-dark'
            }`}
          />
          <div className="relative z-[1] flex min-h-screen w-full min-w-0 flex-1 flex-col bg-transparent">
            <RouterProvider router={router} />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme={theme}
            />
          </div>
        </div>
      </ErrorBoundary>
    </>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}
