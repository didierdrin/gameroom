import { useState } from 'react';
import { SendIcon, UserIcon, PlusIcon, UsersIcon } from 'lucide-react';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    name: 'General Chat',
    lastMessage: 'Anyone up for a game?',
    timestamp: '2 min ago',
    unread: 3
  },
  {
    id: '2',
    name: 'Trivia Masters',
    lastMessage: 'Great game everyone!',
    timestamp: '5 min ago',
    unread: 0
  },
  {
    id: '3',
    name: 'Chess Club',
    lastMessage: 'Tournament starts tomorrow',
    timestamp: '1 hour ago',
    unread: 1
  }
];

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'Alice',
    content: 'Hey everyone! Anyone up for a trivia game?',
    timestamp: '10:30 AM',
    isOwn: false
  },
  {
    id: '2',
    sender: 'You',
    content: 'I\'m in! Let me create a room.',
    timestamp: '10:32 AM',
    isOwn: true
  },
  {
    id: '3',
    sender: 'Bob',
    content: 'Count me in too!',
    timestamp: '10:33 AM',
    isOwn: false
  }
];

export const DiscussionsPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<string>('1');
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // TODO: Implement message sending
      setNewMessage('');
    }
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      {/* Conversations List - Left Column */}
      <div className="w-full md:w-1/3 bg-gray-800 border-r border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-purple-400">Discussions</h2>
            <div className="flex gap-2">
              <button 
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Add new person"
              >
                <PlusIcon size={20} className="text-gray-400 hover:text-purple-400" />
              </button>
              <button 
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Create group discussion"
              >
                <UsersIcon size={20} className="text-gray-400 hover:text-purple-400" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {mockConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                selectedConversation === conversation.id ? 'bg-gray-700' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold">{conversation.name}</h3>
                {conversation.unread > 0 && (
                  <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">
                    {conversation.unread}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 truncate">{conversation.lastMessage}</p>
              <p className="text-xs text-gray-500 mt-1">{conversation.timestamp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area - Right Column */}
      <div className={`flex-1 flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="font-semibold">
                {mockConversations.find(c => c.id === selectedConversation)?.name}
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mockMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isOwn 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    {!message.isOwn && (
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon size={16} />
                        <span className="text-sm font-semibold">{message.sender}</span>
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <SendIcon size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};