
// src/components/Auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};


// // src/components/Auth/ProtectedRoute.tsx
// import React from 'react';
// import { Navigate } from 'react-router-dom';

// interface ProtectedRouteProps {
//   children: React.ReactNode;
// }

// export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
//   const username = localStorage.getItem('username');
//   const userId = localStorage.getItem('userId');

//   // If user is not logged in, redirect to login page
//   if (!username || !userId) {
//     return <Navigate to="/login" replace />;
//   }

//   return <>{children}</>;
// };