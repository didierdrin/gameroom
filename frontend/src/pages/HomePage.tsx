import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, FilterIcon } from "lucide-react";
import io from "socket.io-client";
import { GameRoomList } from "../components/GameRoom/GameRoomList";
import { SectionTitle } from "../components/UI/SectionTitle";
import { useSocket } from "../SocketContext";
import { useAuth } from "../context/AuthContext";

interface GameRoom {
  id: string;
  roomId: string; 
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


interface JoinRoomResponse {
  roomId: string;
  // Add other properties you expect in the response
  success: boolean;
  message?: string;
}


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
  const { user } = useAuth();

  // Fetch game rooms when socket is available
  useEffect(() => {
    if (!socket) return;

    const handleGameRoomsList = (payload: { rooms: GameRoom[] }) => {
      setLoading(false);
      const rooms = payload.rooms;
      const now = new Date();
      
      console.log('Received rooms:', rooms);
      
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

  // Get current user ID
  // const getCurrentUserId = () => {
  //   return localStorage.getItem("userId");
  // };

  // FIXED: handleJoinRoom function
  
// Then update the handleJoinRoom function
const handleJoinRoom = async (gameRoom: GameRoom) => {
  const { id, isPrivate, isInviteOnly } = gameRoom;
  
  if (!user) {
    alert("Please login to join a game room");
    navigate('/login', { state: { from: `/game-room/${id}` } });
    return;
  }

  if (!socket) {
    alert("Connection error. Please refresh and try again.");
    return;
  }

  console.log(`Attempting to join room ${id} as player ${user.id}`);
  
  try {
    const payload = {
      roomId: id,
      playerId: user.id,
      playerName: user.username,
      password: undefined as string | undefined
    };

    if (isPrivate || isInviteOnly) {
      const password = prompt("Enter room password:");
      if (!password) return;
      payload.password = password;
    }

    // Create a promise with proper typing
    const joinRoom = new Promise<JoinRoomResponse>((resolve, reject) => {
      const handlePlayerJoined = (data: JoinRoomResponse) => {
        cleanupListeners();
        resolve(data);
      };

      const handleJoinError = (error: any) => {
        cleanupListeners();
        reject(error);
      };

      const cleanupListeners = () => {
        socket.off("playerJoined", handlePlayerJoined);
        socket.off("error", handleJoinError);
      };

      const timeout = setTimeout(() => {
        cleanupListeners();
        reject(new Error("Join operation timed out"));
      }, 10000);

      socket.on("playerJoined", (data: JoinRoomResponse) => {
        clearTimeout(timeout);
        handlePlayerJoined(data);
      });

      socket.on("error", (err:any) => {
        clearTimeout(timeout);
        handleJoinError(err);
      });

      socket.emit("joinGame", payload);
    });

    const result = await joinRoom;
    console.log("Successfully joined room:", result);
    
    // Now TypeScript knows result has roomId property
    const targetRoomId = result.roomId || id;
    navigate(`/game-room/${targetRoomId}`);

  } catch (error) {
    console.error("Join error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to join game room";
    alert(errorMessage);
  }
};
  

  

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




