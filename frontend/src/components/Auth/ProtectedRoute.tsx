// src/components/Auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// import { useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  // const location = useLocation(); 

  if (isLoading) {
    // Wait for auth to finish before redirecting
    return <div className="p-4 text-center min-h-screen w-full items-center justify-center">Loading...</div>;
  }

  // if (!user) {
  //   return <Navigate to="/login" state={{ from: location }} replace />;
  // }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

