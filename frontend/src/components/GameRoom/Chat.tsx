import React, { useState, useEffect, useRef } from 'react';
import { SendIcon, SmileIcon } from 'lucide-react';

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
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className="h-full flex flex-col bg-gray-800 border-l border-gray-700">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-medium">Chat</h3>
        <div className="text-xs text-gray-400">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.playerId === currentPlayerId ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-xs p-2 rounded-lg ${
                msg.playerId === currentPlayerId 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.playerId}`}
                  alt=""
                  className="w-6 h-6 rounded-full border border-gray-600"
                />
                <span className="text-xs font-bold">
                  {playerIdToUsername[msg.playerId] || 
                   (msg.playerId.startsWith('ai-') ? `AI ${msg.playerId.split('-')[1]}` : msg.playerId)}
                </span>
                {msg.timestamp && (
                  <span className="text-xs text-gray-400">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700">
        <div className="flex items-center bg-gray-700 rounded-lg px-3">
          <button type="button" className="text-gray-400 hover:text-gray-300">
            <SmileIcon size={20} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-white px-3 py-2"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className={`p-1 rounded-full ${
              message.trim() ? 'text-purple-400 hover:text-purple-300' : 'text-gray-500'
            }`}
          >
            <SendIcon size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
