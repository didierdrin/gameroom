import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, FilterIcon } from "lucide-react";
import io from "socket.io-client";
import { GameRoomList } from "../components/GameRoom/GameRoomList";
import { SectionTitle } from "../components/UI/SectionTitle";
import { useSocket } from "../SocketContext";

// Define types for better TypeScript support
interface GameRoom {
  id: string;
  name: string;
  gameType: string;
  hostName: string;
  hostAvatar: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  isInviteOnly: boolean;
  startTime?: string;
  scheduledTimeCombined?: string;
}

interface Tournament {
  id: number;
  name: string;
  gameType: string;
  participants: number;
  startDate: string;
  prize: string;
  banner: string;
}

// Mock data for demonstration
const MOCK_LIVE_GAME_ROOMS: GameRoom[] = [
  {
    id: "",
    name: "Trivia Night!",
    gameType: "Trivia",
    hostName: "Sarah",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    currentPlayers: 8,
    maxPlayers: 15,
    isPrivate: false,
    isInviteOnly: false,
  },
  {
    id: "",
    name: "Chess Tournament",
    gameType: "Chess",
    hostName: "Michael",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    currentPlayers: 6,
    maxPlayers: 10,
    isPrivate: false,
    isInviteOnly: true,
  },
  {
    id: "",
    name: "UNO Championship",
    gameType: "UNO",
    hostName: "Jessica",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
    currentPlayers: 3,
    maxPlayers: 4,
    isPrivate: true,
    isInviteOnly: false,
  },
  {
    id: "",
    name: "Kahoot: ALU History",
    gameType: "Kahoot",
    hostName: "Professor David",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    currentPlayers: 12,
    maxPlayers: 30,
    isPrivate: false,
    isInviteOnly: false,
  },
];

const MOCK_UPCOMING_GAME_ROOMS: GameRoom[] = [
  {
    id: "",
    name: "Pictionary Challenge",
    gameType: "Pictionary",
    hostName: "Emma",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    currentPlayers: 0,
    maxPlayers: 12,
    isPrivate: false,
    isInviteOnly: false,
    startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
  },
  {
    id: "",
    name: "Debate Club Trivia",
    gameType: "Trivia",
    hostName: "Daniel",
    hostAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel",
    currentPlayers: 0,
    maxPlayers: 20,
    isPrivate: false,
    isInviteOnly: true,
    startTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 minutes from now
  },
];

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 101,
    name: "ALU Chess Masters",
    gameType: "Chess",
    participants: 32,
    startDate: "2023-11-20",
    prize: "500 ALU Points",
    banner:
      "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=2071",
  },
  {
    id: 102,
    name: "Trivia Tournament",
    gameType: "Trivia",
    participants: 48,
    startDate: "2023-11-25",
    prize: "300 ALU Points",
    banner:
      "https://images.unsplash.com/photo-1606167668584-78701c57f90d?auto=format&fit=crop&q=80&w=2070",
  },
];

export const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [liveRooms, setLiveRooms] = useState<GameRoom[]>([]);
  const [upcomingRooms, setUpcomingRooms] = useState<GameRoom[]>([]);

  const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const socket = useSocket();
  

// Fetch game rooms when socket is available
useEffect(() => {
  if (!socket) return;

  const handleGameRoomsList = (payload: { rooms: GameRoom[] }) => {
    setLoading(false);
    const rooms = payload.rooms;
    const now = new Date();
    
    // Filter rooms based on scheduledTimeCombined
    const live = rooms.filter(r => {
      if (!r.scheduledTimeCombined) return true;
      const scheduled = new Date(r.scheduledTimeCombined);
      return scheduled <= now;
    });
    
    const upcoming = rooms.filter(r => {
      if (!r.scheduledTimeCombined) return false;
      const scheduled = new Date(r.scheduledTimeCombined);
      return scheduled > now;
    });
    
    setLiveRooms(live);
    setUpcomingRooms(upcoming);
  };

  const handleError = (err: any) => {
    setLoading(false);
    setError('Failed to fetch game rooms');
    console.error('Socket error:', err);
  };

  socket.on('connect', () => {
    console.log('Connected to socket server');
    socket.emit('getGameRooms');
  });

  socket.on('gameRoomsList', handleGameRoomsList);
  socket.on('error', handleError);

  // Initial fetch
  if (socket.connected) {
    socket.emit('getGameRooms');
  }

  return () => {
    socket.off('gameRoomsList', handleGameRoomsList);
    socket.off('error', handleError);
  };
}, [socket]);

// Updated socket logic in HomePage.tsx

// useEffect(() => {
//   const socket = io('https://alu-globe-gameroom.onrender.com', {
//     transports: ['websocket'],
//     reconnection: true,
//   });

//   socket.on('connect', () => {
//     console.log('Connected to socket server');
//     socket.emit('getGameRooms');
//   });

//   socket.on('gameRoomsList', (payload: { rooms: GameRoom[] }) => {
//     setLoading(false);
//     const rooms = payload.rooms;
//     const now = new Date();
    
