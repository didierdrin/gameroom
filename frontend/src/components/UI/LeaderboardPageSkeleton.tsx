import { SectionTitle } from './SectionTitle';
import { useTheme } from '../../context/ThemeContext';

/**
 * Skeleton for LeaderboardPage (~90% similar): title, header buttons, filter pills, podium (top 3), table.
 */
export const LeaderboardPageSkeleton = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const base = isLight ? 'bg-gray-200' : 'bg-gray-600';

  return (
    <div className={`p-4 sm:p-6 overflow-y-auto h-screen pb-20 ${theme === 'light' ? 'bg-[#ffffff]' : ''}`}>
      <SectionTitle title="Leaderboards" subtitle="See who's on top of the Arena gaming world" />

      {/* Header buttons row */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-4 sm:mb-8 gap-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className={`h-12 w-full sm:w-40 rounded-lg skeleton-shimmer ${base}`} />
          <div className={`h-12 w-full sm:w-44 rounded-lg skeleton-shimmer ${base}`} />
        </div>
        <div className={`h-12 w-full sm:w-28 rounded-lg skeleton-shimmer ${base}`} />
      </div>

      {/* Filter pills */}
      <div className="mb-6 sm:mb-8">
        <div className={`h-3 w-24 rounded mb-2 skeleton-shimmer ${base}`} />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-9 w-20 rounded-lg skeleton-shimmer ${base}`} />
          ))}
        </div>
      </div>

      {/* Podium - 3 columns */}
      <div className="flex flex-row justify-center items-end gap-4 sm:gap-6 md:gap-20 lg:gap-32 mb-8 lg:mb-12 px-4">
        {[2, 1, 3].map((order) => (
          <div key={order} className="flex flex-col items-center">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full skeleton-shimmer ${base}`} />
            <div className={`mt-2 h-4 w-16 rounded skeleton-shimmer ${base}`} />
            <div className={`mt-1 h-3 w-12 rounded skeleton-shimmer ${base}`} />
            <div
              className={`mt-2 rounded-t-lg skeleton-shimmer ${base}`}
              style={{
                width: order === 1 ? 100 : 80,
                height: order === 1 ? 112 : 80,
              }}
            />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div
        className={`backdrop-blur-sm rounded-xl border overflow-hidden ${
          isLight ? 'bg-white border-[#b4b4b4]' : 'bg-gray-800/50 border-gray-700/50'
        }`}
      >
        <table className="w-full">
          <thead>
            <tr className={isLight ? 'bg-gray-100' : 'bg-gray-800'}>
              {['Rank', 'Player', 'Score', 'Games', 'Win Rate'].map((_, i) => (
                <th key={i} className="px-6 py-4 text-left">
                  <div className={`h-3 w-12 rounded skeleton-shimmer ${base}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isLight ? 'divide-y divide-gray-200' : 'divide-y divide-gray-700'}>
            {Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className={`w-8 h-8 rounded-full skeleton-shimmer ${base}`} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full skeleton-shimmer ${base}`} />
                    <div className={`ml-3 h-4 w-24 rounded skeleton-shimmer ${base}`} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className={`h-5 w-10 rounded skeleton-shimmer ${base}`} />
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className={`h-4 w-8 rounded skeleton-shimmer ${base}`} />
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className={`h-4 w-10 rounded skeleton-shimmer ${base}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
