import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon, FilterIcon, ChevronDownIcon, CheckIcon, SunIcon, MoonIcon, XIcon, DicesIcon, PlusCircleIcon, BarChart3Icon, UserIcon, MessageCircleIcon } from "lucide-react";
import io from "socket.io-client";
import { GameRoomList } from "../components/GameRoom/GameRoomList";
import { GameRoomListSkeleton } from "../components/GameRoom/GameRoomListSkeleton";
import { GameRoomJoinModal } from "../components/GameRoom/GameRoomJoinModal";
import { SectionTitle } from "../components/UI/SectionTitle";
import { useSocket } from "../SocketContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { GameRoom, Tournament, JoinRoomResponse } from '../types/gameroom';
import { useUserData } from "../hooks/useUserData"; 



// Trivia categories for Start Game Room section (matches CreateGameRoomPage)
const TRIVIA_CATEGORIES = [
  { value: 'general', label: 'General Knowledge' },
  { value: 'science', label: 'Science' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'technology', label: 'Technology' },
  { value: 'literature', label: 'Literature' },
  { value: 'music', label: 'Music' },
  { value: 'art', label: 'Art & Design' },
  { value: 'politics', label: 'Politics' },
  { value: 'nature', label: 'Nature & Animals' },
  { value: 'movies', label: 'Movies & TV' },
  { value: 'food', label: 'Food & Cooking' },
  { value: 'mythology', label: 'Mythology' },
];

