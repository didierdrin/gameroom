import React, { useState, useEffect, useRef } from 'react';
import { SendIcon, SmileIcon } from 'lucide-react';
import { useUserData } from '../../hooks/useUserData';
import { Link } from 'react-router-dom';
import { useSocket } from '../../SocketContext';
import { useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const MessageAvatar = ({
  playerId,
  username,
  isLight,
}: {
  playerId: string;
  username: string;
  isLight: boolean;
}) => {
  // Handle AI avatars (non-clickable)
  if (playerId.startsWith('ai-')) {
    return (
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`}
        alt=""
        className={`w-6 h-6 rounded-full border ${isLight ? 'border-gray-300' : 'border-gray-600'}`}
      />
    );
  }

  const { avatar } = useUserData(playerId);
  const isClickable = username !== 'Loading...' && username !== 'Unknown Host';

  return (
    <>
      {isClickable ? (
        <Link 
          to={`/profile/${username}`} 
          className="block"
        >
          <img
            src={avatar}
            alt=""
            className={`w-6 h-6 rounded-full border transition-colors cursor-pointer ${
              isLight ? 'border-gray-300 hover:border-[#8b5cf6]' : 'border-gray-600 hover:border-purple-400'
            }`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
            }}
          />
        </Link>
      ) : (
        <img
          src={avatar}
          alt=""
          className={`w-6 h-6 rounded-full border ${isLight ? 'border-gray-300' : 'border-gray-600'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
          }}
        />
      )}
    </>
  );
};

interface ChatProps {
  messages: Array<{
    playerId: string;
    message: string;
    timestamp?: string;
  }>;
  onSendMessage: (message: string) => void;
  currentPlayerId: string;
  playerIdToUsername: Record<string, string>;
}

export const Chat: React.FC<ChatProps> = ({ 
  messages, 
  onSendMessage, 
  currentPlayerId,
  playerIdToUsername 
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();
  const { id: roomId } = useParams<{ id: string }>();
  const hasLoadedHistory = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket && roomId && !hasLoadedHistory.current) {
      socket.emit('getChatHistory', { roomId });
      hasLoadedHistory.current = true;
    }
  }, [socket, roomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const shell = isLight
    ? 'bg-white border-l border-[#b4b4b4]'
    : 'bg-gray-800 border-l border-gray-700';
  const headerBorder = isLight ? 'border-[#b4b4b4]' : 'border-gray-700';
  const titleClass = isLight ? 'text-gray-900' : 'text-white';
  const metaClass = isLight ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={`h-full min-h-0 flex flex-col ${shell}`}>
      <div className={`p-3 border-b flex justify-between items-center ${headerBorder}`}>
        <h3 className={`font-medium ${titleClass}`}>Chat</h3>
        <div className={`text-xs ${metaClass}`}>
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, index) => {
          const username = playerIdToUsername[msg.playerId] || 'Unknown Host';
          return (
            <div 
              key={index} 
              className={`flex ${msg.playerId === currentPlayerId ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs p-2 rounded-lg ${
                  msg.playerId === currentPlayerId 
                    ? 'bg-purple-600 text-white' 
                    : isLight
                      ? 'bg-gray-100 border border-gray-200 text-gray-900'
                      : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageAvatar 
                    playerId={msg.playerId} 
                    username={username}
                    isLight={isLight}
                  />
                  <span className="text-xs font-bold">
                    <Link 
                      to={`/profile/${username}`} 
                      className={
                        msg.playerId === currentPlayerId
                          ? 'text-white/95 hover:underline'
                          : isLight
                            ? 'text-[#8b5cf6] hover:underline'
                            : 'text-purple-400 hover:underline'
                      }
                    >
                      {username}
                    </Link>
                  </span>
                  {msg.timestamp && (
                    <span
                      className={`text-xs ${
                        msg.playerId === currentPlayerId
                          ? 'text-white/70'
                          : isLight
                            ? 'text-gray-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 text-sm ${
                    msg.playerId === currentPlayerId
                      ? ''
                      : isLight
                        ? 'text-gray-800'
                        : ''
                  }`}
                >
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <form
        onSubmit={handleSubmit}
        className={`p-3 border-t ${isLight ? 'border-[#b4b4b4]' : 'border-gray-700'}`}
      >
        <div
          className={`flex items-center rounded-lg px-3 ${
            isLight ? 'bg-gray-100 border border-gray-200' : 'bg-gray-700'
          }`}
        >
          <button
            type="button"
            className={isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-300'}
          >
            <SmileIcon size={20} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className={`flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 placeholder:text-gray-400 ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className={`p-1 rounded-full ${
              message.trim()
                ? isLight
                  ? 'text-[#8b5cf6] hover:text-[#7c3aed]'
                  : 'text-purple-400 hover:text-purple-300'
                : 'text-gray-500'
            }`}
          >
            <SendIcon size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

