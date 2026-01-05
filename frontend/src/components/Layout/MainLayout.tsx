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
    <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
      {!isGameRoom && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700"
        >
          {isSidebarOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      )}

      {!isGameRoom && (
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 transform lg:static lg:transform-none
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'}
            ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
            w-64 flex-shrink-0
          `}
        >
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        </aside>
      )}

      <main 
        className="flex-1 flex flex-col min-w-0 min-h-0 bg-gray-900 relative"
      >
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={handleSidebarClose}
        />
      )}
    </div>
  );
} 
