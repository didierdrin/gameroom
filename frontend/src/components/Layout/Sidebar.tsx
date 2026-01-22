import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { DicesIcon, PlusCircleIcon, BarChart3Icon, UserIcon, ChevronLeftIcon, ChevronRightIcon, WalletIcon, MessageCircleIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
      path: '/leaderboard',
      label: 'Leaderboards',
      icon: <BarChart3Icon size={24} />
    },
    {
      path: '/discussions',
      label: 'Discussions',
      icon: <MessageCircleIcon size={24} />
    },
    {
      path: '/profile',
      label: 'Game Profile',
      icon: <UserIcon size={24} />
    }
  ];

  return (
    <div className={`h-screen p-4 flex flex-col bg-gray-800 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="mb-8 mt-4 cursor-pointer" onClick={() => navigate('/')}>
        <h1 className={`${isCollapsed ? 'text-md' : 'text-2xl'} font-bold text-center text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]`}>
          Arena
        </h1>
        {!isCollapsed && <p className="text-center text-sm text-gray-400">Game Room</p>}
      </div>

      {/* Balance & Deposit Section */}
      {!isCollapsed && user && (
        <div className="mb-6 bg-gray-700/50 rounded-xl p-3 border border-gray-600">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <WalletIcon size={18} className="text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Balance</p>
                <p className="text-lg font-bold text-white">${balance.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigate('/wallet');
                onLinkClick?.();
              }}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
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
                className={({ isActive }) => `
                  w-full flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-lg transition-all duration-200
                  ${isActive ? 'bg-purple-900/40 text-purple-400' : 'hover:bg-gray-700'}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={location.pathname === item.path ? 'text-purple-500' : ''}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="ml-3 font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-gray-700 my-4"></div>
      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex items-center justify-center p-3 rounded-lg hover:bg-gray-700 transition-colors mt-auto"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRightIcon size={24} /> : <ChevronLeftIcon size={24} />}
      </button>
    </div>
  );
};