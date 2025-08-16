import React, { useState, useEffect } from 'react';
import { SectionTitle } from '../components/UI/SectionTitle';
import { TrophyIcon, BarChart3Icon, ClockIcon, StarIcon, EditIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const { user: authUser, updateUser } = useAuth(); // Add updateUser here
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    username: '',
    avatar: '',
    joinDate: '',
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    rank: '#0',
    gameStats: {},
    recentGames: [],
    favoriteGames: [] as any, 
    badges: [] as Array<{
      id: number;
      name: string; 
      icon: string; 
      description: string; 
      date: string; 
    }>
  });

  // ... existing code ...

useEffect(() => {
  const fetchUserData = async () => {
    if (!authUser) return;
    
    try {
      setLoading(true);
      
      // Debug: Log the user ID being used
      console.log('Fetching data for user ID:', authUser.id);
      console.log('Auth user object:', authUser);
      
      // First, let's try to get the user profile
      let profileResponse;
      let profileResult;
      
      try {
        profileResponse = await fetch(`https://alu-globe-gameroom.onrender.com/user/${authUser.id}`);
        console.log('Profile response status:', profileResponse.status);
        profileResult = await profileResponse.json();
        console.log('Profile result:', profileResult);
      } catch (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to fetch profile');
      }
      
             // Check if profile request was successful
       if (!profileResult.success) {
         // If user not found, try to re-authenticate
         if (profileResult.error === 'User not found') {
           console.log('User not found, attempting to re-authenticate...');
           
           try {
             const loginResponse = await fetch('https://alu-globe-gameroom.onrender.com/user/login-or-register', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
               },
               body: JSON.stringify({ username: authUser.username }),
             });
             
             const loginResult = await loginResponse.json();
             console.log('Re-authentication result:', loginResult);
             
             if (loginResult._id && loginResult._id !== authUser.id) {
               console.log('Updating user ID from', authUser.id, 'to', loginResult._id);
               // Update the auth context directly
               updateUser({ id: loginResult._id });
               // Retry the fetch with the new ID
               const retryResponse = await fetch(`https://alu-globe-gameroom.onrender.com/user/${loginResult._id}`);
               const retryResult = await retryResponse.json();
               
               if (!retryResult.success) {
                 console.warn('Retry failed, using fallback data');
                 profileResult = {
                   success: true,
                   data: {
                     username: authUser.username,
                     createdAt: new Date().toISOString()
                   }
                 };
               } else {
                 profileResult = retryResult;
               }
             } else if (loginResult._id === authUser.id) {
               console.log('User ID matches, but backend still can\'t find user. This suggests a backend issue.');
               // Instead of throwing an error, try to create a new user profile or handle gracefully
               console.warn('User profile not found in backend, creating fallback data');
               // Set fallback data and continue instead of crashing
               profileResult = {
                 success: true,
                 data: {
                   username: authUser.username,
                   createdAt: new Date().toISOString()
                 }
               };
             } else {
               console.log('Re-authentication failed or returned unexpected data:', loginResult);
               // Instead of throwing an error, try to continue with fallback data
               console.warn('Re-authentication failed, using fallback data');
               profileResult = {
                 success: true,
                 data: {
                   username: authUser.username,
                   createdAt: new Date().toISOString()
                 }
               };
             }
           } catch (reAuthError) {
             console.error('Re-authentication failed:', reAuthError);
             console.warn('Using fallback data due to re-authentication failure');
             // Instead of throwing an error, create fallback data
             profileResult = {
               success: true,
                 data: {
                   username: authUser.username,
                   createdAt: new Date().toISOString()
                 }
               };
           }
         } else {
           // For other errors, also use fallback data instead of throwing
           console.warn('Profile fetch failed with error:', profileResult.error, 'Using fallback data');
           profileResult = {
             success: true,
             data: {
               username: authUser.username,
               createdAt: new Date().toISOString()
             }
           };
         }
       }
      
             const profileData = profileResult.data || {
         username: authUser.username,
         createdAt: new Date().toISOString()
       };
       console.log('Profile data retrieved successfully:', profileData);
      
      // Now fetch stats
      let statsData;
      try {
        const statsResponse = await fetch(`https://alu-globe-gameroom.onrender.com/user/${authUser.id}/stats`);
        const statsResult = await statsResponse.json();
        
        // Check if stats request was successful
        if (!statsResult.success) {
          console.error('Stats fetch failed:', statsResult);
          console.warn('Using fallback stats data');
          // Use fallback stats data instead of throwing an error
          statsData = {
            totalScore: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            gameStats: [],
            gameHistory: []
          };
        } else {
          statsData = statsResult.data;
          console.log('Stats data retrieved successfully:', statsData);
        }
      } catch (statsError) {
        console.error('Stats fetch error:', statsError);
        console.warn('Using fallback stats data due to fetch error');
        // Use fallback stats data
        statsData = {
          totalScore: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          gameStats: [],
          gameHistory: []
        };
      }
      
             // Ensure we have valid profile data
       if (!profileData || !profileData.username) {
         console.warn('Invalid profile data, using fallback');
         profileData.username = authUser.username;
         profileData.createdAt = new Date().toISOString();
       }
       
       // Format join date
       const joinDate = profileData.createdAt 
         ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
             month: 'long',
             year: 'numeric'
           })
         : 'Unknown';

      // Calculate rank (this would ideally come from the backend)
      let rank = 'Unranked';
      try {
        const rankResponse = await fetch('https://alu-globe-gameroom.onrender.com/user/leaderboard');
        const rankResult = await rankResponse.json();
        
        // Check if leaderboard request was successful
        if (rankResult.success && rankResult.data) {
          const rankData = rankResult.data;
          const rankIndex = Array.isArray(rankData) ? rankData.findIndex((u:any) => u._id === authUser.id) : -1;
          rank = rankIndex >= 0 ? `#${rankIndex + 1}` : 'Unranked';
        } else {
          console.warn('Leaderboard fetch failed, using default rank');
        }
      } catch (rankError) {
        console.error('Leaderboard fetch error:', rankError);
        console.warn('Using default rank due to fetch error');
      }

      // Format game stats - Add null check for gameStats
      const gameStats = statsData.gameStats && Array.isArray(statsData.gameStats) 
        ? statsData.gameStats.reduce((acc: any, stat: any) => {
            acc[stat.gameType] = {
              played: stat.count,
              won: stat.wins,
              winRate: Math.round((stat.wins / stat.count) * 100),
              avgScore: Math.round(stat.score / stat.count)
            };
            return acc;
          }, {})
        : {};

      // Get recent games from game history (last 5) - Add null check
      const recentGames = statsData.gameHistory && Array.isArray(statsData.gameHistory)
        ? statsData.gameHistory
            .slice(0, 5)
            .map((game:any) => ({
              id: game.roomId,
              name: `${game.gameType} Game`,
              type: game.gameType,
              date: new Date(game.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }),
              result: game.won ? 'Won' : 'Lost',
              score: game.score
            }))
        : [];

      // Determine favorite games (top 3 by count) - Add null check
      const favoriteGames = statsData.gameStats && Array.isArray(statsData.gameStats)
        ? [...statsData.gameStats]
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(stat => stat.gameType)
        : [];

      // Generate badges based on achievements
      const badges = [];
      if (statsData.gamesWon >= 10) {
        badges.push({
          id: 1,
          name: 'Game Master',
          icon: '🏆',
          description: 'Won 10 or more games',
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        });
      }
      if (statsData.gameStats && Array.isArray(statsData.gameStats) && statsData.gameStats.some((stat:any) => stat.wins >= 5)) {
        badges.push({
          id: 2,
          name: 'Multi-Game Champion',
          icon: '🥇',
          description: 'Won 5+ games in multiple categories',
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        });
      }
      // Add more badge conditions as needed...

      setUserData({
        username: profileData.username || authUser.username || 'Unknown User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileData.username || authUser.username || 'Unknown')}`,
        joinDate,
        totalScore: statsData.totalScore || 0,
        gamesPlayed: statsData.gamesPlayed || 0,
        gamesWon: statsData.gamesWon || 0,
        rank,
        gameStats,
        recentGames,
        favoriteGames,
        badges
      });
    } catch (error: any) {
      console.error('Failed to fetch user data:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        authUserId: authUser?.id,
        authUsername: authUser?.username
      });
      
      // Show user-friendly error message with fallback data
      setUserData(prev => ({
        ...prev,
        username: authUser?.username || 'Unknown User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser?.username || 'Unknown')}`,
        joinDate: 'Unknown',
        totalScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        rank: 'Unranked',
        gameStats: {},
        recentGames: [],
        favoriteGames: [],
        badges: []
      }));
    } finally {
      setLoading(false);
    }
  };

  fetchUserData();
}, [authUser, updateUser]);



  // useEffect(() => {
  //   const fetchUserData = async () => {
  //     if (!authUser) return;
      
  //     try {
  //       setLoading(true);
  //       // Fetch user profile data
  //       const profileResponse = await fetch(`https://alu-globe-gameroom.onrender.com/user/${authUser.id}`);
  //       const profileData = await profileResponse.json();
  //       const statsResponse = await fetch(`https://alu-globe-gameroom.onrender.com/user/${authUser.id}/stats`);
  //       const statsData = await statsResponse.json();
        
  //       // Format join date
  //       const joinDate = new Date(profileData.createdAt).toLocaleDateString('en-US', {
  //         month: 'long',
  //         year: 'numeric'
  //       });

     

  //       // Calculate rank (this would ideally come from the backend)
  //       const rankResponse = await fetch('https://alu-globe-gameroom.onrender.com/user/leaderboard');
  //       const rankData = await rankResponse.json(); 
  //       // Fix: rankData is already an array, no need for .data
  //       const rankIndex = Array.isArray(rankData) ? rankData.findIndex((u:any) => u._id === authUser.id) : -1;

  //       const rank = rankIndex >= 0 ? `#${rankIndex + 1}` : 'Unranked';

  //       // Format game stats - Fix the reduce function destructuring
  //       const gameStats = statsData.gameStats.reduce((acc: any, stat: any) => {
  //         acc[stat.gameType] = {
  //           played: stat.count,
  //           won: stat.wins,
  //           winRate: Math.round((stat.wins / stat.count) * 100),
  //           avgScore: Math.round(stat.score / stat.count)
  //         };
  //         return acc;
  //       }, {});



  //       // Get recent games from game history (last 5)
  //       const recentGames = statsData.gameHistory
  //         .slice(0, 5)
  //         .map((game:any) => ({
  //           id: game.roomId,
  //           name: `${game.gameType} Game`,
  //           type: game.gameType,
  //           date: new Date(game.date).toLocaleDateString('en-US', {
  //             month: 'short',
  //             day: 'numeric',
  //             year: 'numeric'
  //           }),
  //           result: game.won ? 'Won' : 'Lost',
  //           score: game.score
  //         }));

  //       // Determine favorite games (top 3 by count)
  //       const favoriteGames = [...statsData.gameStats]
  //         .sort((a, b) => b.count - a.count)
  //         .slice(0, 3)
  //         .map(stat => stat.gameType);

  //       // Generate badges based on achievements
  //       const badges = [];
  //       if (statsData.gamesWon >= 10) {
  //         badges.push({
  //           id: 1,
  //           name: 'Game Master',
  //           icon: '🏆',
  //           description: 'Won 10 or more games',
  //           date: new Date().toLocaleDateString('en-US', {
  //             month: 'short',
  //             day: 'numeric',
  //             year: 'numeric'
  //           })
  //         });
  //       }
  //       if (statsData.gameStats.some((stat:any) => stat.wins >= 5)) {
  //         badges.push({
  //           id: 2,
  //           name: 'Multi-Game Champion',
  //           icon: '🥇',
  //           description: 'Won 5+ games in multiple categories',
  //           date: new Date().toLocaleDateString('en-US', {
  //             month: 'short',
  //             day: 'numeric',
  //             year: 'numeric'
  //           })
  //         });
  //       }
  //       // Add more badge conditions as needed...

  //       setUserData({
  //         username: profileData.username,
  //         avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileData.username)}`,
  //         joinDate,
  //         totalScore: statsData.totalScore,
  //         gamesPlayed: statsData.gamesPlayed,
  //         gamesWon: statsData.gamesWon,
  //         rank,
  //         gameStats,
  //         recentGames,
  //         favoriteGames,
  //         badges
  //       });
  //     } catch (error) {
  //       console.error('Failed to fetch user data:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUserData();
  // }, [authUser]);

  const renderStats = () => {
    if (loading) return <div className="text-center py-8">Loading stats...</div>;
    
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
              <div className="text-2xl font-bold">
                {userData.gamesPlayed > 0 
                  ? Math.round((userData.gamesWon / userData.gamesPlayed) * 100) 
                  : 0}%
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mr-4">
              <ClockIcon size={24} className="text-red-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Global Rank</div>
              <div className="text-2xl font-bold">{userData.rank}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Specific Stats */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-medium mb-4">Game Performance</h3>
            {Object.keys(userData.gameStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(userData.gameStats).map(([game, stats]:any) => (
                  <div key={game} className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
                      {game === 'trivia' ? '🎯' : 
                       game === 'chess' ? '♟️' : 
                       game === 'uno' ? '🃏' : 
                       game === 'kahoot' ? '❓' : 
                       game === 'pictionary' ? '🎨' : '🎮'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{game}</span>
                        <span className="text-sm text-gray-400">
                          {stats.played} games
                        </span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-600 rounded-full" 
                              style={{ width: `${stats.winRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="ml-2 text-sm">
                          {stats.winRate}% win rate
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No game statistics available yet.</p>
            )}
          </div>
          {/* Recent Games */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-medium mb-4">Recent Games</h3>
            {userData.recentGames.length > 0 ? (
              <div className="space-y-3">
                {userData.recentGames.map((game:any) => (
                  <div key={game.id} className="flex items-center p-2 hover:bg-gray-700/30 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
                      {game.type === 'Trivia' ? '🎯' : 
                       game.type === 'Chess' ? '♟️' : 
                       game.type === 'UNO' ? '🃏' : 
                       game.type === 'Kahoot' ? '❓' : 
                       game.type === 'Pictionary' ? '🎨' : '🎮'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{game.name}</span>
                        <span className="text-sm text-gray-400">{game.date}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-gray-400">{game.type}</span>
                        <span className={`text-sm ${
                          game.result === 'Won' ? 'text-green-400' : 
                          game.result === 'Lost' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {game.result} {game.score > 0 && `(${game.score} pts)`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No recent games played.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBadges = () => {
    if (loading) return <div className="text-center py-8">Loading badges...</div>;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {userData.badges.length > 0 ? (
          userData.badges.map((badge:any) => (
            <div key={badge.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-start">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center text-3xl mr-4">
                {badge.icon}
              </div>
              <div>
                <h3 className="font-bold">{badge.name}</h3>
                <p className="text-sm text-gray-400 mb-1">{badge.description}</p>
                <p className="text-xs text-gray-500">Earned on {badge.date}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-400">
            No badges earned yet. Keep playing to unlock achievements!
          </div>
        )}
      </div>
    );
  };

  // Format username to look like a name
  const formattedName = userData.username 
    ? userData.username
        .split('')
        .map((char, i) => i === 0 ? char.toUpperCase() : char)
        .join('')
    : 'Loading...';

  return (
    <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
      
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center">
          <div className="relative">
            <img 
              src={userData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anonymous'} 
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
              {userData.joinDate ? `Member since ${userData.joinDate}` : 'Loading...'}
            </p>
            <div className="flex items-center mt-2 justify-center md:justify-start">
              <div className="bg-purple-600/30 border border-purple-500 px-3 py-1 rounded-full text-sm">
                Level {Math.floor(userData.gamesPlayed / 10) + 1} {/* Simple level calculation */}
              </div>
              <div className="mx-2 h-1 w-1 rounded-full bg-gray-500"></div>
              <div className="text-sm text-gray-300">
                Global Rank: {userData.rank}
              </div>
            </div>
          </div>
          <div className="flex-1 flex justify-end mt-4 md:mt-0">
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

