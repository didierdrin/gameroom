import { NavLink } from 'react-router-dom';
import { HomeIcon, Gamepad2Icon, BarChart3Icon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export function BottomNavBar() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const baseClasses = 'flex flex-col items-center justify-center flex-1 py-2 px-1 min-w-0 rounded-lg transition-colors';
  const activeClasses = theme === 'light'
    ? 'bg-[#209db8]/20 text-[#209db8]'
    : 'bg-purple-900/40 text-purple-400';
  const inactiveClasses = theme === 'light'
    ? 'text-[#6b7280]'
    : 'text-gray-400';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

  const profilePath = user?.username ? `/profile/${user.username}` : '/profile';

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 safe-area-pb flex items-center justify-around border-t ${
        theme === 'light'
          ? 'bg-white border-[#b4b4b4]'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      <NavLink to="/" className={linkClass} end>
        <HomeIcon size={24} className="flex-shrink-0" />
        <span className="text-xs font-medium mt-0.5">Home</span>
      </NavLink>

      <NavLink to="/play" className={linkClass}>
        <Gamepad2Icon size={24} className="flex-shrink-0" />
        <span className="text-xs font-medium mt-0.5">Play</span>
      </NavLink>

      <NavLink to="/leaderboard" className={linkClass}>
        <BarChart3Icon size={24} className="flex-shrink-0" />
        <span className="text-xs font-medium mt-0.5">Rank</span>
      </NavLink>

      <NavLink to={profilePath} className={linkClass} end={false}>
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt="Profile"
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
              theme === 'light' ? 'bg-[#209db8]/30 text-[#209db8]' : 'bg-purple-600/50 text-purple-300'
            }`}
          >
            {user?.username?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <span className="text-xs font-medium mt-0.5">Profile</span>
      </NavLink>
    </nav>
  );
}
