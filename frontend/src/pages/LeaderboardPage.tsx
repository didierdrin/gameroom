// frontend/LeaderboardPage.tsx
import React, { useState, useEffect } from 'react';
import { TrophyIcon, MedalIcon, AwardIcon, UsersIcon } from 'lucide-react';
import { SectionTitle } from '../components/UI/SectionTitle';


export const LeaderboardPage = () => {
  const [leaderboardType, setLeaderboardType] = useState('global');
  const [gameFilter, setGameFilter] = useState('all');
  const [leaderboardData, setLeaderboardData] = useState([]);
  

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
      try {
        const response = await fetch(`https://alu-globe-gameroom.onrender.com/users/leaderboard?gameType=${gameFilter === 'all' ? '' : gameFilter}`);
        const data = await response.json(); 
        setLeaderboardData(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
    };
    fetchLeaderboard();
  }, [gameFilter]);

  const renderTopThree = () => {
    const topThree = leaderboardData.slice(0, 3);
    if (topThree.length < 3) return null;
    
    const [first, second, third]:any = topThree;
    return (
      <div className="flex flex-col md:flex-row justify-center items-end mb-12 gap-4">
        {/* Second Place */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-1">
              <MedalIcon size={24} className="text-gray-300" />
            </div>
            <img src={second?.avatar as any} alt={second?.username} className="w-20 h-20 rounded-full border-4 border-gray-300" />
          </div>
          <div className="mt-2 text-center">
            <h3 className="font-bold">{second?.username}</h3>
            <p className="text-gray-400 text-sm">{second?.score} pts</p>
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
            <img src={first?.avatar} alt={first?.username} className="w-28 h-28 rounded-full border-4 border-yellow-500" />
          </div>
          <div className="mt-2 text-center">
            <h3 className="font-bold text-lg">{first?.username}</h3>
            <p className="text-gray-300 font-medium">{first?.score} pts</p>
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
            <img src={third?.avatar} alt={third?.username} className="w-20 h-20 rounded-full border-4 border-amber-700" />
          </div>
          <div className="mt-2 text-center">
            <h3 className="font-bold">{third?.username}</h3>
            <p className="text-gray-400 text-sm">{third?.score} pts</p>
          </div>
          <div className="w-full h-24 bg-gray-800/50 backdrop-blur-sm mt-2 rounded-t-lg flex items-center justify-center text-2xl font-bold border-t-4 border-amber-700">
            3
          </div>
        </div>
      </div>
    );
  };

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
      
      {/* Top 3 Winners Podium */}
      {leaderboardData.length >= 3 && renderTopThree()}
      
      {/* Full Leaderboard */}
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
            {leaderboardData.map(({player, index}:any) => (
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
                    <img src={player.avatar} alt={player.username} className="w-10 h-10 rounded-full border border-gray-600" />
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
                    {player.gamesPlayed > 0 ? Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// import React, { useState } from 'react';
// import { TrophyIcon, MedalIcon, AwardIcon, UsersIcon } from 'lucide-react';
// import { SectionTitle } from '../components/UI/SectionTitle';
// // Mock data
// const MOCK_LEADERBOARD_DATA = [{
//   id: 1,
//   name: 'Sarah',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
//   score: 1250,
//   gamesPlayed: 28,
//   gamesWon: 15
// }, {
//   id: 2,
//   name: 'Michael',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
//   score: 1120,
//   gamesPlayed: 25,
//   gamesWon: 12
// }, {
//   id: 3,
//   name: 'Jessica',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
//   score: 1080,
//   gamesPlayed: 22,
//   gamesWon: 10
// }, {
//   id: 4,
//   name: 'David',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
//   score: 950,
//   gamesPlayed: 20,
//   gamesWon: 8
// }, {
//   id: 5,
//   name: 'Emma',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
//   score: 920,
//   gamesPlayed: 19,
//   gamesWon: 7
// }, {
//   id: 6,
//   name: 'Daniel',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel',
//   score: 880,
//   gamesPlayed: 18,
//   gamesWon: 6
// }, {
//   id: 7,
//   name: 'Alex',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
//   score: 830,
//   gamesPlayed: 17,
//   gamesWon: 5
// }, {
//   id: 8,
//   name: 'Sophia',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
//   score: 790,
//   gamesPlayed: 15,
//   gamesWon: 4
// }, {
//   id: 9,
//   name: 'James',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
//   score: 750,
//   gamesPlayed: 14,
//   gamesWon: 3
// }, {
//   id: 10,
//   name: 'Olivia',
//   avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia',
//   score: 700,
//   gamesPlayed: 12,
//   gamesWon: 2
// }];
// export const LeaderboardPage = () => {
//   const [leaderboardType, setLeaderboardType] = useState('global');
//   const [gameFilter, setGameFilter] = useState('all');
//   const gameTypes = [{
//     id: 'all',
//     name: 'All Games'
//   }, {
//     id: 'trivia',
//     name: 'Trivia'
//   }, {
//     id: 'chess',
//     name: 'Chess'
//   }, {
//     id: 'uno',
//     name: 'UNO'
//   }, {
//     id: 'kahoot',
//     name: 'Kahoot'
//   }, {
//     id: 'pictionary',
//     name: 'Pictionary'
//   }];
//   const renderTopThree = () => {
//     const topThree = MOCK_LEADERBOARD_DATA.slice(0, 3);
//     const [first, second, third] = topThree;
//     return <div className="flex flex-col md:flex-row justify-center items-end mb-12 gap-4">
//         {/* Second Place */}
//         <div className="flex flex-col items-center">
//           <div className="relative">
//             <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-1">
//               <MedalIcon size={24} className="text-gray-300" />
//             </div>
//             <img src={second?.avatar} alt={second?.name} className="w-20 h-20 rounded-full border-4 border-gray-300" />
//           </div>
//           <div className="mt-2 text-center">
//             <h3 className="font-bold">{second?.name}</h3>
//             <p className="text-gray-400 text-sm">{second?.score} pts</p>
//           </div>
//           <div className="w-full h-28 bg-gray-800/50 backdrop-blur-sm mt-2 rounded-t-lg flex items-center justify-center text-2xl font-bold border-t-4 border-gray-300">
//             2
//           </div>
//         </div>
//         {/* First Place */}
//         <div className="flex flex-col items-center -mt-8">
//           <div className="relative">
//             <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
//               <TrophyIcon size={32} className="text-yellow-500" />
//             </div>
//             <img src={first?.avatar} alt={first?.name} className="w-28 h-28 rounded-full border-4 border-yellow-500" />
//           </div>
//           <div className="mt-2 text-center">
//             <h3 className="font-bold text-lg">{first?.name}</h3>
//             <p className="text-gray-300 font-medium">{first?.score} pts</p>
//           </div>
//           <div className="w-full h-36 bg-gradient-to-b from-yellow-900/20 to-yellow-600/10 mt-2 rounded-t-lg flex items-center justify-center text-3xl font-bold border-t-4 border-yellow-500">
//             1
//           </div>
//         </div>
//         {/* Third Place */}
//         <div className="flex flex-col items-center">
//           <div className="relative">
//             <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-1">
//               <AwardIcon size={24} className="text-amber-700" />
//             </div>
//             <img src={third?.avatar} alt={third?.name} className="w-20 h-20 rounded-full border-4 border-amber-700" />
//           </div>
//           <div className="mt-2 text-center">
//             <h3 className="font-bold">{third?.name}</h3>
//             <p className="text-gray-400 text-sm">{third?.score} pts</p>
//           </div>
//           <div className="w-full h-24 bg-gray-800/50 backdrop-blur-sm mt-2 rounded-t-lg flex items-center justify-center text-2xl font-bold border-t-4 border-amber-700">
//             3
//           </div>
//         </div>
//       </div>;
//   };
//   return <div className="p-6 overflow-y-auto h-screen pb-20">
//       <SectionTitle title="Leaderboards" subtitle="See who's on top of the ALU Globe gaming world" />
//       {/* Leaderboard Type Selector */}
//       <div className="flex mb-8 space-x-4">
//         <button onClick={() => setLeaderboardType('global')} className={`px-6 py-3 rounded-lg transition-colors ${leaderboardType === 'global' ? 'bg-purple-700/50 border-2 border-purple-500 text-white' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-gray-300'}`}>
//           Global Leaderboard
//         </button>
//         <button onClick={() => setLeaderboardType('friends')} className={`px-6 py-3 rounded-lg transition-colors flex items-center ${leaderboardType === 'friends' ? 'bg-purple-700/50 border-2 border-purple-500 text-white' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-gray-300'}`}>
//           <UsersIcon size={18} className="mr-2" />
//           Friends Leaderboard
//         </button>
//       </div>
//       {/* Game Type Filter */}
//       <div className="mb-8">
//         <div className="text-sm text-gray-400 mb-2">Filter by game:</div>
//         <div className="flex flex-wrap gap-2">
//           {gameTypes.map(game => <button key={game.id} onClick={() => setGameFilter(game.id)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${gameFilter === game.id ? 'bg-purple-700/50 border border-purple-500 text-white' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-gray-300'}`}>
//               {game.name}
//             </button>)}
//         </div>
//       </div>
//       {/* Top 3 Winners Podium */}
//       {renderTopThree()}
//       {/* Full Leaderboard */}
//       <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
//         <table className="w-full">
//           <thead>
//             <tr className="bg-gray-800">
//               <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                 Rank
//               </th>
//               <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                 Player
//               </th>
//               <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                 Score
//               </th>
//               <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
//                 Games Played
//               </th>
//               <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
//                 Win Rate
//               </th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-700">
//             {MOCK_LEADERBOARD_DATA.map((player, index) => <tr key={player.id} className={index < 3 ? 'bg-gray-800/30' : ''}>
//                 <td className="px-6 py-4 whitespace-nowrap">
//                   <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-300' : index === 1 ? 'bg-gray-400/20 text-gray-300' : index === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-gray-700/50 text-gray-400'}`}>
//                     {index + 1}
//                   </div>
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap">
//                   <div className="flex items-center">
//                     <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border border-gray-600" />
//                     <div className="ml-3">
//                       <div className="font-medium">{player.name}</div>
//                     </div>
//                   </div>
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap">
//                   <div className="text-lg font-bold">{player.score}</div>
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
//                   <div className="text-gray-300">{player.gamesPlayed}</div>
//                 </td>
//                 <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
//                   <div className="text-gray-300">
//                     {Math.round(player.gamesWon / player.gamesPlayed * 100)}%
//                   </div>
//                 </td>
//               </tr>)}
//           </tbody>
//         </table>
//       </div>
//     </div>;
// };