//     console.log('Received rooms:', rooms); // Debug log
    
//     // Filter rooms based on scheduledTimeCombined
//     const live = rooms.filter(r => {
//       // If no scheduledTimeCombined, it's a live room
//       if (!r.scheduledTimeCombined) {
//         console.log(`Room ${r.name} has no scheduled time - adding to live`);
//         return true;
//       }
      
//       const scheduled = new Date(r.scheduledTimeCombined);
//       const isLive = scheduled <= now;
//       console.log(`Room ${r.name} scheduled for ${scheduled.toLocaleString()}, current time: ${now.toLocaleString()}, isLive: ${isLive}`);
//       return isLive;
//     });
    
//     const upcoming = rooms.filter(r => {
//       // If no scheduledTimeCombined, it's not upcoming
//       if (!r.scheduledTimeCombined) {
//         return false;
//       }
      
//       const scheduled = new Date(r.scheduledTimeCombined);
//       const isUpcoming = scheduled > now;
//       console.log(`Room ${r.name} scheduled for ${scheduled.toLocaleString()}, current time: ${now.toLocaleString()}, isUpcoming: ${isUpcoming}`);
//       return isUpcoming;
//     });
    
//     console.log(`Live rooms: ${live.length}, Upcoming rooms: ${upcoming.length}`);
//     setLiveRooms(live);
//     setUpcomingRooms(upcoming);
//   });

//   socket.on('error', (err: any) => {
//     setLoading(false);
//     setError('Failed to fetch game rooms');
//     console.error('Socket error:', err);
//   });

