import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MenuIcon, XIcon, MessageCircleIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isGameRoom = location.pathname.startsWith('/game-room/');

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {!isGameRoom && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg ${
            theme === 'light' 
              ? 'bg-white border border-[#b4b4b4] text-black' 
              : 'bg-gray-800 text-white'
          }`}
        >
          {isSidebarOpen ? <XIcon size={24} /> : <MenuIcon size={30} />}
        </button>
      )}
      {!isGameRoom && (
        <div
          className={`
            fixed inset-y-0 right-0 z-40 transform lg:transform-none lg:opacity-100 lg:inset-y-0 lg:left-0 lg:right-auto
            transition duration-200 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 lg:translate-x-0'}
          `}
        >
          <Sidebar 
            isCollapsed={isCollapsed} 
            onToggleCollapse={handleToggleCollapse}
            onLinkClick={handleSidebarClose}
          />
        </div>
      )}
      <div className={`flex-1 ${!isGameRoom ? (isCollapsed ? 'lg:ml-20' : 'lg:ml-64') : ''}`}>
        <Outlet />
      </div>
      {isSidebarOpen && (
        <div
          className={`fixed inset-0 z-30 lg:hidden ${
            theme === 'light' 
              ? 'bg-black bg-opacity-30' 
              : 'bg-black bg-opacity-50'
          }`}
          onClick={handleSidebarClose}
        />
      )}
      <button
        onClick={() => navigate('/discussions')}
        className={`lg:hidden fixed bottom-10 right-3 z-40 p-4 text-white rounded-full shadow-lg transition-colors ${
          theme === 'light' 
            ? 'bg-[#209db8] hover:bg-[#1a7d94]' 
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
        title="Discussions"
      >
        <MessageCircleIcon size={24} />
      </button>
    </>
  );
} 
