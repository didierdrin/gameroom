import { useState, useEffect } from 'react';
import { SendIcon, UserIcon, PlusIcon, UsersIcon, ArrowLeft } from 'lucide-react';
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
      const res = await apiClient.get<ApiResponse<User[]>>(`/users/search?q=${query}`);
      if (res.data.success) {
        setSearchedUsers(res.data.data.filter(u => u._id !== user?.id));
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleSelectUser = (selectedUser: User) => {
    if (!selectedUsers.find(u => u._id === selectedUser._id)) {
      setSelectedUsers([...selectedUsers, selectedUser]);
    }
    setNewConversationName('');
    setSearchedUsers([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const res = await apiClient.post<ApiResponse<Conversation>>('/discussions', {
        name: selectedUsers.map(u => u.username).join(', '),
        participants: [user?.id, ...selectedUsers.map(u => u._id)]
      });
      if (res.data.success) {
        setShowAddDialog(false);
        setNewConversationName('');
        setSelectedUsers([]);
        setSearchedUsers([]);
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      {/* Add Conversation Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Add a Conversation</h2>
            
            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedUsers.map(u => (
                  <div key={u._id} className="flex items-center gap-1 bg-purple-600 px-2 py-1 rounded-full text-sm">
                    <span>{u.username}</span>
                    <button onClick={() => handleRemoveUser(u._id)} className="hover:text-gray-300">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                value={newConversationName}
                onChange={(e) => {
                  setNewConversationName(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Search users..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
              />
              
              {/* User Suggestions */}
              {searchedUsers.length > 0 && (
                <div className="absolute w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg max-h-48 overflow-y-auto z-10">
                  {searchedUsers.map(searchUser => (
                    <div
                      key={searchUser._id}
                      onClick={() => handleSelectUser(searchUser)}
                      className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center gap-2"
                    >
                      <UserIcon size={16} />
                      <span>{searchUser.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewConversationName('');
                  setSelectedUsers([]);
                  setSearchedUsers([]);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConversation}
                disabled={selectedUsers.length === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversations List - Left Column */}
      <div className={`w-full md:w-1/3 bg-gray-800 border-r border-l border-gray-700 flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Discussions</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowAddDialog(true)}
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
              <div className='w-14 sm:hidden'></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-gray-400">Loading conversations...</div>
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
      <div className={`flex-1 flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800 flex items-center gap-3">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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