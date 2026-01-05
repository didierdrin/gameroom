import { NavLink, useLocation } from 'react-router-dom';
import { DicesIcon, PlusCircleIcon, BarChart3Icon, UserIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLinkClick?: () => void;
}

export const Sidebar = ({ isCollapsed, onToggleCollapse, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  
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
      path: '/profile',
      label: 'Game Profile',
      icon: <UserIcon size={24} />
    }
  ];

  return (
    <div className={`h-screen p-4 flex flex-col bg-gray-800 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold text-center bg-purple-800 bg-clip-text text-transparent">
          Arena
        </h1>
        {!isCollapsed && <p className="text-center text-sm text-gray-400">Game Room</p>}
      </div>
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