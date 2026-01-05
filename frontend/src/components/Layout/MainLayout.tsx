import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MenuIcon, XIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const isGameRoom = location.pathname.startsWith('/game-room/');

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white overflow-hidden">
      {!isGameRoom && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 border border-gray-800 rounded-lg shadow-lg"
        >
          {isSidebarOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      )}
      
      {!isGameRoom && (
        <div
          className={`
            fixed inset-y-0 left-0 z-40 transform lg:transform-none lg:opacity-100
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0'}
            ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          `}
        >
          <Sidebar 
            isCollapsed={isCollapsed} 
            onToggle={() => setIsCollapsed(!isCollapsed)} 
          />
        </div>
      )}

      <main 
        className={`flex-1 transition-all duration-300 ease-in-out h-screen overflow-y-auto
          ${!isGameRoom ? (isCollapsed ? 'lg:ml-20' : 'lg:ml-64') : ''}
        `}
      >
        <Outlet />
      </main>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={handleSidebarClose}
        />
      )}
    </div>
  );
} 
