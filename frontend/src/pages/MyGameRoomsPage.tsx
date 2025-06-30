import React, { useState } from 'react';
import { GameRoomList } from '../components/GameRoom/GameRoomList';
import { SectionTitle } from '../components/UI/SectionTitle';
// Mock data
const MOCK_MY_HOSTED_ROOMS = [{
  id: 101,
  name: 'Weekly Trivia Challenge',
  gameType: 'Trivia',
  hostName: 'You',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
  currentPlayers: 0,
  maxPlayers: 20,
  isPrivate: false,
  isInviteOnly: false,
  startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
}, {
  id: 102,
  name: 'Chess Practice',
  gameType: 'Chess',
  hostName: 'You',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
  currentPlayers: 1,
  maxPlayers: 2,
  isPrivate: true,
  isInviteOnly: false
}];
const MOCK_MY_JOINED_ROOMS = [{
  id: 201,
  name: 'CS Department Kahoot',
  gameType: 'Kahoot',
  hostName: 'Professor Williams',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Williams',
  currentPlayers: 15,
  maxPlayers: 30,
  isPrivate: false,
  isInviteOnly: true,
  startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day from now
}, {
  id: 202,
  name: 'UNO with Friends',
  gameType: 'UNO',
  hostName: 'Alex',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  currentPlayers: 3,
  maxPlayers: 4,
  isPrivate: false,
  isInviteOnly: true
}, {
  id: 203,
  name: 'Pictionary Challenge',
  gameType: 'Pictionary',
  hostName: 'Emma',
  hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  currentPlayers: 6,
  maxPlayers: 12,
  isPrivate: false,
  isInviteOnly: false,
  startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
}];
export const MyGameRoomsPage = ({
  onJoinRoom
}) => {
  const [activeTab, setActiveTab] = useState('joined');
  return <div className="p-6 overflow-y-auto h-screen pb-20">
      <SectionTitle title="My Game Rooms" subtitle="Manage your created game rooms and view the ones you've joined" />
      {/* Tabs */}
      <div className="flex mb-6 border-b border-gray-700">
        <button onClick={() => setActiveTab('joined')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'joined' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Joined Rooms
        </button>
        <button onClick={() => setActiveTab('hosted')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'hosted' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Hosted Rooms
        </button>
        <button onClick={() => setActiveTab('past')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'past' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
          Past Games
        </button>
      </div>
      {/* Content */}
      <div>
        {activeTab === 'joined' && <>
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-medium">Game rooms you've joined</h3>
              <button className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors flex items-center">
                <div size={18} className="mr-2" />
                <span>Sort & Filter</span>
              </button>
            </div>
            {MOCK_MY_JOINED_ROOMS.length > 0 ? <GameRoomList gameRooms={MOCK_MY_JOINED_ROOMS} onJoinRoom={onJoinRoom} /> : <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">
                  You haven't joined any game rooms yet.
                </p>
                <button className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  Browse Game Rooms
                </button>
              </div>}
          </>}
        {activeTab === 'hosted' && <>
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-medium">Game rooms you're hosting</h3>
              <button className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
                Create New Room
              </button>
            </div>
            {MOCK_MY_HOSTED_ROOMS.length > 0 ? <GameRoomList gameRooms={MOCK_MY_HOSTED_ROOMS} onJoinRoom={onJoinRoom} /> : <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">
                  You haven't created any game rooms yet.
                </p>
                <button className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  Create Your First Room
                </button>
              </div>}
          </>}
        {activeTab === 'past' && <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">
              Your game history will appear here.
            </p>
            <button className="px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors">
              View Game Statistics
            </button>
          </div>}
      </div>
    </div>;
};