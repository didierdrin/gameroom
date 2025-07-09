import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Helmet } from 'react-helmet';
import { router } from './routes';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';
import { SocketProvider } from './SocketContext';
import { AuthProvider } from './context/AuthContext'; 

export function App() {
  return (
    <SocketProvider>
      <AuthProvider>
      <Helmet>
        <title>Alu Globe Gameroom</title>
      </Helmet>
      <ErrorBoundary>
        <div className="flex w-full min-h-screen bg-gray-900 text-white">
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
            theme="dark"
          />
        </div>
      </ErrorBoundary>
      </AuthProvider>
    </SocketProvider>
  );
}
