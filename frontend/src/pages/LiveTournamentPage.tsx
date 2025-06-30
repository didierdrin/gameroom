import React, { useState } from 'react';
import { VideoGrid } from '../components/GameRoom/VideoGrid';
import { MediaControls } from '../components/GameRoom/MediaControls';
import { TournamentBracket } from '../components/Tournament/TournamentBracket';
import { XIcon, UsersIcon, MessageCircleIcon, TrophyIcon, LayoutGridIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
export const LiveTournamentPage = ({
  tournament,
  onExit
}) => {
  const [showBracket, setShowBracket] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [message, setMessage] = useState('');
  const [currentMatch] = useState({
    player1: {
      name: 'Sarah Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      score: 0
    },
    player2: {
      name: 'Michael Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
      score: 0
    },
    round: 'Quarter Finals',
    game: 'Chess'
  });
  const toggleSidebar = sidebar => {
    if (sidebar === 'participants') {
      setShowParticipants(!showParticipants);
      if (window.innerWidth < 1024) setShowChat(false);
    } else if (sidebar === 'chat') {
      setShowChat(!showChat);
      if (window.innerWidth < 1024) setShowParticipants(false);
    }
  };
  return <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onExit} className="mr-2 sm:mr-4 p-2 rounded-lg hover:bg-gray-700 transition-colors">
              <XIcon size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg sm:text-xl">
                {tournament.name}
              </h1>
              <div className="flex items-center text-sm text-gray-400">
                <span>{currentMatch.round}</span>
                <ChevronRightIcon size={16} className="mx-1" />
                <span>{currentMatch.game}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowBracket(!showBracket)} className={`p-2 rounded-lg transition-colors ${showBracket ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}>
              <LayoutGridIcon size={20} />
            </button>
            <button onClick={() => toggleSidebar('participants')} className={`p-2 rounded-lg transition-colors ${showParticipants ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
              <UsersIcon size={20} />
            </button>
            <button onClick={() => toggleSidebar('chat')} className={`p-2 rounded-lg transition-colors ${showChat ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
              <MessageCircleIcon size={20} />
            </button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Participants Sidebar */}
        {showParticipants && <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-medium">Tournament Bracket</h3>
            </div>
            <div className="p-4">
              <TournamentBracket matches={[]} />
            </div>
          </div>}
        {/* Main Game Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-850">
          {showBracket ? <div className="p-4">
              <TournamentBracket matches={[]} />
            </div> : <div className="flex-1 overflow-hidden">
              <div className="h-full p-4">
                {/* Game Content */}
                <div className="h-full bg-gray-800 rounded-lg flex items-center justify-center">
                  Game content here
                </div>
              </div>
            </div>}
        </div>
        {/* Chat Sidebar */}
        {showChat && <div className="w-full sm:w-64 border-l border-gray-700 bg-gray-800 flex flex-col fixed sm:relative inset-y-0 right-0 z-30">
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-medium">Tournament Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Chat messages would go here */}
            </div>
            <div className="p-3 border-t border-gray-700">
              <input type="text" placeholder="Type a message..." className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" value={message} onChange={e => setMessage(e.target.value)} />
            </div>
          </div>}
      </div>
      {/* Media Controls */}
      <MediaControls videoEnabled={videoEnabled} audioEnabled={audioEnabled} isScreenSharing={isScreenSharing} onToggleVideo={() => setVideoEnabled(!videoEnabled)} onToggleAudio={() => setAudioEnabled(!audioEnabled)} onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)} onLeaveCall={onExit} />
      {/* Mobile Overlay */}
      {(showParticipants || showChat) && <div className="fixed inset-0 bg-black/50 z-20 sm:hidden" onClick={() => {
      setShowParticipants(false);
      setShowChat(false);
    }} />}
    </div>;
};