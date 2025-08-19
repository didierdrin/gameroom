import React, { useState, useEffect } from 'react';
import { SectionTitle } from '../components/UI/SectionTitle';
import { TrophyIcon, BarChart3Icon, ClockIcon, StarIcon, EditIcon, RefreshCwIcon, TrendingUpIcon, CalendarIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GameStat {
  gameType: string;
  count: number;
  wins: number;
  totalScore: number;
  winRate: number;
  lastPlayed: string;
}

interface RecentGame {
  id: string;
  name: string;
  type: string;
  date: string;
  result: string;
  score: number;
  duration: number;
  totalPlayers: number;
  startedAt: string;
  endedAt: string;
}

interface FavoriteGame {
  gameType: string;
  count: number;
  wins: number;
  winRate: number;
  lastPlayed: string;
}

interface Badge {
  id: number;
  name: string;
  icon: string;
  description: string;
  date: string;
  category: string;
}

interface UserProfileData {
  _id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  gameStats: GameStat[];
  recentGames: RecentGame[];
  favoriteGames: FavoriteGame[];
  badges: Badge[];
  globalRank: string;
  winRate: number;
}

export const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const { user: authUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (showLoading = true) => {
    if (!authUser) return;
    
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching profile for user ID:', authUser.id);
      console.log('User object:', authUser);
      
      // First try to fetch by user ID
      let response = await fetch(`https://alu-globe-gameroom.onrender.com/user/${authUser.id}/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Profile response status:', response.status);
      
      if (!response.ok) {
        console.log('ID-based lookup failed, trying username-based lookup...');
        
        // If ID lookup fails, try to find user by username from leaderboard
        const leaderboardResponse = await fetch('https://alu-globe-gameroom.onrender.com/user/leaderboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          console.log('Leaderboard data:', leaderboardData);
          
          let users = [];
          if (leaderboardData.success && leaderboardData.data) {
            users = leaderboardData.data;
          } else if (Array.isArray(leaderboardData)) {
            users = leaderboardData;
          }
          
          // Find current user in leaderboard
          const currentUser = users.find((user: any) => 
            user.username === authUser.username || user._id === authUser.id
          );
          
          if (currentUser) {
            console.log('Found user in leaderboard:', currentUser);
            
            // Update the auth context with correct ID if needed
            if (currentUser._id !== authUser.id) {
              console.log('Updating user ID in auth context');
              updateUser({ id: currentUser._id });
            }
            
            // Try profile fetch again with correct ID
            response = await fetch(`https://alu-globe-gameroom.onrender.com/user/${currentUser._id}/profile`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            
            if (!response.ok) {
              // If still failing, create profile from leaderboard data
              setUserData({
                _id: currentUser._id,
                username: currentUser.username,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalScore: currentUser.score || 0,
                gamesPlayed: currentUser.gamesPlayed || 0,
                gamesWon: currentUser.gamesWon || 0,
                gameStats: [],
                recentGames: [],
                favoriteGames: [],
                badges: [],
                globalRank: users.findIndex((u: any) => u._id === currentUser._id) + 1,
                winRate: currentUser.winRate || (currentUser.gamesPlayed > 0 ? Math.round((currentUser.gamesWon / currentUser.gamesPlayed) * 100) : 0)
              });
              return;
            }
          } else {
            throw new Error('User not found in system');
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const result = await response.json();
      console.log('Profile response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch profile');
      }
      
      setUserData(result.data);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      setError(error.message || 'Failed to fetch profile data');
      
      // Set fallback data
      setUserData({
        _id: authUser.id,
        username: authUser.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        gameStats: [],
        recentGames: [],
        favoriteGames: [],
        badges: [],
        globalRank: 'Unranked',
        winRate: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [authUser]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProfile(false);
  };

  const renderStats = () => {
    if (loading) return <div className="text-center py-8">Loading stats...</div>;
    if (!userData) return <div className="text-center py-8 text-red-400">No data available</div>;
    
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center mr-4">
              <BarChart3Icon size={24} className="text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Score</div>
              <div className="text-2xl font-bold">{userData.totalScore}</div>
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center mr-4">
              <TrophyIcon size={24} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Games Won</div>
              <div className="text-2xl font-bold">
                {userData.gamesWon}/{userData.gamesPlayed}
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center mr-4">
              <StarIcon size={24} className="text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Win Rate</div>
              <div className="text-2xl font-bold">{userData.winRate}%</div>
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mr-4">
              <TrendingUpIcon size={24} className="text-red-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Global Rank</div>
              <div className="text-2xl font-bold">{userData.globalRank}</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Specific Stats */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-medium mb-4">Game Performance</h3>
            {userData.gameStats.length > 0 ? (
              <div className="space-y-4">
                {userData.gameStats.map((stat) => (
                  <div key={stat.gameType} className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
                      {stat.gameType === 'trivia' ? '🎯' : 
                       stat.gameType === 'chess' ? '♟️' : 
                       stat.gameType === 'uno' ? '🃏' : 
                       stat.gameType === 'kahoot' ? '❓' : 
                       stat.gameType === 'pictionary' ? '🎨' : 
                       stat.gameType === 'ludo' ? '🎲' : '🎮'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{stat.gameType}</span>
                        <span className="text-sm text-gray-400">
                          {stat.count} games
                        </span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-600 rounded-full" 
                              style={{ width: `${stat.winRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="ml-2 text-sm">
                          {stat.winRate}% win rate
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Last played: {stat.lastPlayed ? new Date(stat.lastPlayed).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No game statistics available yet. Start playing to see your stats!</p>
            )}
          </div>
          
          {/* Recent Games */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-medium mb-4">Recent Games</h3>
            {userData.recentGames.length > 0 ? (
              <div className="space-y-3">
                {userData.recentGames.map((game) => (
                  <div key={game.id} className="flex items-center p-2 hover:bg-gray-700/30 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
                      {game.type === 'trivia' ? '🎯' : 
                       game.type === 'chess' ? '♟️' : 
                       game.type === 'uno' ? '🃏' : 
                       game.type === 'kahoot' ? '❓' : 
                       game.type === 'pictionary' ? '🎨' : 
                       game.type === 'ludo' ? '🎲' : '🎮'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{game.name}</span>
                        <span className="text-sm text-gray-400">{game.date}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-gray-400 capitalize">{game.type}</span>
                        <span className={`text-sm ${
                          game.result === 'Won' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {game.result} {game.score > 0 && `(${game.score} pts)`}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {game.totalPlayers} players • {game.duration > 0 ? `${Math.round(game.duration / 60)}m` : 'Quick game'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No recent games played. Join a game to get started!</p>
            )}
          </div>
        </div>
        
        {/* Favorite Games */}
        {userData.favoriteGames.length > 0 && (
          <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-medium mb-4">Favorite Games</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {userData.favoriteGames.map((game) => (
                <div key={game.gameType} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-600/50 flex items-center justify-center text-lg mr-2">
                      {game.gameType === 'trivia' ? '🎯' : 
                       game.gameType === 'chess' ? '♟️' : 
                       game.gameType === 'uno' ? '🃏' : 
                       game.gameType === 'kahoot' ? '❓' : 
                       game.gameType === 'pictionary' ? '🎨' : 
                       game.gameType === 'ludo' ? '🎲' : '🎮'}
                    </div>
                    <span className="font-medium capitalize">{game.gameType}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    <div>Games: {game.count}</div>
                    <div>Wins: {game.wins}</div>
                    <div>Win Rate: {game.winRate}%</div>
                    <div className="text-xs mt-1">
                      Last: {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBadges = () => {
    if (loading) return <div className="text-center py-8">Loading badges...</div>;
    if (!userData) return <div className="text-center py-8 text-red-400">No data available</div>;
    
    return (
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Achievement Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{userData.badges.length}</div>
              <div className="text-sm text-gray-400">Total Badges</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{userData.gamesWon}</div>
              <div className="text-sm text-gray-400">Games Won</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{userData.winRate}%</div>
              <div className="text-sm text-gray-400">Win Rate</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {userData.badges.length > 0 ? (
            userData.badges.map((badge) => (
              <div key={badge.id} className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-start ${
                badge.category === 'achievement' ? 'border-yellow-500/50' :
                badge.category === 'milestone' ? 'border-blue-500/50' :
                badge.category === 'specialist' ? 'border-purple-500/50' : ''
              }`}>
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-3xl mr-4 ${
                  badge.category === 'achievement' ? 'bg-gradient-to-br from-yellow-600/30 to-orange-600/30' :
                  badge.category === 'milestone' ? 'bg-gradient-to-br from-blue-600/30 to-cyan-600/30' :
                  badge.category === 'specialist' ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30' :
                  'bg-gradient-to-br from-gray-600/30 to-gray-700/30'
                }`}>
                  {badge.icon}
                </div>
                <div>
                  <h3 className="font-bold">{badge.name}</h3>
                  <p className="text-sm text-gray-400 mb-1">{badge.description}</p>
                  <p className="text-xs text-gray-500">Earned on {badge.date}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
                    badge.category === 'achievement' ? 'bg-yellow-500/20 text-yellow-300' :
                    badge.category === 'milestone' ? 'bg-blue-500/20 text-blue-300' :
                    badge.category === 'specialist' ? 'bg-purple-500/20 text-purple-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {badge.category}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-400">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-lg mb-2">No badges earned yet</p>
              <p className="text-sm">Keep playing games to unlock achievements and earn badges!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 overflow-y-auto h-screen pb-20">
        <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="p-6 overflow-y-auto h-screen pb-20">
        <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">
            <div className="text-center">
              <div className="text-lg mb-2">Error: {error}</div>
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-6 overflow-y-auto h-screen pb-20">
        <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">No profile data available</div>
        </div>
      </div>
    );
  }

  // Format username to look like a name
  const formattedName = userData.username 
    ? userData.username
        .split('')
        .map((char, i) => i === 0 ? char.toUpperCase() : char)
        .join('')
    : 'Loading...';

  const joinDate = userData.createdAt 
    ? new Date(userData.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    : 'Unknown';

  return (
    <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
      
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="flex flex-col md:flex-row items-center">
            <div className="relative">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.username)}`}
                alt={formattedName} 
                className="w-24 h-24 rounded-full border-4 border-purple-500" 
              />
              <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-900 cursor-pointer">
                <EditIcon size={16} />
              </div>
            </div>
            <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
              <h2 className="text-2xl font-bold">{formattedName}</h2>
              <p className="text-gray-300">
                Member since {joinDate}
              </p>
              <div className="flex items-center mt-2 justify-center md:justify-start">
                <div className="bg-purple-600/30 border border-purple-500 px-3 py-1 rounded-full text-sm">
                  Level {Math.floor(userData.gamesPlayed / 10) + 1}
                </div>
                <div className="mx-2 h-1 w-1 rounded-full bg-gray-500"></div>
                <div className="text-sm text-gray-300">
                  Global Rank: {userData.globalRank}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                refreshing 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white`}
            >
              <RefreshCwIcon size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="px-4 py-2 bg-white text-purple-900 font-medium rounded-lg hover:bg-gray-100 transition-colors">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex mb-6 border-b border-gray-700">
        <button 
          onClick={() => setActiveTab('stats')} 
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'stats' 
              ? 'text-purple-400 border-b-2 border-purple-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Statistics
        </button>
        <button 
          onClick={() => setActiveTab('badges')} 
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'badges' 
              ? 'text-purple-400 border-b-2 border-purple-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Badges & Achievements
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'text-purple-400 border-b-2 border-purple-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Settings
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'badges' && renderBadges()}
      {activeTab === 'settings' && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
          <p className="text-gray-400">Profile settings would appear here.</p>
        </div>
      )}
    </div>
  );
};

