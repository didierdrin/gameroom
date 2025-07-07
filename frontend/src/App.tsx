import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Helmet } from 'react-helmet';
import { router } from './routes';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';
import { SocketProvider } from './SocketContext';

export function App() {
  return (
    <SocketProvider>
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
    </SocketProvider>
  );
}

// // src/App.tsx
// import React, { useEffect } from 'react';
// import { RouterProvider } from 'react-router-dom';
// import { ToastContainer } from 'react-toastify';
// import { router } from './routes';
// import { ErrorBoundary } from './components/UI/ErrorBoundary';
// import 'react-toastify/dist/ReactToastify.css';
// import { SocketProvider } from './SocketContext';

// export function App() {
//   return (
//     <SocketProvider>
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
//     </SocketProvider>
//   );
// }

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