// Sleek per-card colors: light mode (soft, muted) and dark mode (rich, deep)
const CARD_COLORS_LIGHT: { bg: string; border: string; text: string; hover: string }[] = [
  { bg: '#f1f5f9', border: '#cbd5e1', text: '#0f172a', hover: '#e2e8f0' },
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', hover: '#dbeafe' },
  { bg: '#fffbeb', border: '#fde68a', text: '#78350f', hover: '#fef3c7' },
  { bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a', hover: '#ccfbf1' },
  { bg: '#fdf2f8', border: '#f9a8d4', text: '#831843', hover: '#fce7f3' },
  { bg: '#f0fdf4', border: '#86efac', text: '#14532d', hover: '#dcfce7' },
  { bg: '#eef2ff', border: '#a5b4fc', text: '#312e81', hover: '#e0e7ff' },
  { bg: '#fff1f2', border: '#fda4af', text: '#881337', hover: '#ffe4e6' },
  { bg: '#f5f3ff', border: '#c4b5fd', text: '#4c1d95', hover: '#ede9fe' },
  { bg: '#fff7ed', border: '#fdba74', text: '#7c2d12', hover: '#ffedd5' },
  { bg: '#f1f5f9', border: '#94a3b8', text: '#1e293b', hover: '#e2e8f0' },
  { bg: '#ecfdf5', border: '#6ee7b7', text: '#064e3b', hover: '#d1fae5' },
  { bg: '#fdf4ff', border: '#e9d5ff', text: '#701a75', hover: '#fae8ff' },
  { bg: '#f7fee7', border: '#bef264', text: '#422006', hover: '#ecfccb' },
  { bg: '#fefce8', border: '#fde047', text: '#713f12', hover: '#fef9c3' },
];
const CARD_COLORS_DARK: { bg: string; border: string; text: string; hover: string }[] = [
  { bg: '#1e293b', border: '#334155', text: '#e2e8f0', hover: '#334155' },
  { bg: '#1e3a8a', border: '#2563eb', text: '#bfdbfe', hover: '#1d4ed8' },
  { bg: '#78350f', border: '#b45309', text: '#fef3c7', hover: '#92400e' },
  { bg: '#134e4a', border: '#0d9488', text: '#99f6e4', hover: '#0f766e' },
  { bg: '#831843', border: '#be185d', text: '#fbcfe8', hover: '#9d174d' },
  { bg: '#14532d', border: '#15803d', text: '#86efac', hover: '#166534' },
  { bg: '#312e81', border: '#4f46e5', text: '#a5b4fc', hover: '#3730a3' },
  { bg: '#881337', border: '#be123c', text: '#fda4af', hover: '#9f1239' },
  { bg: '#4c1d95', border: '#6d28d9', text: '#c4b5fd', hover: '#5b21b6' },
  { bg: '#7c2d12', border: '#c2410c', text: '#fdba74', hover: '#9a3412' },
  { bg: '#334155', border: '#475569', text: '#cbd5e1', hover: '#475569' },
  { bg: '#064e3b', border: '#059669', text: '#6ee7b7', hover: '#047857' },
  { bg: '#701a75', border: '#a21caf', text: '#e9d5ff', hover: '#86198f' },
  { bg: '#422006', border: '#ca8a04', text: '#fef08a', hover: '#a16207' },
  { bg: '#713f12', border: '#d97706', text: '#fde047', hover: '#b45309' },
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
  const { theme, toggleTheme } = useTheme();
  const [playerIdToUsername, setPlayerIdToUsername] = useState<Record<string, string>>({});
  const [isJoining, setIsJoining] = useState(false);

  // Derive "online" users from live game rooms (host + players), frontend-only
  const onlineUserIds = useMemo(() => {
    const ids = new Set<string>();
    const currentId = user?.id ? String(user.id) : null;
    liveRooms.forEach((room) => {
      if (room.host) ids.add(room.host);
      (room.playerIds || []).forEach((id) => ids.add(id));
    });
    if (currentId) ids.delete(currentId);
    return Array.from(ids);
  }, [liveRooms, user?.id]);

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

 
 
const handleModalJoin = async (gameRoom: GameRoom, joinAsPlayer: boolean, password?: string) => {
  const { id } = gameRoom;

  if (isJoining) return;

  setIsJoining(true); 
  
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

    
    console.log('Room joined successfully. UNO join will be handled in game room page if needed.');
    
    // Close modal and navigate
    setIsJoinModalOpen(false);
    setSelectedGameRoom(null);
    
    const targetRoomId = result.roomId || id;
    navigate(`/game-room/${targetRoomId}`);

  } catch (error) {
    console.error("Join error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to join game room";
    alert(errorMessage);
  } finally {
    setIsJoining(false); 
  }
};
  

  

  // Online Friends Component
  const OnlineFriends = () => {
    return (
      <div className={`rounded-lg border p-4 ${
        theme === 'light' 
          ? 'bg-white border-gray-300' 
          : 'bg-gray-800/50 border-gray-700'
      }`}>
        <h3 className={`text-sm font-semibold mb-3 ${
          theme === 'light' ? 'text-black' : 'text-white'
        }`}>
          Online Friends
        </h3>
        {onlineUserIds.length === 0 ? (
          <p className={`text-xs ${
            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            No one online in game rooms
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {onlineUserIds.slice(0, 8).map((userId) => (
              <OnlineFriendItem key={userId} friendId={userId} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Online Friend Item Component
  const OnlineFriendItem = ({ friendId }: { friendId: string }) => {
    const { username, avatar } = useUserData(friendId);
    
    return (
      <div className="flex flex-col items-center">
        <img
          src={avatar}
          alt={username}
          className="w-10 h-10 rounded-full border-2 border-green-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId}`;
          }}
        />
        <span className={`text-xs mt-1 text-center max-w-[60px] truncate ${
          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
        }`}>
          {username}
        </span>
      </div>
    );
  };

  return (
    <div className={`p-6 overflow-y-auto h-screen pb-20 ${theme === 'light' ? 'bg-[#ffffff]' : ''}`}>
      {/* Online Friends below AppBar on Small Devices */}
      <div className="lg:hidden -mt-2 mb-3 md:mb-6">
        <OnlineFriends />
      </div>

      {/* Hero Banner - Hidden on Small Devices */}
      <div className={`hidden lg:block relative rounded-2xl p-8 mb-8 overflow-hidden ${
        theme === 'light' 
          ? 'bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed]' 
          : 'bg-gradient-to-r from-purple-900 to-indigo-900'
      }`}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2071')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10">
          <h1 className={`text-4xl font-bold mb-2 ${theme === 'light' ? 'text-white' : 'text-white'}`}>Arena Game Room</h1>
          <p className={`text-xl mb-6 ${theme === 'light' ? 'text-white/90' : 'text-gray-200'}`}>
            Play, compete, and connect with fellow students!
          </p>
          <div className="flex space-x-4 items-start">
            <button
              onClick={() => navigate("/create-game-room")}
              className={`px-6 py-3 font-medium rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'bg-white text-[#8b5cf6] hover:bg-gray-100' 
                  : 'bg-white text-purple-900 hover:bg-gray-100'
              }`}
            >
              Create Game Room
            </button>
            <button
              onClick={() => navigate("/instant-game")}
              className={`px-6 py-3 text-white font-medium rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'bg-white/20 hover:bg-white/30 border border-white/30' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Instant Game
            </button>
            {/* Online Friends next to Instant Game button on Large Screens */}
            <div className="hidden lg:block ml-4">
              <OnlineFriends />
            </div>
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
          <div className={`w-16 h-16 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl animate-float ${
            theme === 'light' ? 'bg-white/30' : 'bg-white/20'
          }`}>
            ♟️
          </div>
          <div className={`w-16 h-16 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl animate-float-delay-1 ${
            theme === 'light' ? 'bg-white/30' : 'bg-white/20'
          }`}>
            🎯
          </div>
          <div className={`w-16 h-16 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl animate-float-delay-2 ${
            theme === 'light' ? 'bg-white/30' : 'bg-white/20'
          }`}>
            🎮
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-nowrap sm:flex-wrap gap-2 sm:gap-4 mb-3 md:mb-8">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0 sm:min-w-[300px]">
          <SearchIcon
            size={20}
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            placeholder="Search by room name, game type, or host..."
            className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none transition-colors ${
              theme === 'light' 
                ? 'bg-white border border-[#b4b4b4] focus:ring-2 focus:ring-[#8b5cf6] text-black' 
                : 'bg-gray-800/50 border border-gray-700 focus:ring-2 focus:ring-purple-500 text-white'
            }`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                theme === 'light' ? 'text-[#b4b4b4] hover:text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0" ref={filterDropdownRef}>
          <button 
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className={`border rounded-lg transition-colors flex items-center justify-center sm:justify-between w-10 h-10 sm:w-auto sm:min-w-[120px] sm:px-4 sm:py-3 ${
              theme === 'light' 
                ? 'bg-white border-[#b4b4b4] hover:bg-gray-50 text-black' 
                : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 text-white'
            }`}
          >
            <div className="flex items-center relative">
              <FilterIcon size={20} className="sm:mr-2" />
              {activeFilters.length > 0 && (
                <span className={`absolute -top-1 -right-1 sm:static sm:ml-2 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full min-w-[18px] text-center ${
                  theme === 'light' ? 'bg-[#8b5cf6]' : 'bg-purple-600'
                }`}>
                  {activeFilters.length}
                </span>
              )}
              <span className="hidden sm:inline">Filter</span>
            </div>
            <ChevronDownIcon 
              size={16} 
              className={`hidden sm:block ml-2 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Dropdown Menu */}
          {isFilterDropdownOpen && (
            <div className={`absolute top-full left-0 md:left-[-130px] mt-2 w-60 border rounded-lg shadow-2xl z-50 py-2 ${
              theme === 'light' 
                ? 'bg-white border-[#b4b4b4]' 
                : 'bg-gray-800 border-gray-700'
            }`}>
              {/* Header */}
              <div className={`px-4 py-2 border-b flex justify-between items-center ${
                theme === 'light' ? 'border-[#b4b4b4]' : 'border-gray-700'
              }`}>
                <h3 className={`font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>Filter Game Rooms</h3>
                {activeFilters.length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className={`text-sm transition-colors ${
                      theme === 'light' ? 'text-[#8b5cf6] hover:text-[#7c3aed]' : 'text-purple-400 hover:text-purple-300'
                    }`}
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
                    className={`w-full px-4 py-3 transition-colors flex items-center justify-between group ${
                      theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>{option.label}</div>
                      <div className={`text-sm ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>{option.description}</div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      activeFilters.includes(option.id)
                        ? theme === 'light' 
                          ? 'bg-[#8b5cf6] border-[#8b5cf6]' 
                          : 'bg-purple-600 border-purple-600'
                        : theme === 'light'
                          ? 'border-[#b4b4b4] group-hover:border-[#8b5cf6]'
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
        <div className="mb-3 md:mb-6 flex flex-wrap gap-2 items-center">
          <span className={`text-sm ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>Active filters:</span>
          {searchQuery && (
            <div className={`border px-3 py-1 rounded-full text-sm flex items-center ${
              theme === 'light' 
                ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#8b5cf6]' 
                : 'bg-purple-600/20 border-purple-600/50 text-purple-300'
            }`}>
              Search: "{searchQuery}"
              <button
                onClick={() => setSearchQuery("")}
                className={`ml-2 transition-colors ${
                  theme === 'light' ? 'hover:text-black' : 'hover:text-white'
                }`}
              >
                ✕
              </button>
            </div>
          )}
          {activeFilters.map(filterId => {
            const option = filterOptions.find(opt => opt.id === filterId);
            return (
              <div key={filterId} className={`border px-3 py-1 rounded-full text-sm flex items-center ${
                theme === 'light' 
                  ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#8b5cf6]' 
                  : 'bg-purple-600/20 border-purple-600/50 text-purple-300'
              }`}>
                {option?.label}
                <button
                  onClick={() => toggleFilter(filterId)}
                  className={`ml-2 transition-colors ${
                    theme === 'light' ? 'hover:text-black' : 'hover:text-white'
                  }`}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            onClick={clearAllFilters}
            className={`text-sm underline transition-colors ${
              theme === 'light' ? 'text-[#b4b4b4] hover:text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Start Game Room - Trivia categories */}
      <section className="mb-4 md:mb-12">
        <SectionTitle
          title="Start Game Room"
          subtitle="Create a new trivia game room"
        />
        <div className="overflow-x-auto overflow-y-hidden -mx-2 px-2 pb-2">
          <div
            className="inline-grid gap-3 pr-2"
            style={{
              gridAutoFlow: 'column',
              gridTemplateRows: 'repeat(2, 1fr)',
              gridAutoColumns: 'minmax(140px, 180px)',
            }}
          >
            {TRIVIA_CATEGORIES.map((cat, idx) => {
              const colors = theme === 'light' ? CARD_COLORS_LIGHT[idx % CARD_COLORS_LIGHT.length]! : CARD_COLORS_DARK[idx % CARD_COLORS_DARK.length]!;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => navigate('/create-game-room', { state: { category: cat.value } })}
                  className="h-14 rounded-xl border text-left px-4 py-2 transition-all duration-200 flex items-center shrink-0 hover:brightness-110 hover:shadow-md active:scale-[0.98]"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <span className="text-sm font-medium truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Game Rooms */}
      <section className="mb-4 md:mb-12">
        <SectionTitle 
          title={`Live Game Rooms${filteredLiveRooms.length !== liveRooms.length ? ` (${filteredLiveRooms.length} of ${liveRooms.length})` : ''}`}
          subtitle="Join an active game room and start playing right away!" 
        />
        {loading ? (
          <GameRoomListSkeleton />
        ) : error ? (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-[#ff0000]' : 'text-red-500'}`}>{error}</div>
        ) : filteredLiveRooms.length > 0 ? (
          <GameRoomList gameRooms={filteredLiveRooms} onJoinRoom={handleJoinRoom} playerIdToUsername={playerIdToUsername} />
        ) : liveRooms.length > 0 ? (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>
            No rooms match your current filters. 
            <button 
              onClick={clearAllFilters} 
              className={`underline ml-1 transition-colors ${
                theme === 'light' ? 'text-[#8b5cf6] hover:text-[#7c3aed]' : 'text-purple-400 hover:text-purple-300'
              }`}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>No live game rooms available</div>
        )}
      </section>

      {/* Upcoming Game Rooms */}
      <section className="mb-4 md:mb-12">
        <SectionTitle
          title={`Upcoming Game Rooms${filteredUpcomingRooms.length !== upcomingRooms.length ? ` (${filteredUpcomingRooms.length} of ${upcomingRooms.length})` : ''}`}
          subtitle="Game rooms scheduled to start soon. Register now to get notified!"
        />
        {loading ? (
          <GameRoomListSkeleton />
        ) : error ? (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-[#ff0000]' : 'text-red-500'}`}>{error}</div>
        ) : filteredUpcomingRooms.length > 0 ? (
          <GameRoomList gameRooms={filteredUpcomingRooms} onJoinRoom={handleJoinRoom} playerIdToUsername={playerIdToUsername} />
        ) : upcomingRooms.length > 0 ? (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>
            No rooms match your current filters. 
            <button 
              onClick={clearAllFilters} 
              className={`underline ml-1 transition-colors ${
                theme === 'light' ? 'text-[#8b5cf6] hover:text-[#7c3aed]' : 'text-purple-400 hover:text-purple-300'
              }`}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>No upcoming game rooms scheduled</div>
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
        isLoading={isJoining}
      />
    </div>
  );
};