//   return () => {
//     socket.disconnect();
//   };
// }, []);


  // Get current user ID (this should come from your auth context/store)
  const getCurrentUserId = () => {
    return (
      localStorage.getItem("playerId")
    );
  };



  const handleJoinRoom = (gameRoom: GameRoom) => {
    const { id: roomId, isPrivate, isInviteOnly } = gameRoom; // Note the alias here
    const playerId = getCurrentUserId();
    
    const payload = {
      roomId,  // Now correctly using the string ID
      playerId,
      password: undefined as string | undefined
    };
  
    if (isPrivate || isInviteOnly) {
      const password = prompt("Enter room password:");
      if (!password) return;
      payload.password = password;
    }
  
    if (!socket) {
      alert("Connection error. Please refresh and try again.");
      return;
    }
  
    const timeout = setTimeout(() => {
      navigate(`/game-room/${roomId}`);
    }, 5000);
  
    socket.emit("joinGame", payload);
    
    socket.once("playerJoined", (data: any) => {
      clearTimeout(timeout);
      const targetRoomId = data?.roomId || roomId;
      navigate(`/game-room/${targetRoomId}`);
    });
  
    socket.once("error", (error: any) => {
      clearTimeout(timeout);
      alert(typeof error === 'string' ? error : "Failed to join game room");
      console.error('Join error:', error);
    });
  };
  
  // const handleJoinRoom = (gameRoom: GameRoom) => {
  //   const { id, isPrivate, isInviteOnly } = gameRoom;
  //   const playerId = getCurrentUserId();
    
  //   const payload = {
  //     roomId: id,
  //     playerId,
  //     password: undefined as string | undefined
  //   };
  
  //   if (isPrivate || isInviteOnly) {
  //     const password = prompt("Enter room password:");
  //     if (!password) return;
  //     payload.password = password;
  //   }
  
  //   if (!socket) {
  //     alert("Connection error. Please refresh and try again.");
  //     return;
  //   }
  
  //   const timeout = setTimeout(() => {
  //     navigate(`/game-room/${id}`);
  //   }, 5000);
  
  //   socket.emit("joinGame", payload);
    
  //   socket.once("playerJoined", (data: any) => {
  //     clearTimeout(timeout);
  //     const targetRoomId = data?.roomId || id;
  //     navigate(`/game-room/${targetRoomId}`);
  //   });
  
  //   socket.once("error", (error: any) => {
  //     clearTimeout(timeout);
  //     alert(typeof error === 'string' ? error : "Failed to join game room");
  //   });
  // };


  // Updated join room handler that receives the game room as parameter
  // const handleJoinRoom = (gameRoom: GameRoom) => {
  //   const { id, isPrivate, isInviteOnly } = gameRoom;
  //   const playerId = getCurrentUserId();
    
  //   console.log(`Attempting to join room ${id} as player ${playerId}`);
  
  //   // Set up payload according to backend expectations
  //   const payload = {
  //     roomId: id,
  //     playerId,
  //     password: undefined as string | undefined
  //   };
  
  //   if (isPrivate || isInviteOnly) {
  //     const password = prompt("Enter room password:");
  //     if (!password) return;
  //     payload.password = password;
  //   }
  
  //   const socket = io("https://alu-globe-gameroom.onrender.com", {
  //     transports: ['websocket'],
  //     reconnection: true,
  //     autoConnect: false
  //   });
  
  //   // Set up timeout with more detailed logging
  //   const timeout = setTimeout(() => {
  //     console.error("Join timeout - Possible issues:", {
  //       roomId: id,
  //       connected: socket.connected,
  //       serverResponded: false
  //     });
      
  //     // Force navigation even if we don't get a response
  //     console.log("Forcing navigation to game room after timeout");
  //     navigate(`/game-room/${id}`);
      
  //     socket.disconnect();
  //   }, 5000); // Reduced timeout to 5 seconds
  
  //   // Event listeners
  //   socket.on("connect", () => {
  //     console.log("Socket connected, emitting joinGame with payload:", payload);
  //     socket.emit("joinGame", payload);
      
  //     // Add fallback navigation in case we don't get playerJoined event
  //     setTimeout(() => {
  //       if (!socket.hasListeners('playerJoined')) {
  //         console.log("Fallback navigation after emit");
  //         navigate(`/game-room/${id}`);
  //       }
  //     }, 5000); // Wait 5 seconds after emitting, 2 seconds disconnected earlier
  //   });
  
  //   socket.on("playerJoined", (data: any) => {
  //     console.log("playerJoined event received. Data:", data);
  //     clearTimeout(timeout);
      
  //     // Navigate using either the response roomId or our original id
  //     const targetRoomId = data?.roomId || id;
  //     console.log(`Navigating to /game-room/${targetRoomId}`);
  //     navigate(`/game-room/${targetRoomId}`);
      
  //     setTimeout(() => {
  //       socket.disconnect();
  //       console.log("Socket disconnected after navigation");
  //     }, 100);
  //   });
  
  //   socket.on("error", (error: any) => {
  //     console.error("Join error:", error);
  //     clearTimeout(timeout);
  //     alert(typeof error === 'string' ? error : "Failed to join game room");
      
  //     // Still navigate even on error (you might want to remove this if it's problematic)
  //     navigate(`/game-room/${id}`);
      
  //     socket.disconnect();
  //   });
  
  //   socket.on("connect_error", (error: any) => {
  //     console.error("Connection error:", error);
  //     clearTimeout(timeout);
  //     alert("Failed to connect to game server");
      
  //     // Still attempt navigation
  //     navigate(`/game-room/${id}`);
  //   });
  
  //   // Additional debug events
  //   socket.on("disconnect", (reason: any) => {
  //     console.log("Socket disconnected. Reason:", reason);
  //   });
  
  //   // Connect to socket
  //   console.log("Initiating socket connection...");
  //   socket.connect();
  // };
  
  

  return (
    <div className="p-6 overflow-y-auto h-screen pb-20">
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
              onClick={() => navigate("/create-game-room")}
              className="px-6 py-3 bg-white text-purple-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Create Game Room
            </button>
            <button
              onClick={() => navigate("/tournaments")}
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
          <SearchIcon
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search game rooms..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center">
          <FilterIcon size={20} className="mr-2" />
          <span>Filter</span>
        </button>
      </div>


      

      {/* Live Game Rooms */}
<section className="mb-12">
  <SectionTitle title="Live Game Rooms" subtitle="Join an active game room and start playing right away!" />
  {loading ? (
  <div className="flex justify-center py-8">
  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
</div>

  ) : error ? (
    <div className="text-center text-red-500 py-8">{error}</div>
  ) : liveRooms.length > 0 ? (
    <GameRoomList gameRooms={liveRooms} onJoinRoom={handleJoinRoom} />
  ) : (
    <div className="text-center py-8">No live game rooms available</div>
  )}
</section>

      {/* Upcoming Game Rooms */}
<section className="mb-12">
  <SectionTitle
    title="Upcoming Game Rooms"
    subtitle="Game rooms scheduled to start soon. Register now to get notified!"
  />
  {loading ? (
    <div className="flex justify-center py-8">
      <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ) : error ? (
    <div className="text-center text-red-500 py-8">{error}</div>
  ) : upcomingRooms.length > 0 ? (
    <GameRoomList gameRooms={upcomingRooms} onJoinRoom={handleJoinRoom} />
  ) : (
    <div className="text-center py-8 text-gray-400">No upcoming game rooms scheduled</div>
  )}
</section>


      {/* <section className="mb-12">
        <SectionTitle
          title="Upcoming Game Rooms"
          subtitle="Game rooms scheduled to start soon. Register now to get notified!"
        /> */}
        {/* <GameRoomList gameRooms={MOCK_UPCOMING_GAME_ROOMS} onJoinRoom={handleJoinRoom} /> */}
        {/* <GameRoomList gameRooms={upcomingRooms} onJoinRoom={handleJoinRoom} /> */}
      {/* </section> */}

      {/* Tournaments */}
      <section className="mb-12">
        <SectionTitle
          title="Tournaments"
          subtitle="Compete with other students and win exciting prizes!"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_TOURNAMENTS.map((tournament) => (
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
                      {tournament.gameType} • {tournament.participants}{" "}
                      Participants
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
    </div>
  );
};




