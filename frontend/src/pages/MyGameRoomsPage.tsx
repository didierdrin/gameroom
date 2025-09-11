import React, { useEffect, useState } from 'react';
import { useSocket } from '../SocketContext';
import { useAuth } from '../context/AuthContext';
import { GameRoomList } from '../components/GameRoom/GameRoomList';
import { SectionTitle } from '../components/UI/SectionTitle';

interface GameRoom {
  id: string;
  roomId: string;
  name: string;
  gameType: string;
  host: string; // Backend sends 'host' field, not 'hostId'
  hostName: string;
  hostAvatar: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  isInviteOnly: boolean;
  status: 'waiting' | 'in-progress' | 'completed';
  scheduledTimeCombined?: string;
  createdAt: string;
}

export const MyGameRoomsPage: React.FC<{ onJoinRoom: (roomId: string) => void }> = ({ onJoinRoom }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState<'joined' | 'hosted'>('joined');
  const [hostedRooms, setHostedRooms] = useState<GameRoom[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<GameRoom[]>([]);
  const [playerIdToUsername, setPlayerIdToUsername] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !socket) return;

    socket.emit('getMyGameRooms', { playerId: user.id });

    socket.on('myGameRoomsList', (data: { hosted: GameRoom[]; joined: GameRoom[] }) => {
      // Sort joined rooms by createdAt (descending)
      const sortedJoined = [...data.joined].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log('MyGameRoomsPage - Received data from backend:', data);
      console.log('MyGameRoomsPage - Sample hosted room:', data.hosted[0]);
      console.log('MyGameRoomsPage - Sample joined room:', data.joined[0]);
      
      // Build playerIdToUsername mapping from room data
      const usernameMap: Record<string, string> = {};
      [...data.hosted, ...data.joined].forEach(room => {
        console.log('MyGameRoomsPage - Processing room:', { 
          roomId: room.id, 
          host: room.host, 
          hostName: room.hostName,
          hasHost: !!room.host,
          hasHostName: !!room.hostName
        });
        
        if (room.host && room.hostName) {
          usernameMap[room.host] = room.hostName;
          console.log('MyGameRoomsPage - Added to usernameMap:', room.host, '->', room.hostName);
        }
        // Also add current user's mapping if available
        if (user?.id && user?.username) {
          usernameMap[user.id] = user.username;
          console.log('MyGameRoomsPage - Added current user to usernameMap:', user.id, '->', user.username);
        }
      });
      
      console.log('MyGameRoomsPage - Final usernameMap:', usernameMap);
      setPlayerIdToUsername(usernameMap);
      
      setHostedRooms(data.hosted);
      setJoinedRooms(sortedJoined);
    });

    socket.on('error', (err: { message: string }) => {
      console.error('Socket error (myGameRoomsList):', err.message);
    });

    return () => {
      socket.off('myGameRoomsList');
      socket.off('error');
    };
  }, [user, socket]);

  const now = new Date();
  const scheduledHosted = hostedRooms.filter(room => room.scheduledTimeCombined && new Date(room.scheduledTimeCombined) > now);
  const activeHosted = hostedRooms.filter(room => !room.scheduledTimeCombined || new Date(room.scheduledTimeCombined) <= now);

  return (
    <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="My Game Rooms" subtitle="Manage your created game rooms and view the ones you've joined" />

      {/* Tabs */}
      <div className="flex mb-6 border-b border-gray-700">
        {['joined', 'hosted'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'joined' | 'hosted')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Rooms
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'joined' && (
          <>
            <h3 className="text-lg font-medium mb-4">Game rooms you've joined</h3>
            {joinedRooms.length > 0 ? (
              <GameRoomList gameRooms={joinedRooms} onJoinRoom={onJoinRoom} playerIdToUsername={playerIdToUsername} />
            ) : (
              <p className="text-gray-400">You haven't joined any rooms yet.</p>
            )}
          </>
        )}
        {activeTab === 'hosted' && (
          <>
            <h3 className="text-lg font-medium mb-4">Game rooms you're hosting</h3>
            {hostedRooms.length > 0 ? (
              <>
                {scheduledHosted.length > 0 && (
                  <>
                    <h4 className="text-md font-medium mb-2">Scheduled Rooms</h4>
                    <GameRoomList gameRooms={scheduledHosted} onJoinRoom={onJoinRoom} playerIdToUsername={playerIdToUsername} />
                  </>
                )}
                {activeHosted.length > 0 && (
                  <>
                    <h4 className="text-md font-medium mb-2 mt-4">Active Rooms</h4>
                    <GameRoomList gameRooms={activeHosted} onJoinRoom={onJoinRoom} playerIdToUsername={playerIdToUsername} />
                  </>
                )}
              </>
            ) : (
              <p className="text-gray-400">You haven't hosted any rooms yet.</p>
            )}
          </>
        )}
        {/* {activeTab === 'past' && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">Your game history will appear here.</p>
            <button className="px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors">
              View Game Statistics
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
};

