import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { DicesIcon, PlusCircleIcon, BarChart3Icon, UserIcon, ChevronLeftIcon, ChevronRightIcon, WalletIcon, MessageCircleIcon, SunIcon, MoonIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useState, useEffect } from 'react';
import apiClient from '../../utils/axiosConfig';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLinkClick?: () => void;
}

interface UserApiResponse {
  success: boolean;
  data: {
    balance: number;
  };
}

export const Sidebar = ({ isCollapsed, onToggleCollapse, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (user?.id) {
        try {
          const res = await apiClient.get<UserApiResponse>(`/user/${user.id}`);
          if (res.data.success) {
            setBalance(res.data.data.balance || 0);
          }
        } catch (error) {
          console.error("Failed to fetch balance in sidebar", error);
        }
      }
    };

    fetchBalance();
    
    // Set up an interval to refresh balance every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [user?.id]);
  
  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: <DicesIcon size={24} />
    },
    // {
    //   path: '/my-game-rooms',
    //   label: 'My Game Rooms',
    //   icon: <DicesIcon size={24} />
    // },
    {
      path: '/create-game-room',
      label: 'Create Game Room',
      icon: <PlusCircleIcon size={24} />
    },
    // {
    //   path: '/tournaments',
    //   label: 'Tournaments',
    //   icon: <TrophyIcon size={24} />
    // },
    {
      path: '/discussions',
      label: 'Discussions',
      icon: <MessageCircleIcon size={24} />
    },
    {
      path: '/leaderboard',
      label: 'Leaderboards',
      icon: <BarChart3Icon size={24} />
    },
    {
      path: '/profile',
      label: 'Game Profile',
      icon: <UserIcon size={24} />
    }
  ];

  return (
    <div className={`h-screen p-4 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${
      theme === 'light' 
        ? 'bg-[#ffffff] border-r border-[#b4b4b4]' 
        : 'bg-gray-800'
    }`}>
      <div className="mb-8 mt-4 cursor-pointer" onClick={() => navigate('/')}>
        <h1 className={`${isCollapsed ? 'text-md' : 'text-2xl'} font-bold text-center ${
          theme === 'light' 
            ? 'text-[#8b5cf6] drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]' 
            : 'text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]'
        }`}>
          Arena
        </h1>
        {!isCollapsed && <p className={`text-center text-sm ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>Game Room</p>}
      </div>

      {/* Balance & Deposit Section */}
      {!isCollapsed && user && (
        <div className={`mb-6 rounded-xl p-3 border ${
          theme === 'light' 
            ? 'bg-white/50 border-[#b4b4b4]' 
            : 'bg-gray-700/50 border-gray-600'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <WalletIcon size={18} className={`flex-shrink-0 ${
                theme === 'light' ? 'text-[#8b5cf6]' : 'text-purple-400'
              }`} />
              <div className="min-w-0">
                <p className={`text-xs ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>Balance</p>
                <p className={`text-lg font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>${balance.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigate('/wallet');
                onLinkClick?.();
              }}
              className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                theme === 'light' 
                  ? 'bg-[#8b5cf6] hover:bg-[#7c3aed]' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Deposit
            </button>
          </div>
        </div>
      )}
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onLinkClick}
                className={({ isActive }) => {
                  const baseClasses = `w-full flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-lg transition-all duration-200`;
                  if (isActive) {
                    return theme === 'light'
                      ? `${baseClasses} bg-[#8b5cf6]/20 text-[#8b5cf6]`
                      : `${baseClasses} bg-purple-900/40 text-purple-400`;
                  }
                  return theme === 'light'
                    ? `${baseClasses} hover:bg-white/50`
                    : `${baseClasses} hover:bg-gray-700`;
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={
                  location.pathname === item.path 
                    ? (theme === 'light' ? 'text-[#8b5cf6]' : 'text-purple-500')
                    : (theme === 'light' ? 'text-black' : 'text-gray-300')
                }>
                  {item.icon}
                </span>
                {!isCollapsed && <span className={`ml-3 font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={`border-t my-4 ${theme === 'light' ? 'border-[#b4b4b4]' : 'border-gray-700'}`}></div>
      {/* Chevron and Theme Toggle - Column when collapsed, Row when expanded */}
      <div className={`hidden lg:flex mt-auto gap-2 ${isCollapsed ? 'flex-col' : 'flex-row items-center'}`}>
        <button
          onClick={onToggleCollapse}
          className={`${isCollapsed ? 'w-full' : 'flex-1'} flex items-center justify-center p-3 rounded-lg transition-colors ${
            theme === 'light' 
              ? 'hover:bg-white/50' 
              : 'hover:bg-gray-700'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon size={24} className={theme === 'light' ? 'text-black' : 'text-white'} /> : <ChevronLeftIcon size={24} className={theme === 'light' ? 'text-black' : 'text-white'} />}
        </button>
        <button
          onClick={toggleTheme}
          className={`${isCollapsed ? 'w-full' : 'flex-1'} flex items-center justify-center p-3 rounded-lg transition-colors ${
            theme === 'light' 
              ? 'hover:bg-white/50' 
              : 'hover:bg-gray-700'
          }`}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <MoonIcon size={24} className="text-black" />
          ) : (
            <SunIcon size={24} className="text-white" />
          )}
        </button>
      </div>
    </div>
  );
};