import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon, MessageCircleIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomNavBar } from './BottomNavBar';
import { useTheme } from '../../context/ThemeContext';

export function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isGameRoom = location.pathname.startsWith('/game-room/');

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Top navbar: full width at top on small screens */}
      {!isGameRoom && (
        <header
          className={`sticky top-0 left-0 right-0 z-40 w-full flex items-center justify-between px-4 py-3 border-b shrink-0 lg:hidden ${
            theme === 'light'
              ? 'bg-white border-[#b4b4b4]'
              : 'bg-gray-800 border-gray-700'
          }`}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`text-xl font-bold ${
              theme === 'light'
                ? 'text-[#209db8]'
                : 'text-purple-400'
            }`}
          >
            Arena
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
            }`}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? (
              <MoonIcon size={22} className="text-black" />
            ) : (
              <SunIcon size={22} className="text-white" />
            )}
          </button>
        </header>
      )}

      {/* Sidebar: only on lg and up; hidden on small screens */}
      {!isGameRoom && (
        <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>
      )}

      {/* Main content: offset for sidebar on lg+; padding for bottom nav on small */}
      <div
        className={`flex-1 flex flex-col min-h-0 ${
          !isGameRoom ? (isCollapsed ? 'lg:ml-20' : 'lg:ml-64') : ''
        } pb-20 lg:pb-0`}
      >
        <Outlet />
      </div>

      {/* Bottom nav: only on small screens (replaces sidebar/drawer) */}
      {!isGameRoom && (
        <div className="lg:hidden shrink-0">
          <BottomNavBar />
        </div>
      )}

      {/* FAB: Discussions (chat) - small screens only, above bottom nav */}
      {!isGameRoom && (
        <button
          type="button"
          onClick={() => navigate('/discussions')}
          className={`lg:hidden fixed bottom-24 right-4 z-40 p-4 rounded-full shadow-lg transition-colors ${
            theme === 'light'
              ? 'bg-[#209db8] hover:bg-[#1a7d94] text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
          title="Discussions"
          aria-label="Discussions"
        >
          <MessageCircleIcon size={24} />
        </button>
      )}
    </div>
  );
} 
