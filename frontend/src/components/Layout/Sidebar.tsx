import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, DicesIcon, PlusCircleIcon, TrophyIcon, BarChart3Icon, UserIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen p-4 flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out`}>
      <div className="mb-8 mt-4 flex flex-col items-center">
        <h1 className={`font-bold transition-all duration-300 ${isCollapsed ? 'text-lg' : 'text-2xl'} bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent`}>
          Arena
        </h1>
        {!isCollapsed && <p className="text-center text-sm text-gray-400">Game Room</p>}
      </div>
      <nav className="flex-1">
        <ul className="space-y-4">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `
                  w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl transition-all duration-200
                  ${isActive ? 'bg-purple-600/20 text-purple-400 shadow-lg shadow-purple-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                `}
              >
                <span className={`transition-all duration-200 ${location.pathname === item.path ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="ml-3 font-semibold whitespace-nowrap">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <button
          onClick={onToggle}
          className={`
            w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl
            text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200
          `}
        >
          {isCollapsed ? <ChevronRight size={24} /> : (
            <>
              <ChevronLeft size={24} />
              <span className="ml-3 font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};