// frontend/LeaderboardPage.tsx
import React, { useState, useEffect } from 'react';
import { TrophyIcon, MedalIcon, AwardIcon, UsersIcon } from 'lucide-react';
import { SectionTitle } from '../components/UI/SectionTitle';

interface LeaderboardPlayer {
  _id: string;
  username: string;
  avatar: string;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate?: number;
}

export const LeaderboardPage = () => {
  const [leaderboardType, setLeaderboardType] = useState('global');
  const [gameFilter, setGameFilter] = useState('all');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gameTypes = [
    { id: 'all', name: 'All Games' },
    { id: 'trivia', name: 'Trivia' },
    { id: 'chess', name: 'Chess' },
    { id: 'uno', name: 'UNO' },
    { id: 'kahoot', name: 'Kahoot' },
    { id: 'pictionary', name: 'Pictionary' },
    { id: 'ludo', name: 'Ludo' }
  ];

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const gameTypeParam = gameFilter === 'all' ? '' : gameFilter;
        const url = `https://alu-globe-gameroom.onrender.com/user/leaderboard${gameTypeParam ? `?gameType=${gameTypeParam}` : ''}`;
        
        console.log('Fetching leaderboard from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Leaderboard response:', data);

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch leaderboard');
        }

        let leaderboard: LeaderboardPlayer[];
        
        if (data.data && Array.isArray(data.data)) {
          leaderboard = data.data;
        } else if (Array.isArray(data)) {
          leaderboard = data;
        } else {
          leaderboard = [];
        }

        // Ensure each player has required properties with defaults
        const formattedLeaderboard = leaderboard.map((player: any) => ({
          _id: player._id || '',
          username: player.username || 'Unknown Player',
          avatar: player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username || 'default'}`,
          score: Number(player.score) || 0,
          gamesPlayed: Number(player.gamesPlayed) || 0,
          gamesWon: Number(player.gamesWon) || 0,
          winRate: player.winRate ? Number(player.winRate) : undefined
        }));

        // Sort by score descending
        formattedLeaderboard.sort((a, b) => b.score - a.score);

        setLeaderboardData(formattedLeaderboard);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [gameFilter]);

  const renderTopThree = () => {
    const topThree = leaderboardData.slice(0, 3);
    if (topThree.length < 3) return null;
    
    const [first, second, third] = topThree;
    return (
      <div className="flex flex-col md:flex-row justify-center items-end mb-12 gap-4">
        {/* Second Place */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-1">
              <MedalIcon size={24} className="text-gray-300" />
            </div>
            <img 
              src={second.avatar} 
              alt={second.username} 
              className="w-20 h-20 rounded-full border-4 border-gray-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${second.username}`;
              }}
            />
          </div>
          <div className="mt-2 text-center">
            <h3 className="font-bold">{second.username}</h3>
            <p className="text-gray-400 text-sm">{second.score} pts</p>
          </div>
          <div className="w-full h-28 bg-gray-800/50 backdrop-blur-sm mt-2 rounded-t-lg flex items-center justify-center text-2xl font-bold border-t-4 border-gray-300">
            2
          </div>
        </div>
        
        {/* First Place */}
        <div className="flex flex-col items-center -mt-8">
          <div className="relative">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <TrophyIcon size={32} className="text-yellow-500" />
            </div>
            <img 
              src={first.avatar} 
              alt={first.username} 
              className="w-28 h-28 rounded-full border-4 border-yellow-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${first.username}`;
              }}
            />
          </div>
          <div className="mt-2 text-center">
            <h3 className="font-bold text-lg">{first.username}</h3>
            <p className="text-gray-300 font-medium">{first.score} pts</p>
          </div>
          <div className="w-full h-36 bg-gradient-to-b from-yellow-900/20 to-yellow-600/10 mt-2 rounded-t-lg flex items-center justify-center text-3xl font-bold border-t-4 border-yellow-500">
            1
          </div>
        </div>
        
        {/* Third Place */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-1">
              <AwardIcon size={24} className="text-amber-700" />
            </div>
            <img 
              src={third.avatar} 
              alt={third.username} 
              className="w-20 h-20 rounded-full border-4 border-amber-700"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${third.username}`;
              }}
            />
          </div>
          <div className="mt-2 text-center">
            <h3 className="font-bold">{third.username}</h3>
            <p className="text-gray-400 text-sm">{third.score} pts</p>
          </div>
          <div className="w-full h-24 bg-gray-800/50 backdrop-blur-sm mt-2 rounded-t-lg flex items-center justify-center text-2xl font-bold border-t-4 border-amber-700">
            3
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 overflow-y-auto h-screen pb-20">
        <SectionTitle title="Leaderboards" subtitle="See who's on top of the ALU Globe gaming world" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 overflow-y-auto h-screen pb-20">
        <SectionTitle title="Leaderboards" subtitle="See who's on top of the ALU Globe gaming world" />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="Leaderboards" subtitle="See who's on top of the ALU Globe gaming world" />
      
      {/* Leaderboard Type Selector */}
      <div className="flex mb-8 space-x-4">
        <button 
          onClick={() => setLeaderboardType('global')} 
          className={`px-6 py-3 rounded-lg transition-colors ${leaderboardType === 'global' ? 'bg-purple-700/50 border-2 border-purple-500 text-white' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-gray-300'}`}
        >
          Global Leaderboard
        </button>
        <button 
          onClick={() => setLeaderboardType('friends')} 
          className={`px-6 py-3 rounded-lg transition-colors flex items-center ${leaderboardType === 'friends' ? 'bg-purple-700/50 border-2 border-purple-500 text-white' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-gray-300'}`}
        >
          <UsersIcon size={18} className="mr-2" />
          Friends Leaderboard
        </button>
      </div>
      
      {/* Game Type Filter */}
      <div className="mb-8">
        <div className="text-sm text-gray-400 mb-2">Filter by game:</div>
        <div className="flex flex-wrap gap-2">
          {gameTypes.map(game => (
            <button 
              key={game.id} 
              onClick={() => setGameFilter(game.id)} 
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${gameFilter === game.id ? 'bg-purple-700/50 border border-purple-500 text-white' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-gray-300'}`}
            >
              {game.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Show message if no data */}
      {leaderboardData.length === 0 && !loading && (
        <div className="text-center text-gray-400 py-12">
          <p>No leaderboard data available for {gameFilter === 'all' ? 'any games' : gameTypes.find(g => g.id === gameFilter)?.name}.</p>
          <p className="text-sm mt-2">Players will appear here after playing games!</p>
        </div>
      )}

      {/* Top 3 Winners Podium */}
      {leaderboardData.length >= 3 && renderTopThree()}
      
      {/* Full Leaderboard */}
      {leaderboardData.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                  Games Played
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                  Win Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leaderboardData.map((player, index) => (
                <tr key={player._id} className={index < 3 ? 'bg-gray-800/30' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-300' : 
                      index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                      index === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-gray-700/50 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img 
                        src={player.avatar} 
                        alt={player.username} 
                        className="w-10 h-10 rounded-full border border-gray-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`;
                        }}
                      />
                      <div className="ml-3">
                        <div className="font-medium">{player.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold">{player.score}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-gray-300">{player.gamesPlayed}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-gray-300">
                      {player.winRate !== undefined ? Math.round(player.winRate) : 
                       player.gamesPlayed > 0 ? Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};