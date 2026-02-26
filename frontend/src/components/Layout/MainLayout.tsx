import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomNavBar } from './BottomNavBar';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../utils/axiosConfig';

interface UserApiResponse {
  success: boolean;
  data: { balance: number };
}

export function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tickets, setTickets] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isGameRoom = location.pathname.startsWith('/game-room/');

  useEffect(() => {
    const fetchTickets = async () => {
      if (user?.id) {
        try {
          const res = await apiClient.get<UserApiResponse>(`/user/${user.id}`);
          if (res.data.success) setTickets(res.data.data.balance ?? 0);
        } catch {
          // ignore
        }
      }
    };
    fetchTickets();
    const intervalId = setInterval(fetchTickets, 30000);
    return () => clearInterval(intervalId);
  }, [user?.id]);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Top navbar: visible on small and md; hidden on lg and up (sidebar shown) */}
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
                ? 'text-[#8b5cf6]'
                : 'text-purple-400'
            }`}
          >
            Arena
          </button>
          <div className="flex items-center gap-1">
            {user && (
              <button
                type="button"
                onClick={() => navigate('/wallet')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'hover:bg-gray-100 text-black'
                    : 'hover:bg-gray-700 text-white'
                }`}
                title="Wallet"
              >
                <img src="/assets/ticket-icon.png" alt="" className="w-5 h-5 object-contain" />
                <span className="font-semibold text-sm">{tickets.toLocaleString()}</span>
              </button>
            )}
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
          </div>
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

    </div>
  );
} 
