import React, { useState } from 'react';

interface ChatProps {
  messages: any[];
  onSendMessage: (message: string) => void;
  currentPlayerId: string;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, currentPlayerId }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4">Chat</h3>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`p-2 rounded-lg ${
              msg.playerId === currentPlayerId ? 'bg-purple-900/50 ml-8' : 'bg-gray-700/50 mr-8'
            }`}
          >
            <p className="text-xs font-bold">
              {msg.playerId === currentPlayerId ? 'You' : msg.playerId.startsWith('ai-') ? `AI ${msg.playerId.split('-')[1]}` : msg.playerId}
            </p>
            <p>{msg.message}</p>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="mt-auto">
        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="bg-purple-600 rounded-r-lg px-4 py-2 hover:bg-purple-700"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};