import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; 
import { SectionTitle } from '../components/UI/SectionTitle';
import { TrophyIcon, BarChart3Icon, ClockIcon, StarIcon, EditIcon, RefreshCwIcon, TrendingUpIcon, CalendarIcon, LogOutIcon, XIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
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
  avatar?: string;
}

// Interface for gamerooms data structure
interface GameRoom {
  _id: string;
  roomName: string;
  gameType: string;
  creator: string;
  players: Array<{
    id: string;
    username: string;
    score?: number;
    position?: number;
    isWinner?: boolean;
  }>;
  status: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  maxPlayers: number;
  currentPlayers: number;
  scores?: { [playerId: string]: number };
  winner?: string;
}

export const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const { user: authUser, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  
  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    selectedAvatarStyle: 'avataaars',
    selectedAvatarSeed: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // New state for stable avatar browsing
  const [avatarSeed, setAvatarSeed] = useState(0);

  // Avatar options for selection
  const avatarOptions = ['adventurer', 'adventurer-neutral', 'avataaars', 'avataaars-neutral', 'big-ears', 'big-ears-neutral', 'big-smile', 'bottts', 'bottts-neutral', 'croodles', 'croodles-neutral', 'fun-emoji', 'icons', 'identicon', 'initials', 'lorelei'];

  const { username: paramUsername } = useParams<{ username?: string }>();

  // Function to fetch gamerooms data
  const fetchGameroomsData = async () => {
    try {
      const response = await fetch('https://alu-globe-gameroom.onrender.com/gamerooms', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch gamerooms: ${response.status}`);
      }

      const gameroomsData = await response.json();

      let gamerooms: GameRoom[] = [];
      if (gameroomsData.success && gameroomsData.data) {
        gamerooms = gameroomsData.data;
      } else if (Array.isArray(gameroomsData)) {
        gamerooms = gameroomsData;
      }

      return gamerooms;
    } catch (error) {
      console.error('Error fetching gamerooms:', error);
      return [];
    }
  };

  // Function to process gamerooms data into game stats
  const processGameStats = (gamerooms: GameRoom[], targetUserId: string, targetUsername: string): GameStat[] => {
    const gameStatsMap = new Map<string, {
      count: number;
      wins: number;
      totalScore: number;
      lastPlayed: string;
    }>();

    gamerooms.forEach(room => {
      const gameType = room.gameType.toLowerCase();
      const userPlayer = room.players.find(p => p.id === targetUserId || p.username === targetUsername);
      
      if (!userPlayer) return;

      const currentStat = gameStatsMap.get(gameType) || {
        count: 0,
        wins: 0,
        totalScore: 0,
        lastPlayed: ''
      };

      currentStat.count += 1;
      currentStat.totalScore += userPlayer.score || 0;
      
      // Check if user won this game
      if (room.winner === targetUserId || room.winner === targetUsername || userPlayer.isWinner) {
        currentStat.wins += 1;
      } else if (room.status === 'completed' && userPlayer.position === 1) {
        currentStat.wins += 1;
      }

      // Update last played date
      const gameDate = room.endedAt || room.startedAt || room.createdAt;
      if (!currentStat.lastPlayed || new Date(gameDate) > new Date(currentStat.lastPlayed)) {
        currentStat.lastPlayed = gameDate;
      }

      gameStatsMap.set(gameType, currentStat);
    });

    // Convert map to array with win rates
    return Array.from(gameStatsMap.entries()).map(([gameType, stats]) => ({
      gameType,
      count: stats.count,
      wins: stats.wins,
      totalScore: stats.totalScore,
      winRate: stats.count > 0 ? Math.round((stats.wins / stats.count) * 100) : 0,
      lastPlayed: stats.lastPlayed
    })).sort((a, b) => b.count - a.count); // Sort by most played
  };

  // Function to process gamerooms data into recent games
  const processRecentGames = (gamerooms: GameRoom[], targetUserId: string, targetUsername: string): RecentGame[] => {
    return gamerooms
      .filter(room => room.status === 'completed' || room.endedAt) // Only completed games
      .sort((a, b) => {
        const dateA = new Date(b.endedAt || b.startedAt || b.createdAt);
        const dateB = new Date(a.endedAt || a.startedAt || a.createdAt);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10) // Get last 10 games
      .map(room => {
        const userPlayer = room.players.find(p => p.id === targetUserId || p.username === targetUsername);
        const isWinner = room.winner === targetUserId || room.winner === targetUsername || 
                        userPlayer?.isWinner || userPlayer?.position === 1;
        
        const startTime = room.startedAt ? new Date(room.startedAt) : new Date(room.createdAt);
        const endTime = room.endedAt ? new Date(room.endedAt) : new Date();
        const duration = Math.max(0, endTime.getTime() - startTime.getTime());
        
        return {
          id: room._id,
          name: room.roomName,
          type: room.gameType.toLowerCase(),
          date: new Date(room.endedAt || room.startedAt || room.createdAt).toLocaleDateString(),
          result: isWinner ? 'Won' : 'Lost',
          score: userPlayer?.score || 0,
          duration: duration,
          totalPlayers: room.players.length,
          startedAt: room.startedAt || room.createdAt,
          endedAt: room.endedAt || room.startedAt || room.createdAt
        };
      });
  };

  const fetchUserProfile = async (targetUsername?: string, showLoading = true) => {
    if (!authUser) return;
    
    const effectiveUsername = targetUsername || authUser.username;
    const isOwn = !targetUsername || targetUsername.toLowerCase() === authUser.username.toLowerCase();
    setIsOwnProfile(isOwn);
    
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      // Fetch leaderboard
      const leaderboardResponse = await fetch('https://alu-globe-gameroom.onrender.com/user/leaderboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!leaderboardResponse.ok) {
        throw new Error(`Failed to fetch leaderboard: ${leaderboardResponse.status}`);
      }
      
      const leaderboardData = await leaderboardResponse.json();
      
      let users = [];
      if (leaderboardData.success && leaderboardData.data) {
        users = leaderboardData.data;
      } else if (Array.isArray(leaderboardData)) {
        users = leaderboardData;
      }
      
      // Find target user in leaderboard by username (case-insensitive)
      const targetUser = users.find((user: any) => 
        user.username.toLowerCase() === effectiveUsername.toLowerCase()
      );
      
      if (!targetUser) {
        // User not found
        setError('User not found');
        setUserData(null);
        return;
      }
      
      // Convert ObjectId to string if needed
      const targetUserId = targetUser._id?.toString() || targetUser._id;
      
      // If own profile and ID mismatch, update auth
      if (isOwn && targetUserId !== authUser.id) {
        console.log('Updating user ID in auth context from', authUser.id, 'to', targetUserId);
        updateUser({ id: targetUserId });
      }
      
      // Fetch gamerooms data (all, since we filter client-side)
      const allGamerooms = await fetchGameroomsData();
      
      // Filter user's gamerooms
      const userGamerooms = allGamerooms.filter(room => 
        room.players.some(player => 
          player.id === targetUserId || player.username.toLowerCase() === effectiveUsername.toLowerCase()
        )
      );
      
      // Process data
      const gameStats = processGameStats(userGamerooms, targetUserId, effectiveUsername);
      const recentGames = processRecentGames(userGamerooms, targetUserId, effectiveUsername);
      
      // Fetch full profile
      let profileData = null;
      try {
        const profileResponse = await fetch(`https://alu-globe-gameroom.onrender.com/user/${targetUserId}/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (profileResponse.ok) {
          const result = await profileResponse.json();
          if (result.success && result.data) {
            profileData = result.data;
          }
        }
      } catch (profileError) {
        console.log('Profile fetch failed:', profileError);
      }
      
      // Calculate global rank
      const globalRank = users.findIndex((u: any) => {
        const userIdString = u._id?.toString() || u._id;
        return userIdString === targetUserId;
      }) + 1;
      
      // Set user data
      setUserData({
        _id: targetUserId,
        username: targetUser.username,
        avatar: profileData?.avatar || targetUser.avatar,
        createdAt: profileData?.createdAt || new Date().toISOString(),
        updatedAt: profileData?.updatedAt || new Date().toISOString(),
        totalScore: targetUser.score || 0,
        gamesPlayed: targetUser.gamesPlayed || gameStats.reduce((sum, stat) => sum + stat.count, 0),
        gamesWon: targetUser.gamesWon || gameStats.reduce((sum, stat) => sum + stat.wins, 0),
        gameStats,
        recentGames,
        favoriteGames: gameStats.slice(0, 3).map(stat => ({
          gameType: stat.gameType,
          count: stat.count,
          wins: stat.wins,
          winRate: stat.winRate,
          lastPlayed: stat.lastPlayed
        })),
        badges: profileData?.badges || [],
        globalRank: globalRank > 0 ? `#${globalRank}` : 'Unranked',
        winRate: targetUser.winRate || (targetUser.gamesPlayed > 0 ? Math.round((targetUser.gamesWon / targetUser.gamesPlayed) * 100) : 0)
      });
      
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      setError(error.message || 'Failed to fetch profile data');
      setUserData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile(paramUsername);
  }, [authUser, paramUsername]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProfile(paramUsername, false);
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
          {/* Game Specific Stats - NOW POPULATED WITH REAL DATA */}
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
          
          {/* Recent Games - NOW POPULATED WITH REAL DATA */}
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
                        {game.totalPlayers} players • {game.duration > 0 ? `${Math.round(game.duration / 60000)}m` : 'Quick game'}
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
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="p-6 overflow-y-auto h-screen pb-20">
        <SectionTitle title="Game Profile" subtitle="View gaming stats, achievements, and history" />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">
            <div className="text-center">
              <div className="text-lg mb-2">Error: {error || 'No profile data available'}</div>
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

  const openEditModal = () => {
    if (!isOwnProfile || !userData) return;
    
    // Try to parse style and seed from existing avatar URL
    let parsedStyle = 'avataaars';
    let parsedSeed = '';
    if (userData.avatar) {
      try {
        const url = new URL(userData.avatar);
        const pathParts = url.pathname.split('/');
        if (pathParts.length >= 3) {
          parsedStyle = pathParts[2] || parsedStyle;
        }
        const seedParam = url.searchParams.get('seed');
        if (seedParam) parsedSeed = seedParam;
      } catch {}
    }

    setEditForm({
      username: userData.username,
      email: authUser?.email || '',
      selectedAvatarStyle: parsedStyle,
      selectedAvatarSeed: parsedSeed
    });
    // Reset avatar seed when opening modal
    setAvatarSeed(0);
    setEditError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
  
    setEditLoading(true);
    setEditError(null);
  
    try {
      // Build a persistent avatar URL using the exact selected style and seed
      const effectiveSeed = editForm.selectedAvatarSeed || (editForm.username || '');
      const avatarUrl = `https://api.dicebear.com/7.x/${editForm.selectedAvatarStyle}/svg?seed=${encodeURIComponent(effectiveSeed)}`;

      const response = await fetch(`https://alu-globe-gameroom.onrender.com/user/${userData._id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editForm.username,
          email: editForm.email,
          avatar: avatarUrl
        })
      });
  
      const result = await response.json();
  
      if (result.success) {
        // Update local state with ALL the changes, including avatar
        setUserData(prev => prev ? { 
          ...prev, 
          username: editForm.username, 
          avatar: avatarUrl
        } : null);
        
        // Update auth context
        updateUser({ 
          username: editForm.username, 
          email: editForm.email,
          avatar: avatarUrl
        });
        
        closeEditModal();
        // Refresh profile to ensure consistency
        fetchUserProfile(paramUsername, false);
      } else {
        setEditError(result.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setEditError(error.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  
  // Edit Profile Modal Component - FIXED AVATAR VERSION
const EditProfileModal = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Edit Profile</h2>
        <button onClick={closeEditModal} className="text-gray-400 hover:text-white transition-colors">
          <XIcon size={24} />
        </button>
      </div>

      <form onSubmit={handleEditSubmit} className="space-y-6">
        {/* Avatar Selection Row */}
        <div>
          <label className="block text-sm font-medium mb-3">Avatar</label>
          <div className="flex items-start space-x-6">
            {/* Current Avatar */}
            <div className="text-center flex-shrink-0">
              <img
                src={userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData?.username || '')}`}
                alt="Current"
                className="w-20 h-20 rounded-full border-2 border-purple-500"
              />
              <p className="text-xs text-gray-400 mt-2">Current</p>
            </div>
            
            {/* Avatar Options */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-400 mb-3">Choose Avatar Style</div>
              
              {/* 16 Avatar Options in 4x4 Grid */}
              <div className="grid grid-cols-4 gap-3">
                {avatarOptions.map((style) => {
                  // Use the current username or seed for consistent avatars
                  const seedToUse = editForm.selectedAvatarSeed || editForm.username || userData?.username || 'default';
                  
                  return (
                    <div key={style} className="text-center">
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, selectedAvatarStyle: style }))}
                        className={`w-16 h-16 rounded-full border-2 transition-all relative overflow-hidden ${
                          editForm.selectedAvatarStyle === style
                            ? 'border-purple-500 ring-2 ring-purple-300'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedToUse)}`}
                          alt={`Style ${style}`}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                        />
                        {editForm.selectedAvatarStyle === style && (
                          <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1">
                            <CheckIcon size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                      <p className="text-xs text-gray-400 mt-1 capitalize truncate">{style.replace('-', ' ')}</p>
                    </div>
                  );
                })}
              </div>
              
              {/* Preview of selected avatar */}
              <div className="mt-4 text-center">
                <div className="text-xs text-gray-500 mb-2">Preview:</div>
                <img
                  src={`https://api.dicebear.com/7.x/${editForm.selectedAvatarStyle}/svg?seed=${encodeURIComponent(editForm.selectedAvatarSeed || editForm.username || userData?.username || 'default')}`}
                  alt="Preview"
                  className="w-12 h-12 rounded-full border border-gray-600 mx-auto"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Username Field */}
        <div>
          <label htmlFor="edit-username" className="block text-sm font-medium mb-2">
            Username
          </label>
          <input
            id="edit-username"
            type="text"
            value={editForm.username}
            onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
            required
            minLength={2}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]+"
            title="Username can only contain letters, numbers, underscore, and dash"
          />
          <p className="text-xs text-gray-500 mt-1">2-30 characters, letters, numbers, underscore, dash only</p>
        </div>

        {/* Avatar Seed Field */}
        <div>
          <label htmlFor="edit-avatar-seed" className="block text-sm font-medium mb-2">
            Avatar Seed (Optional)
          </label>
          <input
            id="edit-avatar-seed"
            type="text"
            placeholder="Leave blank to use username"
            value={editForm.selectedAvatarSeed}
            onChange={(e) => setEditForm(prev => ({ ...prev, selectedAvatarSeed: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            Custom seed for avatar generation. Leave blank to use your username as the seed.
          </p>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="edit-email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            id="edit-email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Used for account recovery and notifications</p>
        </div>

        {/* Error Message */}
        {editError && (
          <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
            <strong>Error:</strong> {editError}
          </div>
        )}

        {/* Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={closeEditModal}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={editLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={editLoading || !editForm.username.trim() || !editForm.email.trim()}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {editLoading ? (
              <span className="flex items-center justify-center">
                <RefreshCwIcon size={16} className="animate-spin mr-2" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);

  return (
    <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="Game Profile" subtitle="View gaming stats, achievements, and history" />
      
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="flex flex-col md:flex-row items-center">
            <div className="relative">
              <img 
                src={userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.username)}`}
                alt={formattedName} 
                className="w-24 h-24 rounded-full border-4 border-purple-500" 
              />
              {isOwnProfile && (
                <div 
                  onClick={openEditModal}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-900 cursor-pointer hover:bg-purple-700 transition-colors"
                >
                  <EditIcon size={16} />
                </div>
              )}
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
            <button 
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center"
            >
              <LogOutIcon size={16} className="mr-2" />
              Logout
            </button>
            {isOwnProfile && (
              <button 
                onClick={openEditModal}
                className="px-4 py-2 bg-white text-purple-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Edit Profile
              </button>
            )}
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
        {isOwnProfile && (
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
        )}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'badges' && renderBadges()}
      {activeTab === 'settings' && isOwnProfile && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
          <p className="text-gray-400">Profile settings would appear here.</p>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && <EditProfileModal />}
    </div>
  );
};


// import React, { useState, useEffect } from 'react';
// import { SectionTitle } from '../components/UI/SectionTitle';
// import { TrophyIcon, BarChart3Icon, ClockIcon, StarIcon, EditIcon, RefreshCwIcon, TrendingUpIcon, CalendarIcon, LogOutIcon, XIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
// import { useAuth } from '../context/AuthContext';

// interface GameStat {
//   gameType: string;
//   count: number;
//   wins: number;
//   totalScore: number;
//   winRate: number;
//   lastPlayed: string;
// }

// interface RecentGame {
//   id: string;
//   name: string;
//   type: string;
//   date: string;
//   result: string;
//   score: number;
//   duration: number;
//   totalPlayers: number;
//   startedAt: string;
//   endedAt: string;
// }

// interface FavoriteGame {
//   gameType: string;
//   count: number;
//   wins: number;
//   winRate: number;
//   lastPlayed: string;
// }

// interface Badge {
//   id: number;
//   name: string;
//   icon: string;
//   description: string;
//   date: string;
//   category: string;
// }

// interface UserProfileData {
//   _id: string;
//   username: string;
//   createdAt: string;
//   updatedAt: string;
//   totalScore: number;
//   gamesPlayed: number;
//   gamesWon: number;
//   gameStats: GameStat[];
//   recentGames: RecentGame[];
//   favoriteGames: FavoriteGame[];
//   badges: Badge[];
//   globalRank: string;
//   winRate: number;
//   avatar?: string;
// }

// // Interface for gamerooms data structure
// interface GameRoom {
//   _id: string;
//   roomName: string;
//   gameType: string;
//   creator: string;
//   players: Array<{
//     id: string;
//     username: string;
//     score?: number;
//     position?: number;
//     isWinner?: boolean;
//   }>;
//   status: string;
//   createdAt: string;
//   startedAt?: string;
//   endedAt?: string;
//   maxPlayers: number;
//   currentPlayers: number;
//   scores?: { [playerId: string]: number };
//   winner?: string;
// }

// export const ProfilePage = () => {
//   const [activeTab, setActiveTab] = useState('stats');
//   const { user: authUser, updateUser, logout } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [userData, setUserData] = useState<UserProfileData | null>(null);
//   const [error, setError] = useState<string | null>(null);
  
//   // Edit Profile Modal State
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [editForm, setEditForm] = useState({
//     username: '',
//     email: '',
//     selectedAvatarStyle: 'avataaars',
//     selectedAvatarSeed: ''
//   });
//   const [editLoading, setEditLoading] = useState(false);
//   const [editError, setEditError] = useState<string | null>(null);
//   // New state for stable avatar browsing
//   const [avatarSeed, setAvatarSeed] = useState(0);

//   // Avatar options for selection
//   const avatarOptions = ['adventurer', 'adventurer-neutral', 'avataaars', 'avataaars-neutral', 'big-ears', 'big-ears-neutral', 'big-smile', 'bottts', 'bottts-neutral', 'croodles', 'croodles-neutral', 'fun-emoji', 'icons', 'identicon', 'initials', 'lorelei'];

//   // Function to fetch gamerooms data
//   const fetchGameroomsData = async (userId: string) => {
//     try {
//       console.log('Fetching gamerooms data for user:', userId);
      
//       const response = await fetch('https://alu-globe-gameroom.onrender.com/gamerooms', {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         }
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to fetch gamerooms: ${response.status}`);
//       }

//       const gameroomsData = await response.json();
//       console.log('Gamerooms response:', gameroomsData);

//       let gamerooms: GameRoom[] = [];
//       if (gameroomsData.success && gameroomsData.data) {
//         gamerooms = gameroomsData.data;
//       } else if (Array.isArray(gameroomsData)) {
//         gamerooms = gameroomsData;
//       }

//       // Filter gamerooms where the user participated
//       const userGamerooms = gamerooms.filter(room => 
//         room.players.some(player => 
//           player.id === userId || player.username === authUser?.username
//         )
//       );

//       console.log('User gamerooms:', userGamerooms);
//       return userGamerooms;
//     } catch (error) {
//       console.error('Error fetching gamerooms:', error);
//       return [];
//     }
//   };

//   // Function to process gamerooms data into game stats
//   const processGameStats = (gamerooms: GameRoom[], userId: string): GameStat[] => {
//     const gameStatsMap = new Map<string, {
//       count: number;
//       wins: number;
//       totalScore: number;
//       lastPlayed: string;
//     }>();

//     gamerooms.forEach(room => {
//       const gameType = room.gameType.toLowerCase();
//       const userPlayer = room.players.find(p => p.id === userId || p.username === authUser?.username);
      
//       if (!userPlayer) return;

//       const currentStat = gameStatsMap.get(gameType) || {
//         count: 0,
//         wins: 0,
//         totalScore: 0,
//         lastPlayed: ''
//       };

//       currentStat.count += 1;
//       currentStat.totalScore += userPlayer.score || 0;
      
//       // Check if user won this game
//       if (room.winner === userId || room.winner === authUser?.username || userPlayer.isWinner) {
//         currentStat.wins += 1;
//       } else if (room.status === 'completed' && userPlayer.position === 1) {
//         currentStat.wins += 1;
//       }

//       // Update last played date
//       const gameDate = room.endedAt || room.startedAt || room.createdAt;
//       if (!currentStat.lastPlayed || new Date(gameDate) > new Date(currentStat.lastPlayed)) {
//         currentStat.lastPlayed = gameDate;
//       }

//       gameStatsMap.set(gameType, currentStat);
//     });

//     // Convert map to array with win rates
//     return Array.from(gameStatsMap.entries()).map(([gameType, stats]) => ({
//       gameType,
//       count: stats.count,
//       wins: stats.wins,
//       totalScore: stats.totalScore,
//       winRate: stats.count > 0 ? Math.round((stats.wins / stats.count) * 100) : 0,
//       lastPlayed: stats.lastPlayed
//     })).sort((a, b) => b.count - a.count); // Sort by most played
//   };

//   // Function to process gamerooms data into recent games
//   const processRecentGames = (gamerooms: GameRoom[], userId: string): RecentGame[] => {
//     return gamerooms
//       .filter(room => room.status === 'completed' || room.endedAt) // Only completed games
//       .sort((a, b) => {
//         const dateA = new Date(b.endedAt || b.startedAt || b.createdAt);
//         const dateB = new Date(a.endedAt || a.startedAt || a.createdAt);
//         return dateA.getTime() - dateB.getTime();
//       })
//       .slice(0, 10) // Get last 10 games
//       .map(room => {
//         const userPlayer = room.players.find(p => p.id === userId || p.username === authUser?.username);
//         const isWinner = room.winner === userId || room.winner === authUser?.username || 
//                         userPlayer?.isWinner || userPlayer?.position === 1;
        
//         const startTime = room.startedAt ? new Date(room.startedAt) : new Date(room.createdAt);
//         const endTime = room.endedAt ? new Date(room.endedAt) : new Date();
//         const duration = Math.max(0, endTime.getTime() - startTime.getTime());
        
//         return {
//           id: room._id,
//           name: room.roomName,
//           type: room.gameType.toLowerCase(),
//           date: new Date(room.endedAt || room.startedAt || room.createdAt).toLocaleDateString(),
//           result: isWinner ? 'Won' : 'Lost',
//           score: userPlayer?.score || 0,
//           duration: duration,
//           totalPlayers: room.players.length,
//           startedAt: room.startedAt || room.createdAt,
//           endedAt: room.endedAt || room.startedAt || room.createdAt
//         };
//       });
//   };

//   const fetchUserProfile = async (showLoading = true) => {
//     if (!authUser) return;
    
//     if (showLoading) setLoading(true);
//     setError(null);
    
//     try {
//       console.log('Fetching profile for user ID:', authUser.id);
//       console.log('User object:', authUser);
      
//       // First, always fetch the leaderboard to get the correct user ID
//       console.log('Fetching leaderboard to find correct user...');
//       const leaderboardResponse = await fetch('https://alu-globe-gameroom.onrender.com/user/leaderboard', {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         }
//       });
      
//       if (!leaderboardResponse.ok) {
//         throw new Error(`Failed to fetch leaderboard: ${leaderboardResponse.status}`);
//       }
      
//       const leaderboardData = await leaderboardResponse.json();
//       console.log('Leaderboard response:', leaderboardData);
      
//       let users = [];
//       if (leaderboardData.success && leaderboardData.data) {
//         users = leaderboardData.data;
//       } else if (Array.isArray(leaderboardData)) {
//         users = leaderboardData;
//       }
      
//       // Find current user in leaderboard by username first, then by ID
//       const currentUser = users.find((user: any) => {
//         const userIdString = user._id?.toString() || user._id;
//         return user.username === authUser.username || userIdString === authUser.id;
//       });
      
//       console.log('Found user in leaderboard:', currentUser);
      
//       if (!currentUser) {
//         // User not found in leaderboard, create a minimal profile
//         console.log('User not found in leaderboard, creating minimal profile');
//         setUserData({
//           _id: String(authUser.id),
//           username: authUser.username,
//           avatar: authUser.avatar, // Include avatar from auth context
//           createdAt: new Date().toISOString(),
//           updatedAt: new Date().toISOString(),
//           totalScore: 0,
//           gamesPlayed: 0,
//           gamesWon: 0,
//           gameStats: [],
//           recentGames: [],
//           favoriteGames: [],
//           badges: [],
//           globalRank: 'Unranked',
//           winRate: 0
//         });
//         return;
//       }
      
//       // Convert ObjectId to string if needed
//       const correctUserId = currentUser._id?.toString() || currentUser._id;
      
//       // Update auth context with correct ID if different
//       if (correctUserId !== authUser.id) {
//         console.log('Updating user ID in auth context from', authUser.id, 'to', correctUserId);
//         updateUser({ id: correctUserId });
//       }
      
//       // Fetch gamerooms data for this user
//       const userGamerooms = await fetchGameroomsData(correctUserId);
      
//       // Process gamerooms data into stats and recent games
//       const gameStats = processGameStats(userGamerooms, correctUserId);
//       const recentGames = processRecentGames(userGamerooms, correctUserId);
      
//       console.log('Processed game stats:', gameStats);
//       console.log('Processed recent games:', recentGames);
      
//       // Try to fetch full profile with correct ID
//       let profileResponse;
//       let profileData = null;
      
//       try {
//         profileResponse = await fetch(`https://alu-globe-gameroom.onrender.com/user/${correctUserId}/profile`, {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json',
//             'Accept': 'application/json'
//           }
//         });
        
//         console.log('Profile response status:', profileResponse.status);
        
//         if (profileResponse.ok) {
//           const result = await profileResponse.json();
//           console.log('Profile response:', result);
          
//           if (result.success && result.data) {
//             profileData = result.data;
//           }
//         }
//       } catch (profileError) {
//         console.log('Profile fetch failed:', profileError);
//       }
      
//       // Calculate global rank
//       const globalRank = users.findIndex((u: any) => {
//         const userIdString = u._id?.toString() || u._id;
//         return userIdString === correctUserId;
//       }) + 1;
      
//       // Create comprehensive profile data
//       setUserData({
//         _id: correctUserId,
//         username: currentUser.username,
//         avatar: profileData?.avatar || currentUser.avatar, // Use avatar from profile data or leaderboard data
//         createdAt: profileData?.createdAt || new Date().toISOString(),
//         updatedAt: profileData?.updatedAt || new Date().toISOString(),
//         totalScore: currentUser.score || 0,
//         gamesPlayed: currentUser.gamesPlayed || gameStats.reduce((sum, stat) => sum + stat.count, 0),
//         gamesWon: currentUser.gamesWon || gameStats.reduce((sum, stat) => sum + stat.wins, 0),
//         gameStats: gameStats, // Real data from gamerooms
//         recentGames: recentGames, // Real data from gamerooms
//         favoriteGames: gameStats.slice(0, 3).map(stat => ({
//           gameType: stat.gameType,
//           count: stat.count,
//           wins: stat.wins,
//           winRate: stat.winRate,
//           lastPlayed: stat.lastPlayed
//         })),
//         badges: profileData?.badges || [],
//         globalRank: globalRank > 0 ? `#${globalRank}` : 'Unranked',
//         winRate: currentUser.winRate || (currentUser.gamesPlayed > 0 ? Math.round((currentUser.gamesWon / currentUser.gamesPlayed) * 100) : 0)
//       });
      
//     } catch (error: any) {
//       console.error('Failed to fetch user profile:', error);
//       setError(error.message || 'Failed to fetch profile data');
      
//       // Set fallback data
//       setUserData({
//         _id: String(authUser.id),
//         username: authUser.username,
//         avatar: authUser.avatar, // Include avatar from auth context
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//         totalScore: 0,
//         gamesPlayed: 0,
//         gamesWon: 0,
//         gameStats: [],
//         recentGames: [],
//         favoriteGames: [],
//         badges: [],
//         globalRank: 'Unranked',
//         winRate: 0
//       });
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchUserProfile();
//   }, [authUser]);

//   const handleRefresh = () => {
//     setRefreshing(true);
//     fetchUserProfile(false);
//   };

//   const renderStats = () => {
//     if (loading) return <div className="text-center py-8">Loading stats...</div>;
//     if (!userData) return <div className="text-center py-8 text-red-400">No data available</div>;
    
//     return (
//       <div>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center mr-4">
//               <BarChart3Icon size={24} className="text-purple-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Total Score</div>
//               <div className="text-2xl font-bold">{userData.totalScore}</div>
//             </div>
//           </div>
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center mr-4">
//               <TrophyIcon size={24} className="text-blue-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Games Won</div>
//               <div className="text-2xl font-bold">
//                 {userData.gamesWon}/{userData.gamesPlayed}
//               </div>
//             </div>
//           </div>
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center mr-4">
//               <StarIcon size={24} className="text-green-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Win Rate</div>
//               <div className="text-2xl font-bold">{userData.winRate}%</div>
//             </div>
//           </div>
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mr-4">
//               <TrendingUpIcon size={24} className="text-red-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Global Rank</div>
//               <div className="text-2xl font-bold">{userData.globalRank}</div>
//             </div>
//           </div>
//         </div>
        
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Game Specific Stats - NOW POPULATED WITH REAL DATA */}
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
//             <h3 className="text-lg font-medium mb-4">Game Performance</h3>
//             {userData.gameStats.length > 0 ? (
//               <div className="space-y-4">
//                 {userData.gameStats.map((stat) => (
//                   <div key={stat.gameType} className="flex items-center">
//                     <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
//                       {stat.gameType === 'trivia' ? '🎯' : 
//                        stat.gameType === 'chess' ? '♟️' : 
//                        stat.gameType === 'uno' ? '🃏' : 
//                        stat.gameType === 'kahoot' ? '❓' : 
//                        stat.gameType === 'pictionary' ? '🎨' : 
//                        stat.gameType === 'ludo' ? '🎲' : '🎮'}
//                     </div>
//                     <div className="flex-1">
//                       <div className="flex justify-between">
//                         <span className="font-medium capitalize">{stat.gameType}</span>
//                         <span className="text-sm text-gray-400">
//                           {stat.count} games
//                         </span>
//                       </div>
//                       <div className="mt-1 flex items-center">
//                         <div className="flex-1">
//                           <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
//                             <div 
//                               className="h-full bg-purple-600 rounded-full" 
//                               style={{ width: `${stat.winRate}%` }}
//                             ></div>
//                           </div>
//                         </div>
//                         <span className="ml-2 text-sm">
//                           {stat.winRate}% win rate
//                         </span>
//                       </div>
//                       <div className="mt-1 text-xs text-gray-500">
//                         Last played: {stat.lastPlayed ? new Date(stat.lastPlayed).toLocaleDateString() : 'Never'}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-400">No game statistics available yet. Start playing to see your stats!</p>
//             )}
//           </div>
          
//           {/* Recent Games - NOW POPULATED WITH REAL DATA */}
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
//             <h3 className="text-lg font-medium mb-4">Recent Games</h3>
//             {userData.recentGames.length > 0 ? (
//               <div className="space-y-3">
//                 {userData.recentGames.map((game) => (
//                   <div key={game.id} className="flex items-center p-2 hover:bg-gray-700/30 rounded-lg transition-colors">
//                     <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
//                       {game.type === 'trivia' ? '🎯' : 
//                        game.type === 'chess' ? '♟️' : 
//                        game.type === 'uno' ? '🃏' : 
//                        game.type === 'kahoot' ? '❓' : 
//                        game.type === 'pictionary' ? '🎨' : 
//                        game.type === 'ludo' ? '🎲' : '🎮'}
//                     </div>
//                     <div className="flex-1">
//                       <div className="flex justify-between">
//                         <span className="font-medium">{game.name}</span>
//                         <span className="text-sm text-gray-400">{game.date}</span>
//                       </div>
//                       <div className="flex justify-between mt-1">
//                         <span className="text-sm text-gray-400 capitalize">{game.type}</span>
//                         <span className={`text-sm ${
//                           game.result === 'Won' ? 'text-green-400' : 'text-red-400'
//                         }`}>
//                           {game.result} {game.score > 0 && `(${game.score} pts)`}
//                         </span>
//                       </div>
//                       <div className="text-xs text-gray-500 mt-1">
//                         {game.totalPlayers} players • {game.duration > 0 ? `${Math.round(game.duration / 60000)}m` : 'Quick game'}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-400">No recent games played. Join a game to get started!</p>
//             )}
//           </div>
//         </div>
        
//         {/* Favorite Games */}
//         {userData.favoriteGames.length > 0 && (
//           <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
//             <h3 className="text-lg font-medium mb-4">Favorite Games</h3>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//               {userData.favoriteGames.map((game) => (
//                 <div key={game.gameType} className="bg-gray-700/30 rounded-lg p-4">
//                   <div className="flex items-center mb-2">
//                     <div className="w-8 h-8 rounded-lg bg-gray-600/50 flex items-center justify-center text-lg mr-2">
//                       {game.gameType === 'trivia' ? '🎯' : 
//                        game.gameType === 'chess' ? '♟️' : 
//                        game.gameType === 'uno' ? '🃏' : 
//                        game.gameType === 'kahoot' ? '❓' : 
//                        game.gameType === 'pictionary' ? '🎨' : 
//                        game.gameType === 'ludo' ? '🎲' : '🎮'}
//                     </div>
//                     <span className="font-medium capitalize">{game.gameType}</span>
//                   </div>
//                   <div className="text-sm text-gray-400">
//                     <div>Games: {game.count}</div>
//                     <div>Wins: {game.wins}</div>
//                     <div>Win Rate: {game.winRate}%</div>
//                     <div className="text-xs mt-1">
//                       Last: {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderBadges = () => {
//     if (loading) return <div className="text-center py-8">Loading badges...</div>;
//     if (!userData) return <div className="text-center py-8 text-red-400">No data available</div>;
    
//     return (
//       <div>
//         <div className="mb-6">
//           <h3 className="text-lg font-medium mb-2">Achievement Summary</h3>
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div className="bg-gray-800/50 rounded-lg p-4 text-center">
//               <div className="text-2xl font-bold text-purple-400">{userData.badges.length}</div>
//               <div className="text-sm text-gray-400">Total Badges</div>
//             </div>
//             <div className="bg-gray-800/50 rounded-lg p-4 text-center">
//               <div className="text-2xl font-bold text-green-400">{userData.gamesWon}</div>
//               <div className="text-sm text-gray-400">Games Won</div>
//             </div>
//             <div className="bg-gray-800/50 rounded-lg p-4 text-center">
//               <div className="text-2xl font-bold text-blue-400">{userData.winRate}%</div>
//               <div className="text-sm text-gray-400">Win Rate</div>
//             </div>
//           </div>
//         </div>
        
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//           {userData.badges.length > 0 ? (
//             userData.badges.map((badge) => (
//               <div key={badge.id} className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-start ${
//                 badge.category === 'achievement' ? 'border-yellow-500/50' :
//                 badge.category === 'milestone' ? 'border-blue-500/50' :
//                 badge.category === 'specialist' ? 'border-purple-500/50' : ''
//               }`}>
//                 <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-3xl mr-4 ${
//                   badge.category === 'achievement' ? 'bg-gradient-to-br from-yellow-600/30 to-orange-600/30' :
//                   badge.category === 'milestone' ? 'bg-gradient-to-br from-blue-600/30 to-cyan-600/30' :
//                   badge.category === 'specialist' ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30' :
//                   'bg-gradient-to-br from-gray-600/30 to-gray-700/30'
//                 }`}>
//                   {badge.icon}
//                 </div>
//                 <div>
//                   <h3 className="font-bold">{badge.name}</h3>
//                   <p className="text-sm text-gray-400 mb-1">{badge.description}</p>
//                   <p className="text-xs text-gray-500">Earned on {badge.date}</p>
//                   <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
//                     badge.category === 'achievement' ? 'bg-yellow-500/20 text-yellow-300' :
//                     badge.category === 'milestone' ? 'bg-blue-500/20 text-blue-300' :
//                     badge.category === 'specialist' ? 'bg-purple-500/20 text-purple-300' :
//                     'bg-gray-500/20 text-gray-300'
//                   }`}>
//                     {badge.category}
//                   </span>
//                 </div>
//               </div>
//             ))
//           ) : (
//             <div className="col-span-full text-center py-8 text-gray-400">
//               <div className="text-4xl mb-4">🏆</div>
//               <p className="text-lg mb-2">No badges earned yet</p>
//               <p className="text-sm">Keep playing games to unlock achievements and earn badges!</p>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   };

//   if (loading) {
//     return (
//       <div className="p-6 overflow-y-auto h-screen pb-20">
//         <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
//         <div className="flex items-center justify-center h-64">
//           <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
//         </div>
//       </div>
//     );
//   }

//   if (error && !userData) {
//     return (
//       <div className="p-6 overflow-y-auto h-screen pb-20">
//         <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
//         <div className="flex items-center justify-center h-64">
//           <div className="text-red-400">
//             <div className="text-center">
//               <div className="text-lg mb-2">Error: {error}</div>
//               <button 
//                 onClick={handleRefresh}
//                 className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
//               >
//                 Try Again
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!userData) {
//     return (
//       <div className="p-6 overflow-y-auto h-screen pb-20">
//         <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
//         <div className="flex items-center justify-center h-64">
//           <div className="text-gray-400">No profile data available</div>
//         </div>
//       </div>
//     );
//   }

//   // Format username to look like a name
//   const formattedName = userData.username 
//     ? userData.username
//         .split('')
//         .map((char, i) => i === 0 ? char.toUpperCase() : char)
//         .join('')
//     : 'Loading...';

//   const joinDate = userData.createdAt 
//     ? new Date(userData.createdAt).toLocaleDateString('en-US', {
//         month: 'long',
//         year: 'numeric'
//       })
//     : 'Unknown';

//   const openEditModal = () => {
//     if (userData) {
//       // Try to parse style and seed from existing avatar URL
//       let parsedStyle = 'avataaars';
//       let parsedSeed = '';
//       if (userData.avatar) {
//         try {
//           const url = new URL(userData.avatar);
//           const pathParts = url.pathname.split('/');
//           // e.g. /7.x/{style}/svg
//           if (pathParts.length >= 3) {
//             parsedStyle = pathParts[2] || parsedStyle;
//           }
//           const seedParam = url.searchParams.get('seed');
//           if (seedParam) parsedSeed = seedParam;
//         } catch {}
//       }

//       setEditForm({
//         username: userData.username,
//         email: authUser?.email || '',
//         selectedAvatarStyle: parsedStyle,
//         selectedAvatarSeed: parsedSeed
//       });
//       // Reset avatar seed when opening modal
//       setAvatarSeed(0);
//     }
//     setEditError(null);
//     setShowEditModal(true);
//   };

//   const closeEditModal = () => {
//     setShowEditModal(false);
//     setEditError(null);
//   };

//   const handleEditSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!userData) return;
  
//     setEditLoading(true);
//     setEditError(null);
  
//     try {
//       console.log('Submitting edit form:', {
//         username: editForm.username,
//         email: editForm.email,
//         style: editForm.selectedAvatarStyle,
//         seed: editForm.selectedAvatarSeed
//       });
  
//       // Build a persistent avatar URL using the exact selected style and seed
//       const effectiveSeed = editForm.selectedAvatarSeed || (editForm.username || '');
//       const avatarUrl = `https://api.dicebear.com/7.x/${editForm.selectedAvatarStyle}/svg?seed=${encodeURIComponent(effectiveSeed)}`;

//       const response = await fetch(`https://alu-globe-gameroom.onrender.com/user/${userData._id}/profile`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           username: editForm.username,
//           email: editForm.email,
//           avatar: avatarUrl
//         })
//       });
  
//       const result = await response.json();
//       console.log('Update profile response:', result);
  
//       if (result.success) {
//         // Update local state with ALL the changes, including avatar
//         setUserData(prev => prev ? { 
//           ...prev, 
//           username: editForm.username, 
//           avatar: avatarUrl
//         } : null);
        
//         // Update auth context
//         updateUser({ 
//           username: editForm.username, 
//           email: editForm.email,
//           avatar: avatarUrl
//         });
        
//         closeEditModal();
//         // Refresh profile to ensure consistency
//         fetchUserProfile(false);
//       } else {
//         setEditError(result.error || 'Failed to update profile');
//       }
//     } catch (error: any) {
//       console.error('Error updating profile:', error);
//       setEditError(error.message || 'Failed to update profile');
//     } finally {
//       setEditLoading(false);
//     }
//   };

  
//   // Edit Profile Modal Component - FIXED AVATAR VERSION
// const EditProfileModal = () => (
//   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//     <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-xl font-bold">Edit Profile</h2>
//         <button onClick={closeEditModal} className="text-gray-400 hover:text-white transition-colors">
//           <XIcon size={24} />
//         </button>
//       </div>

//       <form onSubmit={handleEditSubmit} className="space-y-6">
//         {/* Avatar Selection Row */}
//         <div>
//           <label className="block text-sm font-medium mb-3">Avatar</label>
//           <div className="flex items-start space-x-6">
//             {/* Current Avatar */}
//             <div className="text-center flex-shrink-0">
//               <img
//                 src={userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData?.username || '')}`}
//                 alt="Current"
//                 className="w-20 h-20 rounded-full border-2 border-purple-500"
//               />
//               <p className="text-xs text-gray-400 mt-2">Current</p>
//             </div>
            
//             {/* Avatar Options */}
//             <div className="flex-1 min-w-0">
//               <div className="text-sm text-gray-400 mb-3">Choose Avatar Style</div>
              
//               {/* 16 Avatar Options in 4x4 Grid */}
//               <div className="grid grid-cols-4 gap-3">
//                 {avatarOptions.map((style) => {
//                   // Use the current username or seed for consistent avatars
//                   const seedToUse = editForm.selectedAvatarSeed || editForm.username || userData?.username || 'default';
                  
//                   return (
//                     <div key={style} className="text-center">
//                       <button
//                         type="button"
//                         onClick={() => setEditForm(prev => ({ ...prev, selectedAvatarStyle: style }))}
//                         className={`w-16 h-16 rounded-full border-2 transition-all relative overflow-hidden ${
//                           editForm.selectedAvatarStyle === style
//                             ? 'border-purple-500 ring-2 ring-purple-300'
//                             : 'border-gray-600 hover:border-gray-500'
//                         }`}
//                       >
//                         <img
//                           src={`https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seedToUse)}`}
//                           alt={`Style ${style}`}
//                           className="w-full h-full rounded-full object-cover"
//                           loading="lazy"
//                         />
//                         {editForm.selectedAvatarStyle === style && (
//                           <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1">
//                             <CheckIcon size={12} className="text-white" />
//                           </div>
//                         )}
//                       </button>
//                       <p className="text-xs text-gray-400 mt-1 capitalize truncate">{style.replace('-', ' ')}</p>
//                     </div>
//                   );
//                 })}
//               </div>
              
//               {/* Preview of selected avatar */}
//               <div className="mt-4 text-center">
//                 <div className="text-xs text-gray-500 mb-2">Preview:</div>
//                 <img
//                   src={`https://api.dicebear.com/7.x/${editForm.selectedAvatarStyle}/svg?seed=${encodeURIComponent(editForm.selectedAvatarSeed || editForm.username || userData?.username || 'default')}`}
//                   alt="Preview"
//                   className="w-12 h-12 rounded-full border border-gray-600 mx-auto"
//                   loading="lazy"
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Username Field */}
//         <div>
//           <label htmlFor="edit-username" className="block text-sm font-medium mb-2">
//             Username
//           </label>
//           <input
//             id="edit-username"
//             type="text"
//             value={editForm.username}
//             onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
//             className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
//             required
//             minLength={2}
//             maxLength={30}
//             pattern="[a-zA-Z0-9_-]+"
//             title="Username can only contain letters, numbers, underscore, and dash"
//           />
//           <p className="text-xs text-gray-500 mt-1">2-30 characters, letters, numbers, underscore, dash only</p>
//         </div>

//         {/* Avatar Seed Field */}
//         <div>
//           <label htmlFor="edit-avatar-seed" className="block text-sm font-medium mb-2">
//             Avatar Seed (Optional)
//           </label>
//           <input
//             id="edit-avatar-seed"
//             type="text"
//             placeholder="Leave blank to use username"
//             value={editForm.selectedAvatarSeed}
//             onChange={(e) => setEditForm(prev => ({ ...prev, selectedAvatarSeed: e.target.value }))}
//             className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
//             maxLength={50}
//           />
//           <p className="text-xs text-gray-500 mt-1">
//             Custom seed for avatar generation. Leave blank to use your username as the seed.
//           </p>
//         </div>

//         {/* Email Field */}
//         <div>
//           <label htmlFor="edit-email" className="block text-sm font-medium mb-2">
//             Email
//           </label>
//           <input
//             id="edit-email"
//             type="email"
//             value={editForm.email}
//             onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
//             className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
//             required
//           />
//           <p className="text-xs text-gray-500 mt-1">Used for account recovery and notifications</p>
//         </div>

//         {/* Error Message */}
//         {editError && (
//           <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
//             <strong>Error:</strong> {editError}
//           </div>
//         )}

//         {/* Buttons */}
//         <div className="flex space-x-3 pt-4">
//           <button
//             type="button"
//             onClick={closeEditModal}
//             className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//             disabled={editLoading}
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             disabled={editLoading || !editForm.username.trim() || !editForm.email.trim()}
//             className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
//           >
//             {editLoading ? (
//               <span className="flex items-center justify-center">
//                 <RefreshCwIcon size={16} className="animate-spin mr-2" />
//                 Saving...
//               </span>
//             ) : (
//               'Save Changes'
//             )}
//           </button>
//         </div>
//       </form>
//     </div>
//   </div>
// );

//   return (
//     <div className="p-6 overflow-y-auto h-screen pb-20">
//       <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
      
//       {/* Profile Header */}
//       <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 mb-8 relative overflow-hidden">
//         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
//         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
//           <div className="flex flex-col md:flex-row items-center">
//             <div className="relative">
//               <img 
//                 src={userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.username)}`}
//                 alt={formattedName} 
//                 className="w-24 h-24 rounded-full border-4 border-purple-500" 
//               />
//               <div 
//                 onClick={openEditModal}
//                 className="absolute -bottom-2 -right-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-900 cursor-pointer hover:bg-purple-700 transition-colors"
//               >
//                 <EditIcon size={16} />
//               </div>
//             </div>
//             <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
//               <h2 className="text-2xl font-bold">{formattedName}</h2>
//               <p className="text-gray-300">
//                 Member since {joinDate}
//               </p>
//               <div className="flex items-center mt-2 justify-center md:justify-start">
//                 <div className="bg-purple-600/30 border border-purple-500 px-3 py-1 rounded-full text-sm">
//                   Level {Math.floor(userData.gamesPlayed / 10) + 1}
//                 </div>
//                 <div className="mx-2 h-1 w-1 rounded-full bg-gray-500"></div>
//                 <div className="text-sm text-gray-300">
//                   Global Rank: {userData.globalRank}
//                 </div>
//               </div>
//             </div>
//           </div>
          
//           <div className="flex items-center space-x-3 mt-4 md:mt-0">
//             <button 
//               onClick={handleRefresh}
//               disabled={refreshing}
//               className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
//                 refreshing 
//                   ? 'bg-gray-600 cursor-not-allowed' 
//                   : 'bg-purple-600 hover:bg-purple-700'
//               } text-white`}
//             >
//               <RefreshCwIcon size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
//               {refreshing ? 'Refreshing...' : 'Refresh'}
//             </button>
//             <button 
//               onClick={logout}
//               className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center"
//             >
//               <LogOutIcon size={16} className="mr-2" />
//               Logout
//             </button>
//             <button 
//               onClick={openEditModal}
//               className="px-4 py-2 bg-white text-purple-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
//             >
//               Edit Profile
//             </button>
//           </div>
//         </div>
//       </div>
      
//       {/* Tabs */}
//       <div className="flex mb-6 border-b border-gray-700">
//         <button 
//           onClick={() => setActiveTab('stats')} 
//           className={`px-6 py-3 font-medium transition-colors ${
//             activeTab === 'stats' 
//               ? 'text-purple-400 border-b-2 border-purple-500' 
//               : 'text-gray-400 hover:text-gray-300'
//           }`}
//         >
//           Statistics
//         </button>
//         <button 
//           onClick={() => setActiveTab('badges')} 
//           className={`px-6 py-3 font-medium transition-colors ${
//             activeTab === 'badges' 
//               ? 'text-purple-400 border-b-2 border-purple-500' 
//               : 'text-gray-400 hover:text-gray-300'
//           }`}
//         >
//           Badges & Achievements
//         </button>
//         <button 
//           onClick={() => setActiveTab('settings')} 
//           className={`px-6 py-3 font-medium transition-colors ${
//             activeTab === 'settings' 
//               ? 'text-purple-400 border-b-2 border-purple-500' 
//               : 'text-gray-400 hover:text-gray-300'
//           }`}
//         >
//           Settings
//         </button>
//       </div>
      
//       {/* Tab Content */}
//       {activeTab === 'stats' && renderStats()}
//       {activeTab === 'badges' && renderBadges()}
//       {activeTab === 'settings' && (
//         <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
//           <p className="text-gray-400">Profile settings would appear here.</p>
//         </div>
//       )}

//       {/* Edit Profile Modal */}
//       {showEditModal && <EditProfileModal />}
//     </div>
//   );
// };
