import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MenuIcon, XIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isGameRoom = location.pathname.startsWith('/game-room/');

  return (
    <>
      {!isGameRoom && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg"
        >
          {isSidebarOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      )}
      {!isGameRoom && (
        <div
          className={`
            fixed inset-y-0 left-0 z-40 transform lg:transform-none lg:opacity-100
            transition duration-200 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0'}
          `}
        >
          <Sidebar />
        </div>
      )}
      <div className={`flex-1 ${!isGameRoom ? 'lg:ml-64' : ''}`}>
        <Outlet />
      </div>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
} 