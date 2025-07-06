
// src/App.tsx
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { router } from './routes';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';

export function App() {
  useEffect(() => {
    // Check if user is logged in on app startup
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');
    
    // If not logged in and not already on login page, redirect to login
    if (!username || !userId) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.replace('/login');
      }
    }
  }, []);

  return (
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
  );
}

// import React from 'react';
// import { RouterProvider } from 'react-router-dom';
// import { ToastContainer } from 'react-toastify';
// import { router } from './routes';
// import { ErrorBoundary } from './components/UI/ErrorBoundary';
// import 'react-toastify/dist/ReactToastify.css';

// export function App() {
//   return (
//     <ErrorBoundary>
//       <div className="flex w-full min-h-screen bg-gray-900 text-white">
//         <RouterProvider router={router} />
//         <ToastContainer
//           position="top-right"
//           autoClose={5000}
//           hideProgressBar={false}
//           newestOnTop
//           closeOnClick
//           rtl={false}
//           pauseOnFocusLoss
//           draggable
//           pauseOnHover
//           theme="dark"
//         />
//       </div>
//     </ErrorBoundary>
//   );
// }