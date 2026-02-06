import { useState, useEffect } from 'react';
import { SendIcon, UserIcon, PlusIcon, UsersIcon, ArrowLeft, XIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/axiosConfig';

interface Conversation {
  _id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  _id?: string;
  sender: { _id: string; username: string } | string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ConversationsResponse {
  success: boolean;
  data: Conversation[];
}

interface MessagesResponse {
  success: boolean;
  data: {
    messages: Array<{
      _id: string;
      sender: { _id: string; username: string } | string;
      content: string;
      timestamp: string;
    }>;
  };
}

interface User {
  _id: string;
  username: string;
}


export const DiscussionsPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConversationName, setNewConversationName] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
  }, [user?.id]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ConversationsResponse>(`/discussions/user/${user?.id}`);
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await apiClient.get<MessagesResponse>(`/discussions/${conversationId}/user/${user?.id}`);
      if (res.data.success && res.data.data.messages) {
        const formattedMessages = res.data.data.messages.map((msg) => ({
          ...msg,
          isOwn: typeof msg.sender === 'object' ? msg.sender._id === user?.id : msg.sender === user?.id,
          timestamp: new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const res = await apiClient.post<ApiResponse<Message>>(`/discussions/${selectedConversation}/message`, {
        senderId: user?.id,
        content: newMessage
      });
      if (res.data.success) {
        setNewMessage('');
        fetchMessages(selectedConversation);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchedUsers([]);
      return;
    }
    try {
      const res = await apiClient.get<ApiResponse<User[]>>(`/user/search?q=${query}`);
      if (res.data.success) {
        setSearchedUsers(res.data.data.filter(u => u._id !== user?.id));
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      setSearchedUsers([]);
    }
  };

  const handleSearchChange = (value: string) => {
    setNewConversationName(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      searchUsers(value);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const handleSelectUser = async (selectedUser: User) => {
    try {
      const res = await apiClient.post<ApiResponse<Conversation>>('/discussions/create', {
        userId: user?.id,
        name: selectedUser.username,
        participants: [user?.id, selectedUser._id]
      });
      if (res.data.success) {
        setShowAddDialog(false);
        setNewConversationName('');
        setSearchedUsers([]);
        await fetchConversations();
        setSelectedConversation(res.data.data._id);
        fetchMessages(res.data.data._id);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const toggleAddDialog = () => {
    if (showAddDialog) {
      setShowAddDialog(false);
      setNewConversationName('');
      setSearchedUsers([]);
    } else {
      setShowAddDialog(true);
    }
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      {/* Conversations List - Left Column */}
      <div className={`w-full md:w-1/3 bg-gray-800 border-r border-l border-gray-700 flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Discussions</h2>
            <div className="flex gap-2">
              <button 
                onClick={toggleAddDialog}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title={showAddDialog ? "Close" : "Add new person"}
              >
                {showAddDialog ? (
                  <XIcon size={20} className="text-gray-400 hover:text-red-400" />
                ) : (
                  <PlusIcon size={20} className="text-gray-400 hover:text-purple-400" />
                )}
              </button>
              <button 
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Create group discussion"
              >
                <UsersIcon size={20} className="text-gray-400 hover:text-purple-400" />
              </button>
              <div className='w-14 sm:hidden'></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-gray-400">Loading conversations...</div>
          ) : showAddDialog ? (
            <div className="p-4">
              <input
                type="text"
                value={newConversationName}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search users..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 mb-4"
                autoFocus
              />
              
              <div className="space-y-2">
                {newConversationName ? (
                  searchedUsers.length > 0 ? (
                    searchedUsers.map(searchUser => (
                      <div
                        key={searchUser._id}
                        onClick={() => handleSelectUser(searchUser)}
                        className="px-3 py-3 hover:bg-gray-700 cursor-pointer flex items-center gap-3 rounded-lg transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <UserIcon size={16} />
                        </div>
                        <span>{searchUser.username}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-400 text-center">No users found</div>
                  )
                ) : (
                  <div className="px-3 py-2 text-gray-400 text-center">Start typing to search for users</div>
                )}
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-gray-400">No conversations yet</div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => handleSelectConversation(conversation._id)}
                className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                  selectedConversation === conversation._id ? 'bg-gray-700' : ''
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
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(conversation.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area - Right Column */}
      <div className={`flex-1 flex-col relative ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {/* Background SVG */}
        <div 
          className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-[0.15] pointer-events-none z-0"
          style={{ backgroundImage: 'url(/assets/doodles.svg)' }}
        />
        
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center gap-3 relative z-10">
              <button 
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-semibold">
                {conversations.find(c => c._id === selectedConversation)?.name}
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400">No messages yet</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
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
                          <span className="text-sm font-semibold">
                            {typeof message.sender === 'object' ? message.sender.username : message.sender}
                          </span>
                        </div>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800 relative z-10">
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
          <div className="flex-1 flex items-center justify-center text-gray-500 relative z-10">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};