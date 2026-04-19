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
        <div className={`flex w-full min-h-screen ${theme === 'light' ? 'bg-[#ffffff] text-black' : 'bg-gray-900 text-white'}`}>
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
