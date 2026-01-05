import { NavLink, useLocation } from 'react-router-dom';
import { 
  DicesIcon, 
  PlusCircleIcon, 
  BarChart3Icon, 
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: <DicesIcon size={24} />
    },
    {
      path: '/create-game-room',
      label: 'Create Game Room',
      icon: <PlusCircleIcon size={24} />
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
    <div className={`
      w-64 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} 
      h-screen p-4 flex flex-col bg-gray-800 transition-all duration-300 ease-in-out border-r border-gray-700
    `}>
      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          Arena
        </h1>
        <p className={`text-center text-sm text-gray-400 animate-in fade-in duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
          Game Room
        </p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                title={isCollapsed ? item.label : ''}
                className={({ isActive }) => `
                  w-full flex items-center p-3 rounded-lg transition-all duration-200
                  ${isActive ? 'bg-purple-900/40 text-purple-400' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}
                  ${isCollapsed ? 'lg:justify-center' : ''}
                `}
              >
                <span className={`shrink-0 ${location.pathname === item.path ? 'text-purple-500' : ''}`}>
                  {item.icon}
                </span>
                <span className={`ml-3 font-medium whitespace-nowrap overflow-hidden text-ellipsis animate-in slide-in-from-left-1 duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-700 hidden lg:block">
        <button
          onClick={onToggle}
          className={`
            w-full flex items-center p-3 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          {isCollapsed ? (
            <ChevronRightIcon size={24} />
          ) : (
            <>
              <ChevronLeftIcon size={24} />
              <span className="ml-3 font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};