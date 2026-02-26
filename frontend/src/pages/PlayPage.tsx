import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateGameRoomPage } from './CreateGameRoomPage';
import { GameRoomList } from '../components/GameRoom/GameRoomList';
import { GameRoomJoinModal } from '../components/GameRoom/GameRoomJoinModal';
import { useSocket } from '../SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GameRoom, JoinRoomResponse } from '../types/gameroom';

type PlayTab = 'create' | 'live';

export const PlayPage = () => {
  const [activeTab, setActiveTab] = useState<PlayTab>('create');
  const [liveRooms, setLiveRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerIdToUsername, setPlayerIdToUsername] = useState<Record<string, string>>({});
  const [selectedGameRoom, setSelectedGameRoom] = useState<GameRoom | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (!socket) return;

    const handleGameRoomsList = (payload: { rooms: GameRoom[] }) => {
      setLoading(false);
      const rooms = payload.rooms;
      const now = new Date();
      const usernameMap: Record<string, string> = {};
      rooms.forEach((room) => {
        if (room.host && room.hostName) usernameMap[room.host] = room.hostName;
        if (user?.id && user?.username) usernameMap[user.id] = user.username;
      });
      setPlayerIdToUsername(usernameMap);
      const live = rooms.filter((r) => {
        if (!r.scheduledTimeCombined) return true;
        return new Date(r.scheduledTimeCombined) <= now;
      });
      setLiveRooms(live);
    };

    socket.on('connect', () => socket.emit('getGameRooms'));
    socket.on('gameRoomsList', handleGameRoomsList);
    if (socket.connected) socket.emit('getGameRooms');

    return () => {
      socket.off('gameRoomsList', handleGameRoomsList);
    };
  }, [socket, user?.id, user?.username]);

  const handleJoinRoom = useCallback(
    async (gameRoom: GameRoom) => {
      if (!user) {
        navigate('/login', { state: { from: `/game-room/${gameRoom.id}` } });
        return;
      }
      if (!socket) {
        alert('Connection error. Please refresh and try again.');
        return;
      }
      if (gameRoom.host === user.id) {
        navigate(`/game-room/${gameRoom.id}`);
        return;
      }
      setSelectedGameRoom(gameRoom);
      setIsJoinModalOpen(true);
    },
    [user, socket, navigate]
  );

  const handleModalJoin = useCallback(
    async (gameRoom: GameRoom, joinAsPlayer: boolean, password?: string) => {
      if (!user || isJoining || !socket) return;
      setIsJoining(true);

      try {
        const payload = {
          roomId: gameRoom.id,
          playerId: user.id,
          playerName: user.username,
          joinAsPlayer,
          password: password || undefined,
        };

        const result = await new Promise<JoinRoomResponse>((resolve, reject) => {
          const cleanup = () => {
            socket.off('playerJoined', onSuccess);
            socket.off('spectatorJoined', onSuccess);
            socket.off('error', onError);
          };
          const onSuccess = (data: JoinRoomResponse) => {
            cleanup();
            resolve(data);
          };
          const onError = (err: { message?: string }) => {
            cleanup();
            reject(new Error(err?.message || 'Failed to join'));
          };
          const t = setTimeout(() => {
            cleanup();
            reject(new Error('Join timed out'));
          }, 10000);

          socket.once('playerJoined', (data: JoinRoomResponse) => {
            clearTimeout(t);
            resolve(data);
          });
          socket.once('spectatorJoined', (data: JoinRoomResponse) => {
            clearTimeout(t);
            resolve(data);
          });
          socket.once('error', onError);
          socket.emit(joinAsPlayer ? 'joinGame' : 'joinAsSpectator', payload);
        });

        setIsJoinModalOpen(false);
        setSelectedGameRoom(null);
        navigate(`/game-room/${result.roomId || gameRoom.id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to join room');
      } finally {
        setIsJoining(false);
      }
    },
    [user, socket, navigate, isJoining]
  );

  const tabButton =
    'px-4 py-2 rounded-t-lg font-medium text-sm transition-colors';
  const tabActive =
    theme === 'light'
      ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border-b-2 border-[#8b5cf6]'
      : 'bg-purple-900/40 text-purple-400 border-b-2 border-purple-400';
  const tabInactive =
    theme === 'light'
      ? 'text-[#6b7280] hover:bg-white/50'
      : 'text-gray-400 hover:bg-gray-700';

  return (
    <div className="flex flex-col h-full">
      {/* Top tabs */}
      <div
        className={`flex border-b shrink-0 ${
          theme === 'light' ? 'border-[#b4b4b4]' : 'border-gray-700'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`${tabButton} ${activeTab === 'create' ? tabActive : tabInactive}`}
        >
          Create game
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`${tabButton} ${activeTab === 'live' ? tabActive : tabInactive}`}
        >
          Live game room
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'create' && (
          <CreateGameRoomPage onGameCreated={() => setActiveTab('live')} />
        )}
        {activeTab === 'live' && (
          <div className="p-4">
            {loading ? (
              <p
                className={
                  theme === 'light' ? 'text-[#6b7280]' : 'text-gray-400'
                }
              >
                Loading rooms...
              </p>
            ) : liveRooms.length === 0 ? (
              <p
                className={
                  theme === 'light' ? 'text-[#6b7280]' : 'text-gray-400'
                }
              >
                No live game rooms. Create one in the Create game tab.
              </p>
            ) : (
              <GameRoomList
                gameRooms={liveRooms}
                onJoinRoom={handleJoinRoom}
                playerIdToUsername={playerIdToUsername}
              />
            )}
          </div>
        )}
      </div>

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
