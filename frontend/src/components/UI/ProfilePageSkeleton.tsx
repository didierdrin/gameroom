import { SectionTitle } from './SectionTitle';
import { useTheme } from '../../context/ThemeContext';

/**
 * Skeleton for ProfilePage (~90% similar): title, search, header (avatar + lines), tabs, 4 stat cards, 2 content cards.
 */
export const ProfilePageSkeleton = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const base = isLight ? 'bg-gray-200' : 'bg-gray-600';

  return (
    <div className={`p-4 sm:p-6 overflow-y-auto overflow-x-hidden h-screen pb-20 ${theme === 'light' ? 'bg-[#ffffff]' : ''}`}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <SectionTitle title="Game Profile" subtitle="View gaming stats, achievements, and history" />
        <div className={`h-10 w-full md:w-[400px] rounded-lg skeleton-shimmer ${base}`} />
      </div>

      {/* Profile header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 sm:p-6 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className={`w-24 h-24 rounded-full skeleton-shimmer ${base}`} />
            <div className="md:ml-6 mt-4 md:mt-0 space-y-2 text-center md:text-left">
              <div className={`h-7 w-32 rounded skeleton-shimmer ${base}`} />
              <div className={`h-4 w-40 rounded skeleton-shimmer ${base}`} />
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <div className={`h-6 w-20 rounded-full skeleton-shimmer ${base}`} />
                <div className={`h-6 w-24 rounded skeleton-shimmer ${base}`} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className={`h-10 w-24 rounded-lg skeleton-shimmer ${base}`} />
            <div className={`h-10 w-28 rounded-lg skeleton-shimmer ${base}`} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 border-b border-gray-700 overflow-x-auto gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-10 w-24 rounded-t skeleton-shimmer ${base}`} />
        ))}
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`backdrop-blur-sm rounded-xl border p-4 flex items-center ${
              isLight ? 'bg-white border-[#b4b4b4]' : 'bg-gray-800/50 border-gray-700/50'
            }`}
          >
            <div className={`w-12 h-12 rounded-full skeleton-shimmer ${base} mr-4`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 w-16 rounded skeleton-shimmer ${base}`} />
              <div className={`h-6 w-12 rounded skeleton-shimmer ${base}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column content: Game Performance + Recent Games */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`backdrop-blur-sm rounded-xl border p-6 ${
            isLight ? 'bg-white border-[#b4b4b4]' : 'bg-gray-800/50 border-gray-700/50'
          }`}
        >
          <div className={`h-5 w-40 rounded skeleton-shimmer ${base} mb-4`} />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-10 h-10 rounded-lg skeleton-shimmer ${base} mr-3`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 w-full max-w-[120px] rounded skeleton-shimmer ${base}`} />
                  <div className={`h-2 w-full rounded skeleton-shimmer ${base}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className={`backdrop-blur-sm rounded-xl border p-6 ${
            isLight ? 'bg-white border-[#b4b4b4]' : 'bg-gray-800/50 border-gray-700/50'
          }`}
        >
          <div className={`h-5 w-32 rounded skeleton-shimmer ${base} mb-4`} />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center p-2">
                <div className={`w-10 h-10 rounded-lg skeleton-shimmer ${base} mr-3`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 w-3/4 max-w-[140px] rounded skeleton-shimmer ${base}`} />
                  <div className={`h-3 w-1/2 max-w-[80px] rounded skeleton-shimmer ${base}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
