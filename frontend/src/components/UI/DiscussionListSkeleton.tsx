import { useTheme } from '../../context/ThemeContext';

const ROW_COUNT = 5;

/**
 * Skeleton list that mirrors the conversations list on DiscussionsPage (~90% similar).
 * Each row: avatar circle, name, last message line, timestamp.
 */
export const DiscussionListSkeleton = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <>
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <div
          key={i}
          className={`p-4 border-b ${
            isLight ? 'border-[#b4b4b4]' : 'border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex-shrink-0 skeleton-shimmer ${
                isLight ? 'bg-gray-200' : 'bg-gray-600'
              }`}
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div
                className={`h-4 w-3/4 max-w-[140px] rounded skeleton-shimmer ${
                  isLight ? 'bg-gray-200' : 'bg-gray-600'
                }`}
              />
              <div
                className={`h-3 w-full max-w-[180px] rounded skeleton-shimmer ${
                  isLight ? 'bg-gray-200' : 'bg-gray-600'
                }`}
              />
              <div
                className={`h-3 w-1/2 max-w-[100px] rounded skeleton-shimmer ${
                  isLight ? 'bg-gray-200' : 'bg-gray-600'
                }`}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
