import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, FilterIcon, ChevronDownIcon, CheckIcon } from "lucide-react";
import io from "socket.io-client";
import { GameRoomList } from "../components/GameRoom/GameRoomList";
import { GameRoomJoinModal } from "../components/GameRoom/GameRoomJoinModal";
import { SectionTitle } from "../components/UI/SectionTitle";
import { useSocket } from "../SocketContext";
import { useAuth } from "../context/AuthContext";
import { GameRoom, Tournament, JoinRoomResponse } from '../types/gameroom'; 



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
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  // Add modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedGameRoom, setSelectedGameRoom] = useState<GameRoom | null>(null);
  
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [liveRooms, setLiveRooms] = useState<GameRoom[]>([]);
  const [upcomingRooms, setUpcomingRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socket = useSocket();
  const { user } = useAuth();
  const [playerIdToUsername, setPlayerIdToUsername] = useState<Record<string, string>>({});

  // Fetch game rooms when socket is available
  useEffect(() => {
    if (!socket) return;

    const handleGameRoomsList = (payload: { rooms: GameRoom[] }) => {
      setLoading(false);
      const rooms = payload.rooms;
      const now = new Date();
      
      console.log('HomePage - Received rooms from backend:', rooms);
      console.log('HomePage - Sample room structure:', rooms[0]);
      
      // Build playerIdToUsername mapping from room data
      const usernameMap: Record<string, string> = {};
      rooms.forEach(room => {
        console.log('HomePage - Processing room:', { 
          roomId: room.id, 
          host: room.host, 
          hostName: room.hostName,
          hasHost: !!room.host,
          hasHostName: !!room.hostName
        });
        
        if (room.host && room.hostName) {
          usernameMap[room.host] = room.hostName;
          console.log('HomePage - Added to usernameMap:', room.host, '->', room.hostName);
        }
        // Also add current user's mapping if available
        if (user?.id && user?.username) {
          usernameMap[user.id] = user.username;
          console.log('HomePage - Added current user to usernameMap:', user.id, '->', user.username);
        }
      });
      
      console.log('HomePage - Final usernameMap:', usernameMap);
      setPlayerIdToUsername(usernameMap);
      
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

  // Filter options
  const filterOptions = [
    { id: 'public', label: 'Public Rooms', description: 'Open to everyone' },
    { id: 'private', label: 'Private Rooms', description: 'Password protected' },
    { id: 'latest', label: 'Latest Created', description: 'Recently created rooms' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and search logic
  const filterRooms = useMemo(() => {
    return (rooms: GameRoom[]) => {
      let filteredRooms = [...rooms];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredRooms = filteredRooms.filter(room => 
          room.name.toLowerCase().includes(query) ||
          room.gameType.toLowerCase().includes(query) ||
          room.hostName.toLowerCase().includes(query)
        );
      }

      // Apply visibility filters
      if (activeFilters.length > 0) {
        filteredRooms = filteredRooms.filter(room => {
          const isPublic = !room.isPrivate;
          const isPrivate = room.isPrivate;
          
          // Check if room matches any active filter
          return activeFilters.some(filter => {
            switch (filter) {
              case 'public':
                return isPublic;
              case 'private':
                return isPrivate;
              case 'latest':
                return true; // We'll sort by latest after filtering
              default:
                return true;
            }
          });
        });

        // Sort by latest if latest filter is active
        if (activeFilters.includes('latest')) {
          filteredRooms = filteredRooms.sort((a, b) => {
            const dateA = new Date(a.scheduledTimeCombined || Date.now()).getTime();
            const dateB = new Date(b.scheduledTimeCombined || Date.now()).getTime();
            return dateB - dateA; // Most recent first
          });
        }
      }

      return filteredRooms;
    };
  }, [searchQuery, activeFilters]);

  // Apply filters to room lists
  const filteredLiveRooms = useMemo(() => filterRooms(liveRooms), [liveRooms, filterRooms]);
  const filteredUpcomingRooms = useMemo(() => filterRooms(upcomingRooms), [upcomingRooms, filterRooms]);

  // Toggle filter selection
  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchQuery("");
  };

  // Updated handleJoinRoom function to open modal
  const handleJoinRoom = async (gameRoom: GameRoom) => {
    if (!user) {
      alert("Please login to join a game room");
      navigate('/login', { state: { from: `/game-room/${gameRoom.id}` } });
      return;
    }

    if (!socket) {
      alert("Connection error. Please refresh and try again.");
      return;
    }

    // Check if current user is the host of this room
    const isCurrentUserHost = String(user.id) === String(gameRoom.host);
    
    if (isCurrentUserHost) {
      // Host should directly navigate to their room
      console.log(`Host ${user.username} joining their own room ${gameRoom.id}`);
      navigate(`/game-room/${gameRoom.id}`);
      return;
    }

    // For non-hosts, open modal to choose player/spectator
    setSelectedGameRoom(gameRoom);
    setIsJoinModalOpen(true);
  };

  // New function to handle actual joining with player/spectator option
  const handleModalJoin = async (gameRoom: GameRoom, joinAsPlayer: boolean, password?: string) => {
    const { id } = gameRoom;
    
    console.log(`Attempting to join room ${id} as ${joinAsPlayer ? 'player' : 'spectator'} ${user?.id}`);
    
    try {
      const payload = {
        roomId: id,
        playerId: user?.id,
        playerName: user?.username,
        joinAsPlayer,
        password: password || undefined
      };

      // Create a promise with proper typing
      const joinRoom = new Promise<JoinRoomResponse>((resolve, reject) => {
        const handleJoinSuccess = (data: JoinRoomResponse) => {
          cleanupListeners();
          resolve(data);
        };

        const handleJoinError = (error: any) => {
          cleanupListeners();
          reject(error);
        };

        const cleanupListeners = () => {
          socket?.off("playerJoined", handleJoinSuccess);
          socket?.off("spectatorJoined", handleJoinSuccess);
          socket?.off("error", handleJoinError);
        };

        const timeout = setTimeout(() => {
          cleanupListeners();
          reject(new Error("Join operation timed out"));
        }, 10000);

        // Listen for both player and spectator join events
        socket?.on("playerJoined", (data: JoinRoomResponse) => {
          clearTimeout(timeout);
          handleJoinSuccess(data);
        });

        socket?.on("spectatorJoined", (data: JoinRoomResponse) => {
          clearTimeout(timeout);
          handleJoinSuccess(data);
        });

        socket?.on("error", (err: any) => {
          clearTimeout(timeout);
          handleJoinError(err);
        });

        // Emit appropriate event based on join type
        socket?.emit(joinAsPlayer ? "joinGame" : "joinAsSpectator", payload);
      });

      const result = await joinRoom;
      console.log("Successfully joined room:", result);
      
      // Close modal and navigate
      setIsJoinModalOpen(false);
      setSelectedGameRoom(null);
      
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
            {/* <button
              onClick={() => navigate("/tournaments")}
              className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Join Tournament
            </button> */}
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
        {/* Search Input */}
        <div className="relative flex-1 min-w-[300px]">
          <SearchIcon
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by room name, game type, or host..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative" ref={filterDropdownRef}>
          <button 
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center min-w-[120px] justify-between"
          >
            <div className="flex items-center">
              <FilterIcon size={20} className="mr-2" />
              <span>Filter</span>
              {activeFilters.length > 0 && (
                <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                  {activeFilters.length}
                </span>
              )}
            </div>
            <ChevronDownIcon 
              size={16} 
              className={`ml-2 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Dropdown Menu */}
          {isFilterDropdownOpen && (
            <div className="absolute top-full left-[-120px] mt-2 w-60 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 py-2">
              {/* Header */}
              <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-medium">Filter Game Rooms</h3>
                {activeFilters.length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Filter Options */}
              <div className="py-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleFilter(option.id)}
                    className="w-full px-4 py-3 hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">{option.label}</div>
                      <div className="text-gray-400 text-sm">{option.description}</div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      activeFilters.includes(option.id)
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-600 group-hover:border-gray-500'
                    }`}>
                      {activeFilters.includes(option.id) && (
                        <CheckIcon size={12} className="text-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(activeFilters.length > 0 || searchQuery) && (
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <span className="text-gray-400 text-sm">Active filters:</span>
          {searchQuery && (
            <div className="bg-purple-600/20 border border-purple-600/50 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center">
              Search: "{searchQuery}"
              <button
                onClick={() => setSearchQuery("")}
                className="ml-2 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}
          {activeFilters.map(filterId => {
            const option = filterOptions.find(opt => opt.id === filterId);
            return (
              <div key={filterId} className="bg-purple-600/20 border border-purple-600/50 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center">
                {option?.label}
                <button
                  onClick={() => toggleFilter(filterId)}
                  className="ml-2 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            onClick={clearAllFilters}
            className="text-gray-400 hover:text-white text-sm underline transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Live Game Rooms */}
      <section className="mb-12">
        <SectionTitle 
          title={`Live Game Rooms${filteredLiveRooms.length !== liveRooms.length ? ` (${filteredLiveRooms.length} of ${liveRooms.length})` : ''}`}
          subtitle="Join an active game room and start playing right away!" 
        />
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : filteredLiveRooms.length > 0 ? (
          <GameRoomList gameRooms={filteredLiveRooms} onJoinRoom={handleJoinRoom} playerIdToUsername={playerIdToUsername} />
        ) : liveRooms.length > 0 ? (
          <div className="text-center py-8 text-gray-400">
            No rooms match your current filters. 
            <button 
              onClick={clearAllFilters} 
              className="text-purple-400 hover:text-purple-300 underline ml-1 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">No live game rooms available</div>
        )}
      </section>

      {/* Upcoming Game Rooms */}
      <section className="mb-12">
        <SectionTitle
          title={`Upcoming Game Rooms${filteredUpcomingRooms.length !== upcomingRooms.length ? ` (${filteredUpcomingRooms.length} of ${upcomingRooms.length})` : ''}`}
          subtitle="Game rooms scheduled to start soon. Register now to get notified!"
        />
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : filteredUpcomingRooms.length > 0 ? (
          <GameRoomList gameRooms={filteredUpcomingRooms} onJoinRoom={handleJoinRoom} playerIdToUsername={playerIdToUsername} />
        ) : upcomingRooms.length > 0 ? (
          <div className="text-center py-8 text-gray-400">
            No rooms match your current filters. 
            <button 
              onClick={clearAllFilters} 
              className="text-purple-400 hover:text-purple-300 underline ml-1 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">No upcoming game rooms scheduled</div>
        )}
      </section>


    

      {/* Tournaments */}
      {/* <section className="mb-12">
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
      </section> */}

      {/* Add the GameRoomJoinModal at the end before closing div */}
      <GameRoomJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false);
          setSelectedGameRoom(null);
        }}
        gameRoom={selectedGameRoom}
        onJoin={handleModalJoin}
      />
    </div>
  );
};

