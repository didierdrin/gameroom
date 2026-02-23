import { useState, useEffect } from 'react';
import { SendIcon, UserIcon, PlusIcon, UsersIcon, ArrowLeft, XIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../utils/axiosConfig';

interface Conversation {
  _id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar?: string;
  participants?: string[];
}

interface Message {
  _id?: string;
  sender: { _id: string; username: string; avatar?: string } | string;
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
      sender: { _id: string; username: string; avatar?: string } | string;
      content: string;
      timestamp: string;
    }>;
  };
}

interface User {
  _id: string;
  username: string;
  avatar?: string;
}


export const DiscussionsPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
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
        // Fetch participant details for each conversation to get avatars
        const conversationsWithAvatars = await Promise.all(
          res.data.data.map(async (conv) => {
            try {
              // Get the other participant's ID (not the current user)
              const participants = conv.participants || [];
              const otherParticipantId = participants.find(p => p !== user?.id);
              
              if (otherParticipantId) {
                const userRes = await apiClient.get(`/user/${otherParticipantId}/profile`);
                if (userRes.data.success && userRes.data.data) {
                  return { ...conv, avatar: userRes.data.data.avatar };
                }
              }
            } catch (error) {
              console.error('Failed to fetch participant avatar:', error);
            }
            return conv;
          })
        );
        setConversations(conversationsWithAvatars);
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
    <div className={`h-screen flex text-white ${
      theme === 'light' ? 'bg-[#ffffff] text-black' : 'bg-gray-900'
    }`}>
      {/* Conversations List - Left Column */}
      <div className={`w-full md:w-1/3 flex-col ${
        theme === 'light' 
          ? 'bg-[#ffffff] border-r border-l border-[#b4b4b4]' 
          : 'bg-gray-800 border-r border-l border-gray-700'
      } ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className={`p-4 border-b ${
          theme === 'light' ? 'border-[#b4b4b4]' : 'border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${
              theme === 'light' ? 'text-black' : 'text-white'
            }`}>Discussions</h2>
            <div className="flex gap-2">
              <button 
                onClick={toggleAddDialog}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                }`}
                title={showAddDialog ? "Close" : "Add new person"}
              >
                {showAddDialog ? (
                  <XIcon size={20} className={`${
                    theme === 'light' ? 'text-[#b4b4b4] hover:text-[#ff0000]' : 'text-gray-400 hover:text-red-400'
                  }`} />
                ) : (
                  <PlusIcon size={20} className={`${
                    theme === 'light' ? 'text-[#b4b4b4] hover:text-[#209db8]' : 'text-gray-400 hover:text-purple-400'
                  }`} />
                )}
              </button>
              <button 
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                }`}
                title="Create group discussion"
              >
                <UsersIcon size={20} className={`${
                  theme === 'light' ? 'text-[#b4b4b4] hover:text-[#209db8]' : 'text-gray-400 hover:text-purple-400'
                }`} />
              </button>
              <div className='w-14 sm:hidden'></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={`p-4 ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>Loading conversations...</div>
          ) : showAddDialog ? (
            <div className="p-4">
              <input
                type="text"
                value={newConversationName}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search users..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none mb-4 ${
                  theme === 'light' 
                    ? 'bg-white border-[#b4b4b4] focus:border-[#209db8] text-black' 
                    : 'bg-gray-700 border-gray-600 focus:border-purple-500 text-white'
                }`}
                autoFocus
              />
              
              <div className="space-y-2">
                {newConversationName ? (
                  searchedUsers.length > 0 ? (
                    searchedUsers.map(searchUser => (
                      <div
                        key={searchUser._id}
                        onClick={() => handleSelectUser(searchUser)}
                        className={`px-3 py-3 cursor-pointer flex items-center gap-3 rounded-lg transition-colors ${
                          theme === 'light' 
                            ? 'hover:bg-gray-100 text-black' 
                            : 'hover:bg-gray-700 text-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          theme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
                        }`}>
                          <UserIcon size={16} />
                        </div>
                        <span>{searchUser.username}</span>
                      </div>
                    ))
                  ) : (
                    <div className={`px-3 py-2 text-center ${
                      theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'
                    }`}>No users found</div>
                  )
                ) : (
                  <div className={`px-3 py-2 text-center ${
                    theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'
                  }`}>Start typing to search for users</div>
                )}
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className={`p-4 ${theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'}`}>No conversations yet</div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => handleSelectConversation(conversation._id)}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  theme === 'light' 
                    ? `border-[#b4b4b4] hover:bg-gray-100 ${
                        selectedConversation === conversation._id ? 'bg-gray-100' : ''
                      }`
                    : `border-gray-700 hover:bg-gray-700 ${
                        selectedConversation === conversation._id ? 'bg-gray-700' : ''
                      }`
                }`}
              >
                <div className="flex items-center gap-3">
                  {conversation.avatar ? (
                    <img src={conversation.avatar} alt={conversation.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      theme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
                    }`}>
                      <UserIcon size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold ${
                        theme === 'light' ? 'text-black' : 'text-white'
                      }`}>{conversation.name}</h3>
                      {conversation.unread > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          theme === 'light' ? 'bg-[#209db8] text-white' : 'bg-purple-600 text-white'
                        }`}>
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${
                      theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'
                    }`}>{conversation.lastMessage}</p>
                    <p className={`text-xs mt-1 ${
                      theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-500'
                    }`}>
                      {new Date(conversation.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
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
            <div className={`p-4 border-b flex items-center gap-3 relative z-10 ${
              theme === 'light' 
                ? 'border-[#b4b4b4] bg-white' 
                : 'border-gray-700 bg-gray-800'
            }`}>
              <button 
                onClick={() => setSelectedConversation(null)}
                className={`md:hidden p-2 -ml-2 rounded-lg transition-colors ${
                  theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                }`}
              >
                <ArrowLeft size={20} className={theme === 'light' ? 'text-black' : 'text-white'} />
              </button>
              {(() => {
                const currentConv = conversations.find(c => c._id === selectedConversation);
                return (
                  <>
                    {currentConv?.avatar ? (
                      <img src={currentConv.avatar} alt={currentConv.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        theme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
                      }`}>
                        <UserIcon size={20} />
                      </div>
                    )}
                    <h3 className={`font-semibold ${
                      theme === 'light' ? 'text-black' : 'text-white'
                    }`}>{currentConv?.name}</h3>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
              {messages.length === 0 ? (
                <div className={`text-center ${
                  theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-400'
                }`}>No messages yet</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-2">
                      {!message.isOwn && typeof message.sender === 'object' && (
                        message.sender.avatar ? (
                          <img src={message.sender.avatar} alt={message.sender.username} className="w-8 h-8 rounded-full flex-shrink-0" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            theme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
                          }`}>
                            <UserIcon size={16} />
                          </div>
                        )
                      )}
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isOwn 
                          ? theme === 'light'
                            ? 'bg-[#209db8] text-white'
                            : 'bg-purple-600 text-white'
                          : theme === 'light'
                            ? 'bg-gray-200 text-black'
                            : 'bg-gray-700 text-gray-100'
                      }`}>
                        {!message.isOwn && (
                          <div className="text-sm font-semibold mb-1">
                            {typeof message.sender === 'object' ? message.sender.username : message.sender}
                          </div>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className={`p-4 border-t relative z-10 ${
              theme === 'light' 
                ? 'border-[#b4b4b4] bg-white' 
                : 'border-gray-700 bg-gray-800'
            }`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none ${
                    theme === 'light' 
                      ? 'bg-white border-[#b4b4b4] focus:border-[#209db8] text-black' 
                      : 'bg-gray-700 border-gray-600 focus:border-purple-500 text-white'
                  }`}
                />
                <button
                  onClick={handleSendMessage}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'light' 
                      ? 'bg-[#209db8] hover:bg-[#1a7d94]' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  <SendIcon size={20} className="text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center relative z-10 ${
            theme === 'light' ? 'text-[#b4b4b4]' : 'text-gray-500'
          }`}>
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};