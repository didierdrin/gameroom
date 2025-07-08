import React, { useState, useEffect } from 'react';
import { SectionTitle } from '../components/UI/SectionTitle';
import { TrophyIcon, BarChart3Icon, ClockIcon, StarIcon, EditIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const { user: authUser } = useAuth(); 
  const [userData, setUserData ] = useState(
    {
      name: '', // Alex Johnson
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      joinDate: '', //September 2023
      level: 24,
      totalScore: 3750,
      gamesPlayed: 85,
      gamesWon: 32,
      rank: '#14',
      favoriteGames: ['Trivia', 'Chess', 'UNO'],
      badges: [{
        id: 1,
        name: 'Trivia Master',
        icon: '🎯',
        description: 'Won 10 Trivia games',
        date: 'Oct 15, 2023'
      }, {
        id: 2,
        name: 'Chess Champion',
        icon: '♟️',
        description: 'Won 5 Chess tournaments',
        date: 'Oct 3, 2023'
      }, {
        id: 3,
        name: 'Social Butterfly',
        icon: '🦋',
        description: 'Played with 20 different players',
        date: 'Sep 28, 2023'
      }, {
        id: 4,
        name: 'Early Adopter',
        icon: '🚀',
        description: 'Joined during beta testing',
        date: 'Sep 10, 2023'
      }, {
        id: 5,
        name: 'Marathon Gamer',
        icon: '🏃',
        description: 'Played for 5 hours straight',
        date: 'Oct 10, 2023'
      }, {
        id: 6,
        name: 'Uno Wizard',
        icon: '🃏',
        description: 'Won 3 UNO games in a row',
        date: 'Sep 22, 2023'
      }],
      recentGames: [{
        id: 101,
        name: 'Trivia Night',
        type: 'Trivia',
        date: 'Oct 18, 2023',
        result: 'Won',
        score: 850
      }, {
        id: 102,
        name: 'Chess Tournament',
        type: 'Chess',
        date: 'Oct 16, 2023',
        result: 'Lost',
        score: 0
      }, {
        id: 103,
        name: 'UNO Championship',
        type: 'UNO',
        date: 'Oct 14, 2023',
        result: 'Won',
        score: 500
      }, {
        id: 104,
        name: 'CS Kahoot',
        type: 'Kahoot',
        date: 'Oct 12, 2023',
        result: '2nd Place',
        score: 450
      }, {
        id: 105,
        name: 'Pictionary Challenge',
        type: 'Pictionary',
        date: 'Oct 10, 2023',
        result: 'Won',
        score: 600
      }],
      gameStats: {
        trivia: {
          played: 32,
          won: 15,
          winRate: 47,
          avgScore: 720
        },
        chess: {
          played: 18,
          won: 7,
          winRate: 39,
          avgScore: 0
        },
        uno: {
          played: 15,
          won: 6,
          winRate: 40,
          avgScore: 0
        },
        kahoot: {
          played: 12,
          won: 3,
          winRate: 25,
          avgScore: 650
        },
        pictionary: {
          played: 8,
          won: 1,
          winRate: 13,
          avgScore: 450
        }
      }
    }
  )

  useEffect(() => {
    if (authUser) {
      // Format the username to look like a name
      const formattedName = authUser.username
        .split('')
        .map((char, i) => i === 0 ? char.toUpperCase() : char)
        .join('');

      // Fetch the user data including createdAt from backend
      const fetchUserData = async () => {
        try {
          const response = await fetch(`https://alu-globe-gameroom.onrender.com/user/${authUser.id}`);
          const user = await response.json();
          
          // Format the join date
          const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          });

          setUserData(prev => ({
            ...prev,
            name: formattedName,
            joinDate: joinDate
          }));
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          // Fallback to current date if fetch fails
          setUserData(prev => ({
            ...prev,
            name: formattedName,
            joinDate: new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })
          }));
        }
      };

      fetchUserData();
    }
  }, [authUser]);

  // Mock user data
  const user = {
    name: userData.name || 'Loading...',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    joinDate: userData.joinDate || 'Loading...',
    level: 24,
    totalScore: 3750,
    gamesPlayed: 85,
    gamesWon: 32,
    rank: '#14',
    favoriteGames: ['Trivia', 'Chess', 'UNO'],
    badges: [{
      id: 1,
      name: 'Trivia Master',
      icon: '🎯',
      description: 'Won 10 Trivia games',
      date: 'Oct 15, 2023'
    }, {
      id: 2,
      name: 'Chess Champion',
      icon: '♟️',
      description: 'Won 5 Chess tournaments',
      date: 'Oct 3, 2023'
    }, {
      id: 3,
      name: 'Social Butterfly',
      icon: '🦋',
      description: 'Played with 20 different players',
      date: 'Sep 28, 2023'
    }, {
      id: 4,
      name: 'Early Adopter',
      icon: '🚀',
      description: 'Joined during beta testing',
      date: 'Sep 10, 2023'
    }, {
      id: 5,
      name: 'Marathon Gamer',
      icon: '🏃',
      description: 'Played for 5 hours straight',
      date: 'Oct 10, 2023'
    }, {
      id: 6,
      name: 'Uno Wizard',
      icon: '🃏',
      description: 'Won 3 UNO games in a row',
      date: 'Sep 22, 2023'
    }],
    recentGames: [{
      id: 101,
      name: 'Trivia Night',
      type: 'Trivia',
      date: 'Oct 18, 2023',
      result: 'Won',
      score: 850
    }, {
      id: 102,
      name: 'Chess Tournament',
      type: 'Chess',
      date: 'Oct 16, 2023',
      result: 'Lost',
      score: 0
    }, {
      id: 103,
      name: 'UNO Championship',
      type: 'UNO',
      date: 'Oct 14, 2023',
      result: 'Won',
      score: 500
    }, {
      id: 104,
      name: 'CS Kahoot',
      type: 'Kahoot',
      date: 'Oct 12, 2023',
      result: '2nd Place',
      score: 450
    }, {
      id: 105,
      name: 'Pictionary Challenge',
      type: 'Pictionary',
      date: 'Oct 10, 2023',
      result: 'Won',
      score: 600
    }],
    gameStats: {
      trivia: {
        played: 32,
        won: 15,
        winRate: 47,
        avgScore: 720
      },
      chess: {
        played: 18,
        won: 7,
        winRate: 39,
        avgScore: 0
      },
      uno: {
        played: 15,
        won: 6,
        winRate: 40,
        avgScore: 0
      },
      kahoot: {
        played: 12,
        won: 3,
        winRate: 25,
        avgScore: 650
      },
      pictionary: {
        played: 8,
        won: 1,
        winRate: 13,
        avgScore: 450
      }
    }
  };
  const renderStats = () => {
    return <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center mr-4">
              <BarChart3Icon size={24} className="text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Score</div>
              <div className="text-2xl font-bold">{user.totalScore}</div>
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center mr-4">
              <TrophyIcon size={24} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Games Won</div>
              <div className="text-2xl font-bold">
                {user.gamesWon}/{user.gamesPlayed}
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
                {Math.round(user.gamesWon / user.gamesPlayed * 100)}%
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mr-4">
              <ClockIcon size={24} className="text-red-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Global Rank</div>
              <div className="text-2xl font-bold">{user.rank}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Specific Stats */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-medium mb-4">Game Performance</h3>
            <div className="space-y-4">
              {Object.entries(user.gameStats).map(([game, stats]) => <div key={game} className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
                    {game === 'trivia' ? '🎯' : game === 'chess' ? '♟️' : game === 'uno' ? '🃏' : game === 'kahoot' ? '❓' : '🎨'}
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
                          <div className="h-full bg-purple-600 rounded-full" style={{
                        width: `${stats.winRate}%`
                      }}></div>
                        </div>
                      </div>
                      <span className="ml-2 text-sm">
                        {stats.winRate}% win rate
                      </span>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>
          {/* Recent Games */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-medium mb-4">Recent Games</h3>
            <div className="space-y-3">
              {user.recentGames.map(game => <div key={game.id} className="flex items-center p-2 hover:bg-gray-700/30 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
                    {game.type === 'Trivia' ? '🎯' : game.type === 'Chess' ? '♟️' : game.type === 'UNO' ? '🃏' : game.type === 'Kahoot' ? '❓' : '🎨'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{game.name}</span>
                      <span className="text-sm text-gray-400">{game.date}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm text-gray-400">{game.type}</span>
                      <span className={`text-sm ${game.result === 'Won' ? 'text-green-400' : game.result === 'Lost' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {game.result}
                      </span>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>
        </div>
      </div>;
  };
  const renderBadges = () => {
    return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {user.badges.map(badge => <div key={badge.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-start">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center text-3xl mr-4">
              {badge.icon}
            </div>
            <div>
              <h3 className="font-bold">{badge.name}</h3>
              <p className="text-sm text-gray-400 mb-1">{badge.description}</p>
              <p className="text-xs text-gray-500">Earned on {badge.date}</p>
            </div>
          </div>)}
      </div>;
  };
  return <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center">
          <div className="relative">
            <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-purple-500" />
            <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-900 cursor-pointer">
              <EditIcon size={16} />
            </div>
          </div>
          <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-gray-300">Member since {user.joinDate}</p>
            <div className="flex items-center mt-2 justify-center md:justify-start">
              <div className="bg-purple-600/30 border border-purple-500 px-3 py-1 rounded-full text-sm">
                Level {user.level}
              </div>
              <div className="mx-2 h-1 w-1 rounded-full bg-gray-500"></div>
              <div className="text-sm text-gray-300">
                Global Rank: {user.rank}
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
        <button onClick={() => setActiveTab('stats')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'stats' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Statistics
        </button>
        <button onClick={() => setActiveTab('badges')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'badges' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Badges & Achievements
        </button>
        <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'settings' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Settings
        </button>
      </div>
      {/* Tab Content */}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'badges' && renderBadges()}
      {activeTab === 'settings' && <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
          <p className="text-gray-400">Profile settings would appear here.</p>
        </div>}
    </div>;
};









// import React, { useState } from 'react';
// import { SectionTitle } from '../components/UI/SectionTitle';
// import { TrophyIcon, BarChart3Icon, ClockIcon, StarIcon, EditIcon } from 'lucide-react';
// import { useAuth } from '../context/AuthContext';

// export const ProfilePage = () => {
//   const [activeTab, setActiveTab] = useState('stats');
//   const { user: authUser } = useAuth(); 
//   const [userData, setUserData ] = useState(
//     {
//       name: '', // Alex Johnson
//       avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
//       joinDate: '', //September 2023
//       level: 24,
//       totalScore: 3750,
//       gamesPlayed: 85,
//       gamesWon: 32,
//       rank: '#14',
//       favoriteGames: ['Trivia', 'Chess', 'UNO'],
//       badges: [{
//         id: 1,
//         name: 'Trivia Master',
//         icon: '🎯',
//         description: 'Won 10 Trivia games',
//         date: 'Oct 15, 2023'
//       }, {
//         id: 2,
//         name: 'Chess Champion',
//         icon: '♟️',
//         description: 'Won 5 Chess tournaments',
//         date: 'Oct 3, 2023'
//       }, {
//         id: 3,
//         name: 'Social Butterfly',
//         icon: '🦋',
//         description: 'Played with 20 different players',
//         date: 'Sep 28, 2023'
//       }, {
//         id: 4,
//         name: 'Early Adopter',
//         icon: '🚀',
//         description: 'Joined during beta testing',
//         date: 'Sep 10, 2023'
//       }, {
//         id: 5,
//         name: 'Marathon Gamer',
//         icon: '🏃',
//         description: 'Played for 5 hours straight',
//         date: 'Oct 10, 2023'
//       }, {
//         id: 6,
//         name: 'Uno Wizard',
//         icon: '🃏',
//         description: 'Won 3 UNO games in a row',
//         date: 'Sep 22, 2023'
//       }],
//       recentGames: [{
//         id: 101,
//         name: 'Trivia Night',
//         type: 'Trivia',
//         date: 'Oct 18, 2023',
//         result: 'Won',
//         score: 850
//       }, {
//         id: 102,
//         name: 'Chess Tournament',
//         type: 'Chess',
//         date: 'Oct 16, 2023',
//         result: 'Lost',
//         score: 0
//       }, {
//         id: 103,
//         name: 'UNO Championship',
//         type: 'UNO',
//         date: 'Oct 14, 2023',
//         result: 'Won',
//         score: 500
//       }, {
//         id: 104,
//         name: 'CS Kahoot',
//         type: 'Kahoot',
//         date: 'Oct 12, 2023',
//         result: '2nd Place',
//         score: 450
//       }, {
//         id: 105,
//         name: 'Pictionary Challenge',
//         type: 'Pictionary',
//         date: 'Oct 10, 2023',
//         result: 'Won',
//         score: 600
//       }],
//       gameStats: {
//         trivia: {
//           played: 32,
//           won: 15,
//           winRate: 47,
//           avgScore: 720
//         },
//         chess: {
//           played: 18,
//           won: 7,
//           winRate: 39,
//           avgScore: 0
//         },
//         uno: {
//           played: 15,
//           won: 6,
//           winRate: 40,
//           avgScore: 0
//         },
//         kahoot: {
//           played: 12,
//           won: 3,
//           winRate: 25,
//           avgScore: 650
//         },
//         pictionary: {
//           played: 8,
//           won: 1,
//           winRate: 13,
//           avgScore: 450
//         }
//       }
//     }
//   )

//   useEffect(() => {
//     if (authUser) {
//       // Format the username to look like a name
//       const formattedName = authUser.username
//         .split('')
//         .map((char, i) => i === 0 ? char.toUpperCase() : char)
//         .join('');

//       // Fetch the user data including createdAt from backend
//       const fetchUserData = async () => {
//         try {
//           const response = await fetch(`/user/${authUser.id}`);
//           const user = await response.json();
          
//           // Format the join date
//           const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
//             month: 'long',
//             year: 'numeric'
//           });

//           setUserData(prev => ({
//             ...prev,
//             name: formattedName,
//             joinDate: joinDate
//           }));
//         } catch (error) {
//           console.error('Failed to fetch user data:', error);
//           // Fallback to current date if fetch fails
//           setUserData(prev => ({
//             ...prev,
//             name: formattedName,
//             joinDate: new Date().toLocaleDateString('en-US', {
//               month: 'long',
//               year: 'numeric'
//             })
//           }));
//         }
//       };

//       fetchUserData();
//     }
//   }, [authUser]);

//   // Mock user data
//   const user = {
//     name: 'Alex Johnson',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
//     joinDate: 'September 2023',
//     level: 24,
//     totalScore: 3750,
//     gamesPlayed: 85,
//     gamesWon: 32,
//     rank: '#14',
//     favoriteGames: ['Trivia', 'Chess', 'UNO'],
//     badges: [{
//       id: 1,
//       name: 'Trivia Master',
//       icon: '🎯',
//       description: 'Won 10 Trivia games',
//       date: 'Oct 15, 2023'
//     }, {
//       id: 2,
//       name: 'Chess Champion',
//       icon: '♟️',
//       description: 'Won 5 Chess tournaments',
//       date: 'Oct 3, 2023'
//     }, {
//       id: 3,
//       name: 'Social Butterfly',
//       icon: '🦋',
//       description: 'Played with 20 different players',
//       date: 'Sep 28, 2023'
//     }, {
//       id: 4,
//       name: 'Early Adopter',
//       icon: '🚀',
//       description: 'Joined during beta testing',
//       date: 'Sep 10, 2023'
//     }, {
//       id: 5,
//       name: 'Marathon Gamer',
//       icon: '🏃',
//       description: 'Played for 5 hours straight',
//       date: 'Oct 10, 2023'
//     }, {
//       id: 6,
//       name: 'Uno Wizard',
//       icon: '🃏',
//       description: 'Won 3 UNO games in a row',
//       date: 'Sep 22, 2023'
//     }],
//     recentGames: [{
//       id: 101,
//       name: 'Trivia Night',
//       type: 'Trivia',
//       date: 'Oct 18, 2023',
//       result: 'Won',
//       score: 850
//     }, {
//       id: 102,
//       name: 'Chess Tournament',
//       type: 'Chess',
//       date: 'Oct 16, 2023',
//       result: 'Lost',
//       score: 0
//     }, {
//       id: 103,
//       name: 'UNO Championship',
//       type: 'UNO',
//       date: 'Oct 14, 2023',
//       result: 'Won',
//       score: 500
//     }, {
//       id: 104,
//       name: 'CS Kahoot',
//       type: 'Kahoot',
//       date: 'Oct 12, 2023',
//       result: '2nd Place',
//       score: 450
//     }, {
//       id: 105,
//       name: 'Pictionary Challenge',
//       type: 'Pictionary',
//       date: 'Oct 10, 2023',
//       result: 'Won',
//       score: 600
//     }],
//     gameStats: {
//       trivia: {
//         played: 32,
//         won: 15,
//         winRate: 47,
//         avgScore: 720
//       },
//       chess: {
//         played: 18,
//         won: 7,
//         winRate: 39,
//         avgScore: 0
//       },
//       uno: {
//         played: 15,
//         won: 6,
//         winRate: 40,
//         avgScore: 0
//       },
//       kahoot: {
//         played: 12,
//         won: 3,
//         winRate: 25,
//         avgScore: 650
//       },
//       pictionary: {
//         played: 8,
//         won: 1,
//         winRate: 13,
//         avgScore: 450
//       }
//     }
//   };
//   const renderStats = () => {
//     return <div>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center mr-4">
//               <BarChart3Icon size={24} className="text-purple-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Total Score</div>
//               <div className="text-2xl font-bold">{user.totalScore}</div>
//             </div>
//           </div>
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center mr-4">
//               <TrophyIcon size={24} className="text-blue-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Games Won</div>
//               <div className="text-2xl font-bold">
//                 {user.gamesWon}/{user.gamesPlayed}
//               </div>
//             </div>
//           </div>
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center mr-4">
//               <StarIcon size={24} className="text-green-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Win Rate</div>
//               <div className="text-2xl font-bold">
//                 {Math.round(user.gamesWon / user.gamesPlayed * 100)}%
//               </div>
//             </div>
//           </div>
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-center">
//             <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mr-4">
//               <ClockIcon size={24} className="text-red-400" />
//             </div>
//             <div>
//               <div className="text-sm text-gray-400">Global Rank</div>
//               <div className="text-2xl font-bold">{user.rank}</div>
//             </div>
//           </div>
//         </div>
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Game Specific Stats */}
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
//             <h3 className="text-lg font-medium mb-4">Game Performance</h3>
//             <div className="space-y-4">
//               {Object.entries(user.gameStats).map(([game, stats]) => <div key={game} className="flex items-center">
//                   <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
//                     {game === 'trivia' ? '🎯' : game === 'chess' ? '♟️' : game === 'uno' ? '🃏' : game === 'kahoot' ? '❓' : '🎨'}
//                   </div>
//                   <div className="flex-1">
//                     <div className="flex justify-between">
//                       <span className="font-medium capitalize">{game}</span>
//                       <span className="text-sm text-gray-400">
//                         {stats.played} games
//                       </span>
//                     </div>
//                     <div className="mt-1 flex items-center">
//                       <div className="flex-1">
//                         <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
//                           <div className="h-full bg-purple-600 rounded-full" style={{
//                         width: `${stats.winRate}%`
//                       }}></div>
//                         </div>
//                       </div>
//                       <span className="ml-2 text-sm">
//                         {stats.winRate}% win rate
//                       </span>
//                     </div>
//                   </div>
//                 </div>)}
//             </div>
//           </div>
//           {/* Recent Games */}
//           <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
//             <h3 className="text-lg font-medium mb-4">Recent Games</h3>
//             <div className="space-y-3">
//               {user.recentGames.map(game => <div key={game.id} className="flex items-center p-2 hover:bg-gray-700/30 rounded-lg transition-colors">
//                   <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl mr-3">
//                     {game.type === 'Trivia' ? '🎯' : game.type === 'Chess' ? '♟️' : game.type === 'UNO' ? '🃏' : game.type === 'Kahoot' ? '❓' : '🎨'}
//                   </div>
//                   <div className="flex-1">
//                     <div className="flex justify-between">
//                       <span className="font-medium">{game.name}</span>
//                       <span className="text-sm text-gray-400">{game.date}</span>
//                     </div>
//                     <div className="flex justify-between mt-1">
//                       <span className="text-sm text-gray-400">{game.type}</span>
//                       <span className={`text-sm ${game.result === 'Won' ? 'text-green-400' : game.result === 'Lost' ? 'text-red-400' : 'text-yellow-400'}`}>
//                         {game.result}
//                       </span>
//                     </div>
//                   </div>
//                 </div>)}
//             </div>
//           </div>
//         </div>
//       </div>;
//   };
//   const renderBadges = () => {
//     return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//         {user.badges.map(badge => <div key={badge.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-start">
//             <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center text-3xl mr-4">
//               {badge.icon}
//             </div>
//             <div>
//               <h3 className="font-bold">{badge.name}</h3>
//               <p className="text-sm text-gray-400 mb-1">{badge.description}</p>
//               <p className="text-xs text-gray-500">Earned on {badge.date}</p>
//             </div>
//           </div>)}
//       </div>;
//   };
//   return <div className="p-6 overflow-y-auto h-screen pb-20">
//       <SectionTitle title="Game Profile" subtitle="View your gaming stats, achievements, and history" />
//       {/* Profile Header */}
//       <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 mb-8 relative overflow-hidden">
//         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
//         <div className="relative z-10 flex flex-col md:flex-row items-center">
//           <div className="relative">
//             <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-purple-500" />
//             <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-900 cursor-pointer">
//               <EditIcon size={16} />
//             </div>
//           </div>
//           <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
//             <h2 className="text-2xl font-bold">{user.name}</h2>
//             <p className="text-gray-300">Member since {user.joinDate}</p>
//             <div className="flex items-center mt-2 justify-center md:justify-start">
//               <div className="bg-purple-600/30 border border-purple-500 px-3 py-1 rounded-full text-sm">
//                 Level {user.level}
//               </div>
//               <div className="mx-2 h-1 w-1 rounded-full bg-gray-500"></div>
//               <div className="text-sm text-gray-300">
//                 Global Rank: {user.rank}
//               </div>
//             </div>
//           </div>
//           <div className="flex-1 flex justify-end mt-4 md:mt-0">
//             <button className="px-4 py-2 bg-white text-purple-900 font-medium rounded-lg hover:bg-gray-100 transition-colors">
//               Edit Profile
//             </button>
//           </div>
//         </div>
//       </div>
//       {/* Tabs */}
//       <div className="flex mb-6 border-b border-gray-700">
//         <button onClick={() => setActiveTab('stats')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'stats' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
//           Statistics
//         </button>
//         <button onClick={() => setActiveTab('badges')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'badges' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
//           Badges & Achievements
//         </button>
//         <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'settings' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
//           Settings
//         </button>
//       </div>
//       {/* Tab Content */}
//       {activeTab === 'stats' && renderStats()}
//       {activeTab === 'badges' && renderBadges()}
//       {activeTab === 'settings' && <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
//           <p className="text-gray-400">Profile settings would appear here.</p>
//         </div>}
//     </div>;
// };