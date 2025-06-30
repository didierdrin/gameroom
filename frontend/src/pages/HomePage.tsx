import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, FilterIcon } from 'lucide-react';
import { GameRoomList } from '../components/GameRoom/GameRoomList';
import { SectionTitle } from '../components/UI/SectionTitle';
// Mock data for demonstration
const MOCK_LIVE_GAME_ROOMS = [{
  id: 1,
  name: 'Trivia Night!',
  gameType: 'Trivia',
  hostName: 'Sarah',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  currentPlayers: 8,
  maxPlayers: 15,
  isPrivate: false,
  isInviteOnly: false
}, {
  id: 2,
  name: 'Chess Tournament',
  gameType: 'Chess',
  hostName: 'Michael',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
  currentPlayers: 6,
  maxPlayers: 10,
  isPrivate: false,
  isInviteOnly: true
}, {
  id: 3,
  name: 'UNO Championship',
  gameType: 'UNO',
  hostName: 'Jessica',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
  currentPlayers: 3,
  maxPlayers: 4,
  isPrivate: true,
  isInviteOnly: false
}, {
  id: 4,
  name: 'Kahoot: ALU History',
  gameType: 'Kahoot',
  hostName: 'Professor David',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
  currentPlayers: 12,
  maxPlayers: 30,
  isPrivate: false,
  isInviteOnly: false
}];
const MOCK_UPCOMING_GAME_ROOMS = [{
  id: 5,
  name: 'Pictionary Challenge',
  gameType: 'Pictionary',
  hostName: 'Emma',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  currentPlayers: 0,
  maxPlayers: 12,
  isPrivate: false,
  isInviteOnly: false,
  startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
}, {
  id: 6,
  name: 'Debate Club Trivia',
  gameType: 'Trivia',
  hostName: 'Daniel',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel',
  currentPlayers: 0,
  maxPlayers: 20,
  isPrivate: false,
  isInviteOnly: true,
  startTime: new Date(Date.now() + 25 * 60 * 1000).toISOString() // 25 minutes from now
}];
const MOCK_TOURNAMENTS = [{
  id: 101,
  name: 'ALU Chess Masters',
  gameType: 'Chess',
  participants: 32,
  startDate: '2023-11-20',
  prize: '500 ALU Points',
  banner: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=2071'
}, {
  id: 102,
  name: 'Trivia Tournament',
  gameType: 'Trivia',
  participants: 48,
  startDate: '2023-11-25',
  prize: '300 ALU Points',
  banner: 'https://images.unsplash.com/photo-1606167668584-78701c57f90d?auto=format&fit=crop&q=80&w=2070'
}];
export const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();


  // Update the join button click handler
const handleJoinRoom = () => {
  if (isPrivate || isInviteOnly) {
    // Show password prompt or invite flow
    const password = prompt('Enter room password:');
    if (password === null) return;
    
    // Initialize socket connection
    const socket = io('http://localhost:3000'); // Replace with your backend URL
    
    // Emit joinGame event
    socket.emit('joinGame', {
      roomId: id,
      playerId: 'current-user-id', // Replace with actual user ID
      password,
    });
    
    // Listen for successful join
    socket.on('playerJoined', () => {
      onJoinRoom(gameRoom);
    });
    
    socket.on('error', (error) => {
      console.error('Error joining game:', error);
      // TODO: Display error to user
    });
  } else {
    // Public room - join directly
    const socket = io('http://localhost:3000'); // Replace with your backend URL
    socket.emit('joinGame', {
      roomId: id,
      playerId: 'current-user-id', // Replace with actual user ID
    });
    
    socket.on('playerJoined', () => {
      onJoinRoom(gameRoom);
    });
  }
};

  return <div className="p-6 overflow-y-auto h-screen pb-20">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-8 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2071')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">ALU Globe Game Room</h1>
          <p className="text-xl text-gray-200 mb-6">
            Play, compete, and connect with fellow students!
          </p>
          <div className="flex space-x-4">
            <button 
              onClick={() => navigate('/create-game-room')}
              className="px-6 py-3 bg-white text-purple-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Create Game Room
            </button>
            <button 
              onClick={() => navigate('/tournaments')}
              className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Join Tournament
            </button>
          </div>
        </div>
        {/* Floating game icons */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:flex flex-col space-y-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl animate-float">
            ♟️
          </div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl animate-float-delay-1">
            🎯
          </div>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl animate-float-delay-2">
            🎮
          </div>
        </div>
      </div>
      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative flex-1">
          <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search game rooms..." className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <button className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center">
          <FilterIcon size={20} className="mr-2" />
          <span>Filter</span>
        </button>
      </div>
      {/* Live Game Rooms */}
      <section className="mb-12">
        <SectionTitle title="Live Game Rooms" subtitle="Join an active game room and start playing right away!" />
        <GameRoomList gameRooms={MOCK_LIVE_GAME_ROOMS} onJoinRoom={handleJoinRoom} />
      </section>
      {/* Upcoming Game Rooms */}
      <section className="mb-12">
        <SectionTitle title="Upcoming Game Rooms" subtitle="Game rooms scheduled to start soon. Register now to get notified!" />
        <GameRoomList gameRooms={MOCK_UPCOMING_GAME_ROOMS} onJoinRoom={handleJoinRoom} />
      </section>
      {/* Tournaments */}
      <section className="mb-12">
        <SectionTitle title="Tournaments" subtitle="Compete with other students and win exciting prizes!" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_TOURNAMENTS.map(tournament => (
            <div 
              key={tournament.id} 
              className="relative h-48 rounded-xl overflow-hidden group cursor-pointer"
              onClick={() => navigate(`/tournaments/${tournament.id}`)}
            >
              <div className="absolute inset-0">
                <img 
                  src={tournament.banner} 
                  alt={tournament.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 p-4 w-full">
                <h3 className="text-xl font-bold text-white">
                  {tournament.name}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-gray-300 text-sm">
                      {tournament.gameType} • {tournament.participants} Participants
                    </p>
                    <p className="text-gray-400 text-xs">
                      Starts {tournament.startDate}
                    </p>
                  </div>
                  <div className="bg-purple-600 text-white text-xs py-1 px-3 rounded-full">
                    Prize: {tournament.prize}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>;
};


  // const handleJoinRoom = (gameRoom:any) => {
  //   navigate(`/game-room/${gameRoom.id}`);
  // };