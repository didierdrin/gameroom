
// LiveGameRoomPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { LudoGame } from '../components/Ludo/LudoGame';
import { TriviaGame } from '../components/Trivia/TriviaGame';
import { renderChessGame } from '../components/Chess/ChessGame';
import { renderUnoGame } from '../components/Uno/UnoGame';
import { renderKahootGame } from '../components/Kahoot/KahootGame';
import { renderPictionaryGame } from '../components/Pictionary/PictionaryGame';

import { GameRoomInfo } from '../components/GameRoom/GameRoomInfo';
import { PlayerList } from '../components/GameRoom/PlayerList';
import { Chat } from '../components/GameRoom/Chat';
import { Dice } from '../components/Ludo/Dice';
import {
  XIcon, UsersIcon, MessageCircleIcon, SendIcon, VideoIcon,
  SmileIcon, SettingsIcon, MaximizeIcon, MinimizeIcon
} from 'lucide-react';
import { MediaControls } from '../components/GameRoom/MediaControls';
import { VideoGrid } from '../components/GameRoom/VideoGrid';
import { useSocket } from '../SocketContext';
import { useAuth } from '../context/AuthContext'; 

// Type for socket
type SocketType = ReturnType<typeof io>;

export const LiveGameRoomPage = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Assuming you have an auth hook
const [currentPlayerId, setCurrentPlayerId] = useState<string>(user?.id || '');
  
  // Use the socket from context
  const socket = useSocket();
  
  // Initialize gameState with proper default structure
  const [gameState, setGameState] = useState<any>({
    players: [
      { id: 0, color: 'red', name: 'Red', coins: [0, 0, 0, 0] },
      { id: 1, color: 'blue', name: 'Blue', coins: [0, 0, 0, 0] },
      { id: 2, color: 'green', name: 'Green', coins: [0, 0, 0, 0] },
      { id: 3, color: 'yellow', name: 'Yellow', coins: [0, 0, 0, 0] }
    ],
    currentPlayer: 0,
    diceValue: 0,
    diceRolled: false,
    winner: null,
    gameStarted: false,
    gameOver: false,
    roomName: '',
    gameType: ''
  });
  
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  // const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const gameType = gameState?.gameType || roomInfo?.gameType || 'ludo';

  // Initialize socket connection and join room
  useEffect(() => {

    if (!user) {
      navigate('/login');
      return;
    }

    if (!socket || !roomId) return;

    console.log('Socket connected, joining room:', roomId);
    
    // Set connection status
    setIsConnected(true);

    
      
      
      // Join the room
      socket.emit('joinGame', { 
        roomId, 
        playerId: user.id, // Use the authenticated user ID
      playerName: user.username, // Send username too
        password: '' // Add password if needed
      });


    // Socket event listeners
    const handleGameState = (newGameState: any) => {
      console.log('Game state received:', newGameState);
      setGameState((prev:any) => ({
        ...prev,
        ...newGameState
      }));
    };

    const handlePlayerJoined = (data: any) => {
      console.log('Player joined:', data);
      if (data.success) {
        console.log('Successfully joined room');
      }
    };

  

    const handlePlayerConnected = (data: any) => {
      setPlayers(prev => {
        const existingPlayerIndex = prev.findIndex(p => p.id === data.playerId);
        if (existingPlayerIndex === -1) {
          return [...prev, { 
            id: data.playerId, 
            name: data.playerName || data.playerId, 
            isOnline: true 
          }];
        }
        return prev.map(p => 
          p.id === data.playerId ? {...p, isOnline: true} : p
        );
      });
    };


// Add to your useEffect socket listeners:
const handlePlayerDisconnected = (data: any) => {
  setPlayers(prev => 
    prev.map(p => 
      p.id === data.playerId ? {...p, isOnline: false} : p
    )
  );
};
socket.on('playerDisconnected', handlePlayerDisconnected);


    const handleChatMessage = (data: any) => {
      console.log('Chat message received:', data);
      setMessages(prev => [...prev, data]);
    };

    const handleDiceRolled = (data: any) => {
      console.log('Dice rolled:', data);
      setGameState((prev:any) => ({
        ...prev,
        diceValue: data.diceValue,
        diceRolled: true,
        currentPlayer: data.currentPlayer
      }));
    };

    const handleCoinMoved = (data: any) => {
      console.log('Coin moved:', data);
      setGameState((prev:any) => ({
        ...prev,
        ...data
      }));
    };

    const handleGameOver = (data: any) => {
      console.log('Game over:', data);
      setGameState((prev:any) => ({
        ...prev,
        gameOver: true,
        winner: data.winner
      }));
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
      if (error.type === 'joinError') {
        alert(`Failed to join room: ${error.message}`);
        navigate('/');
      }
    };

    // Register all event listeners
    socket.on('gameState', handleGameState);
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('playerConnected', handlePlayerConnected);
    socket.on('chatMessage', handleChatMessage);
    socket.on('diceRolled', handleDiceRolled);
    socket.on('coinMoved', handleCoinMoved);
    socket.on('gameOver', handleGameOver);
    socket.on('error', handleError);

    // Cleanup function
    return () => {
      socket.off('gameState', handleGameState);
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('playerConnected', handlePlayerConnected);
      socket.off('chatMessage', handleChatMessage);
      socket.off('diceRolled', handleDiceRolled);
      socket.off('coinMoved', handleCoinMoved);
      socket.off('gameOver', handleGameOver);
      socket.off('error', handleError);
      socket.off('playerDisconnected', handlePlayerDisconnected);
    };
  }, [socket, roomId, user, navigate]);



  // Add these socket listeners
useEffect(() => {
  if (!socket) return;

  const handleGameStarted = (newState:any) => {
    console.log('Game started with state:', newState);
    setGameState(newState);
  };

  socket.on('gameState', handleGameStarted);

  return () => {
    socket.off('gameState', handleGameStarted);
  };
}, [socket]);


  // Handle room info and initial setup
  useEffect(() => {
    if (socket && roomId && currentPlayerId) {
      // Request initial game state
      socket.emit('getGameState', { roomId });
    }
  }, [socket, roomId, currentPlayerId]);

  const handleRollDice = () => {
    if (socket && gameState?.currentTurn === currentPlayerId && gameState.diceValue === 0) {
      socket.emit('rollDice', { roomId, playerId: currentPlayerId });
    }
  };

  const handleMoveCoin = (coinId: string) => {
    if (socket && gameState?.currentTurn === currentPlayerId && gameState.diceValue > 0) {
      socket.emit('moveCoin', { roomId, playerId: currentPlayerId, coinId });
    }
  };



  const handleStartGame = () => {
    console.log('Starting game for room:', roomId);
    if (socket && roomId) {
      socket.emit('startGame', { roomId }, (response:any) => {
        if (response?.error) {
          console.error('Failed to start game:', response.error);
        } else {
          console.log('Game started successfully');
        }
      });
    }
  };

  const sendMessage = (text: string) => {
    if (socket && roomId && currentPlayerId) {
      socket.emit('chatMessage', { roomId, playerId: currentPlayerId, message: text });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  const renderGameContent = () => {
    const lowerCaseGameType = gameType.toLowerCase();
    
    if (!gameState?.gameStarted) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl mb-4">Waiting for players...</h2>
          <p className="text-gray-400 mb-4">Players in room: {players.length}</p>
          {isConnected && (
            <div className="text-green-400 mb-4">✅ Connected to room</div>
          )}
          <button
            onClick={handleStartGame}
            className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Start Game
          </button>
        </div>
      );
    }

    switch (lowerCaseGameType) {
      case 'ludo':
        return (
          <div className="relative w-full h-full">
            <LudoGame
              gameState={gameState}
              currentPlayerId={currentPlayerId}
              onMoveCoin={handleMoveCoin}
            />
            {gameState.currentTurn === currentPlayerId && (
              <div className="absolute bottom-4 right-4">
                <Dice
                  value={gameState.diceValue}
                  onRoll={handleRollDice}
                  disabled={gameState.diceValue !== 0}
                />
              </div>
            )}
          </div>
        );

      case 'trivia':
        return <TriviaGame socket={socket} roomId={roomId!} currentPlayer={currentPlayerId} gameState={gameState} />

      case 'chess':
        return renderChessGame({
          socket,
          roomId: roomId!,
          currentPlayer: currentPlayerId,
          gameState,
        });

      case 'uno':
        return renderUnoGame({
          socket,
          roomId: roomId!,
          currentPlayer: currentPlayerId,
          gameState,
        });

      case 'kahoot':
        return renderKahootGame({
          socket,
          roomId: roomId!,
          currentPlayer: currentPlayerId,
          gameState,
        });

      case 'pictionary':
        return renderPictionaryGame({
          socket,
          roomId: roomId!,
          currentPlayer: currentPlayerId,
          gameState,
        });

      default:
        return (
          <div className="text-center text-gray-400">
            Game "{gameType}" not implemented yet
          </div>
        );
    }
  };

  const toggleSidebar = (sidebar: string) => {
    if (sidebar === 'players') {
      if (window.innerWidth < 1024 && showChat) setShowChat(false);
      setShowPlayers(!showPlayers);
    } else if (sidebar === 'chat') {
      if (window.innerWidth < 1024 && showPlayers) setShowPlayers(false);
      setShowChat(!showChat);
    }
  };

  const handleExit = () => {
    if (socket) {
      socket.emit('leaveGame', { roomId, playerId: currentPlayerId });
    }
    navigate('/');
  };

  // Show loading state if not connected
  if (!socket || !isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting to game room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-900 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Topbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-3 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={handleExit} className="mr-4 p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <XIcon size={20} />
          </button>
          <h1 className="font-bold text-base sm:text-xl truncate">{gameState?.roomName || roomInfo?.name || 'Game Room'}</h1>
          <div className="ml-3 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-400">
            {gameType}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowVideoGrid(!showVideoGrid)} className={`p-2 rounded-lg ${showVideoGrid ? 'bg-purple-600' : 'hover:bg-gray-700'}`}>
            <VideoIcon size={20} />
          </button>
          <button onClick={() => toggleSidebar('players')} className={`p-2 rounded-lg ${showPlayers ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
            <UsersIcon size={20} />
          </button>
          <button onClick={() => toggleSidebar('chat')} className={`p-2 rounded-lg ${showChat ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
            <MessageCircleIcon size={20} />
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="hidden sm:block p-2 rounded-lg hover:bg-gray-700">
            {fullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden">
        {showPlayers && (
          <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
            {/* <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium">Players ({players.length})</h3>
              <button onClick={() => setShowPlayers(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
                <XIcon size={16} />
              </button>
            </div> */}
            <PlayerList players={players} currentPlayerId={currentPlayerId} currentTurn={gameState?.currentTurn} />
          </div>
        )}

        <div className="flex-1 bg-gray-850">
          <div className="h-full p-2 sm:p-4">{renderGameContent()}</div>
        </div>

        {showChat && (
          <div className="w-full sm:w-64 border-l border-gray-700 bg-gray-800 flex flex-col fixed sm:relative inset-y-0 right-0 z-30">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium">Chat</h3>
              <button onClick={() => setShowChat(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
                <XIcon size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className="flex">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.playerId}`} alt="" className="w-8 h-8 rounded-full border border-gray-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium">{msg.playerId}</div>
                    <div className="text-sm text-gray-300">{msg.message}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700">
              <form onSubmit={handleSendMessage} className="flex items-center">
                <input
                  type="text"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" className="p-2 ml-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors">
                  <SendIcon size={20} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <MediaControls
        videoEnabled={videoEnabled}
        audioEnabled={audioEnabled}
        isScreenSharing={isScreenSharing}
        onToggleVideo={() => setVideoEnabled(!videoEnabled)}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
        onLeaveCall={handleExit}
      />

      {(showPlayers || showChat) && (
        <div className="fixed inset-0 bg-black/50 z-20 sm:hidden" onClick={() => {
          setShowPlayers(false);
          setShowChat(false);
        }} />
      )}
    </div>
  );
};


// // LiveGameRoomPage.tsx
// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import io from 'socket.io-client';
// import { LudoGame } from '../components/Ludo/LudoGame';
// import { TriviaGame } from '../components/Trivia/TriviaGame';
// import { renderChessGame } from '../components/Chess/ChessGame';
// import { renderUnoGame } from '../components/Uno/UnoGame';
// import { renderKahootGame } from '../components/Kahoot/KahootGame';
// import { renderPictionaryGame } from '../components/Pictionary/PictionaryGame';

// import { GameRoomInfo } from '../components/GameRoom/GameRoomInfo';
// import { PlayerList } from '../components/GameRoom/PlayerList';
// import { Chat } from '../components/GameRoom/Chat';
// import { Dice } from '../components/Ludo/Dice';
// import {
//   XIcon, UsersIcon, MessageCircleIcon, SendIcon, VideoIcon,
//   SmileIcon, SettingsIcon, MaximizeIcon, MinimizeIcon
// } from 'lucide-react';
// import { MediaControls } from '../components/GameRoom/MediaControls';
// import { VideoGrid } from '../components/GameRoom/VideoGrid';
// import { useSocket } from '../SocketContext';

// // Type for socket
// type SocketType = ReturnType<typeof io>;

// export const LiveGameRoomPage = () => {
//   const { id: roomId } = useParams<{ id: string }>();
//   const navigate = useNavigate();
  
//   // Use the socket from context
//   const socket = useSocket();
  
//   // Initialize gameState with proper default structure
//   const [gameState, setGameState] = useState<any>({
//     players: [
//       { id: 0, color: 'red', name: 'Red', coins: [0, 0, 0, 0] },
//       { id: 1, color: 'blue', name: 'Blue', coins: [0, 0, 0, 0] },
//       { id: 2, color: 'green', name: 'Green', coins: [0, 0, 0, 0] },
//       { id: 3, color: 'yellow', name: 'Yellow', coins: [0, 0, 0, 0] }
//     ],
//     currentPlayer: 0,
//     diceValue: 0,
//     diceRolled: false,
//     winner: null,
//     gameStarted: false,
//     gameOver: false,
//     roomName: '',
//     gameType: ''
//   });
  
//   const [players, setPlayers] = useState<any[]>([]);
//   const [messages, setMessages] = useState<any[]>([]);
//   const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
//   const [message, setMessage] = useState('');
//   const [showChat, setShowChat] = useState(true);
//   const [showPlayers, setShowPlayers] = useState(true);
//   const [fullscreen, setFullscreen] = useState(false);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [showVideoGrid, setShowVideoGrid] = useState(false);
//   const [roomInfo, setRoomInfo] = useState<any>(null);
//   const [isConnected, setIsConnected] = useState(false);

//   const gameType = gameState?.gameType || roomInfo?.gameType || 'ludo';

//   // Initialize socket connection and join room
//   useEffect(() => {
//     if (!socket || !roomId) return;

//     console.log('Socket connected, joining room:', roomId);
    
//     // Set connection status
//     setIsConnected(true);

//     // Generate a player ID if not already set
//     if (!currentPlayerId) {
//       const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//       setCurrentPlayerId(playerId);
      
//       // Join the room
//       socket.emit('joinGame', { 
//         roomId, 
//         playerId,
//         password: '' // Add password if needed
//       });
//     }

//     // Socket event listeners
//     const handleGameState = (newGameState: any) => {
//       console.log('Game state received:', newGameState);
//       setGameState(prev => ({
//         ...prev,
//         ...newGameState
//       }));
//     };

//     const handlePlayerJoined = (data: any) => {
//       console.log('Player joined:', data);
//       if (data.success) {
//         console.log('Successfully joined room');
//       }
//     };

//     const handlePlayerConnected = (data: any) => {
//       console.log('Player connected:', data);
//       // Update player list or room info
//       setPlayers(prev => {
//         const existingPlayerIndex = prev.findIndex(p => p.id === data.playerId);
//         if (existingPlayerIndex === -1) {
//           return [...prev, { id: data.playerId, name: data.playerId, isOnline: true }];
//         }
//         return prev;
//       });
//     };

//     const handleChatMessage = (data: any) => {
//       console.log('Chat message received:', data);
//       setMessages(prev => [...prev, data]);
//     };

//     const handleDiceRolled = (data: any) => {
//       console.log('Dice rolled:', data);
//       setGameState(prev => ({
//         ...prev,
//         diceValue: data.diceValue,
//         diceRolled: true,
//         currentPlayer: data.currentPlayer
//       }));
//     };

//     const handleCoinMoved = (data: any) => {
//       console.log('Coin moved:', data);
//       setGameState(prev => ({
//         ...prev,
//         ...data
//       }));
//     };

//     const handleGameOver = (data: any) => {
//       console.log('Game over:', data);
//       setGameState(prev => ({
//         ...prev,
//         gameOver: true,
//         winner: data.winner
//       }));
//     };

//     const handleError = (error: any) => {
//       console.error('Socket error:', error);
//       if (error.type === 'joinError') {
//         alert(`Failed to join room: ${error.message}`);
//         navigate('/');
//       }
//     };

//     // Register all event listeners
//     socket.on('gameState', handleGameState);
//     socket.on('playerJoined', handlePlayerJoined);
//     socket.on('playerConnected', handlePlayerConnected);
//     socket.on('chatMessage', handleChatMessage);
//     socket.on('diceRolled', handleDiceRolled);
//     socket.on('coinMoved', handleCoinMoved);
//     socket.on('gameOver', handleGameOver);
//     socket.on('error', handleError);

//     // Cleanup function
//     return () => {
//       socket.off('gameState', handleGameState);
//       socket.off('playerJoined', handlePlayerJoined);
//       socket.off('playerConnected', handlePlayerConnected);
//       socket.off('chatMessage', handleChatMessage);
//       socket.off('diceRolled', handleDiceRolled);
//       socket.off('coinMoved', handleCoinMoved);
//       socket.off('gameOver', handleGameOver);
//       socket.off('error', handleError);
//     };
//   }, [socket, roomId, currentPlayerId, navigate]);

//   // Handle room info and initial setup
//   useEffect(() => {
//     if (socket && roomId && currentPlayerId) {
//       // Request initial game state
//       socket.emit('getGameState', { roomId });
//     }
//   }, [socket, roomId, currentPlayerId]);

//   const handleRollDice = () => {
//     if (socket && gameState?.currentTurn === currentPlayerId && gameState.diceValue === 0) {
//       socket.emit('rollDice', { roomId, playerId: currentPlayerId });
//     }
//   };

//   const handleMoveCoin = (coinId: string) => {
//     if (socket && gameState?.currentTurn === currentPlayerId && gameState.diceValue > 0) {
//       socket.emit('moveCoin', { roomId, playerId: currentPlayerId, coinId });
//     }
//   };

//   const handleStartGame = () => {
//     console.log('Starting game for room:', roomId);
//     if (socket && roomId) {
//       socket.emit('startGame', { roomId });
//     }
//   };

//   const sendMessage = (text: string) => {
//     if (socket && roomId && currentPlayerId) {
//       socket.emit('chatMessage', { roomId, playerId: currentPlayerId, message: text });
//     }
//   };

//   const handleSendMessage = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (message.trim()) {
//       sendMessage(message);
//       setMessage('');
//     }
//   };

//   const renderGameContent = () => {
//     const lowerCaseGameType = gameType.toLowerCase();
    
//     if (!gameState?.gameStarted) {
//       return (
//         <div className="flex flex-col items-center justify-center h-full">
//           <h2 className="text-2xl mb-4">Waiting for players...</h2>
//           <p className="text-gray-400 mb-4">Players in room: {players.length}</p>
//           {isConnected && (
//             <div className="text-green-400 mb-4">✅ Connected to room</div>
//           )}
//           <button
//             onClick={handleStartGame}
//             className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
//           >
//             Start Game
//           </button>
//         </div>
//       );
//     }

//     switch (lowerCaseGameType) {
//       case 'ludo':
//         return (
//           <div className="relative w-full h-full">
//             <LudoGame
//               gameState={gameState}
//               currentPlayerId={currentPlayerId}
//               onMoveCoin={handleMoveCoin}
//             />
//             {gameState.currentTurn === currentPlayerId && (
//               <div className="absolute bottom-4 right-4">
//                 <Dice
//                   value={gameState.diceValue}
//                   onRoll={handleRollDice}
//                   disabled={gameState.diceValue !== 0}
//                 />
//               </div>
//             )}
//           </div>
//         );

//       case 'trivia':
//         return <TriviaGame socket={socket} roomId={roomId!} currentPlayer={currentPlayerId} gameState={gameState} />

//       case 'chess':
//         return renderChessGame({
//           socket,
//           roomId: roomId!,
//           currentPlayer: currentPlayerId,
//           gameState,
//         });

//       case 'uno':
//         return renderUnoGame({
//           socket,
//           roomId: roomId!,
//           currentPlayer: currentPlayerId,
//           gameState,
//         });

//       case 'kahoot':
//         return renderKahootGame({
//           socket,
//           roomId: roomId!,
//           currentPlayer: currentPlayerId,
//           gameState,
//         });

//       case 'pictionary':
//         return renderPictionaryGame({
//           socket,
//           roomId: roomId!,
//           currentPlayer: currentPlayerId,
//           gameState,
//         });

//       default:
//         return (
//           <div className="text-center text-gray-400">
//             Game "{gameType}" not implemented yet
//           </div>
//         );
//     }
//   };

//   const toggleSidebar = (sidebar: string) => {
//     if (sidebar === 'players') {
//       if (window.innerWidth < 1024 && showChat) setShowChat(false);
//       setShowPlayers(!showPlayers);
//     } else if (sidebar === 'chat') {
//       if (window.innerWidth < 1024 && showPlayers) setShowPlayers(false);
//       setShowChat(!showChat);
//     }
//   };

//   const handleExit = () => {
//     if (socket) {
//       socket.emit('leaveGame', { roomId, playerId: currentPlayerId });
//     }
//     navigate('/');
//   };

//   // Show loading state if not connected
//   if (!socket || !isConnected) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-900">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
//           <p className="text-gray-400">Connecting to game room...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={`flex flex-col h-screen bg-gray-900 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
//       {/* Topbar */}
//       <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-3 flex items-center justify-between">
//         <div className="flex items-center">
//           <button onClick={handleExit} className="mr-4 p-2 rounded-lg hover:bg-gray-700 transition-colors">
//             <XIcon size={20} />
//           </button>
//           <h1 className="font-bold text-base sm:text-xl truncate">{gameState?.roomName || roomInfo?.name || 'Game Room'}</h1>
//           <div className="ml-3 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-400">
//             {gameType}
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           <button onClick={() => setShowVideoGrid(!showVideoGrid)} className={`p-2 rounded-lg ${showVideoGrid ? 'bg-purple-600' : 'hover:bg-gray-700'}`}>
//             <VideoIcon size={20} />
//           </button>
//           <button onClick={() => toggleSidebar('players')} className={`p-2 rounded-lg ${showPlayers ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
//             <UsersIcon size={20} />
//           </button>
//           <button onClick={() => toggleSidebar('chat')} className={`p-2 rounded-lg ${showChat ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
//             <MessageCircleIcon size={20} />
//           </button>
//           <button onClick={() => setFullscreen(!fullscreen)} className="hidden sm:block p-2 rounded-lg hover:bg-gray-700">
//             {fullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
//           </button>
//         </div>
//       </div>

//       {/* Main Content Layout */}
//       <div className="flex flex-1 overflow-hidden">
//         {showPlayers && (
//           <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
//             <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//               <h3 className="font-medium">Players ({players.length})</h3>
//               <button onClick={() => setShowPlayers(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
//                 <XIcon size={16} />
//               </button>
//             </div>
//             <PlayerList players={players} currentPlayerId={currentPlayerId} currentTurn={gameState?.currentTurn} />
//           </div>
//         )}

//         <div className="flex-1 bg-gray-850">
//           <div className="h-full p-2 sm:p-4">{renderGameContent()}</div>
//         </div>

//         {showChat && (
//           <div className="w-full sm:w-64 border-l border-gray-700 bg-gray-800 flex flex-col fixed sm:relative inset-y-0 right-0 z-30">
//             <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//               <h3 className="font-medium">Chat</h3>
//               <button onClick={() => setShowChat(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
//                 <XIcon size={16} />
//               </button>
//             </div>
//             <div className="flex-1 overflow-y-auto p-3 space-y-4">
//               {messages.map((msg, index) => (
//                 <div key={index} className="flex">
//                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.playerId}`} alt="" className="w-8 h-8 rounded-full border border-gray-600 mr-2" />
//                   <div>
//                     <div className="text-sm font-medium">{msg.playerId}</div>
//                     <div className="text-sm text-gray-300">{msg.message}</div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <div className="p-3 border-t border-gray-700">
//               <form onSubmit={handleSendMessage} className="flex items-center">
//                 <input
//                   type="text"
//                   className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
//                   placeholder="Type a message..."
//                   value={message}
//                   onChange={(e) => setMessage(e.target.value)}
//                 />
//                 <button type="submit" className="p-2 ml-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors">
//                   <SendIcon size={20} />
//                 </button>
//               </form>
//             </div>
//           </div>
//         )}
//       </div>

//       <MediaControls
//         videoEnabled={videoEnabled}
//         audioEnabled={audioEnabled}
//         isScreenSharing={isScreenSharing}
//         onToggleVideo={() => setVideoEnabled(!videoEnabled)}
//         onToggleAudio={() => setAudioEnabled(!audioEnabled)}
//         onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
//         onLeaveCall={handleExit}
//       />

//       {(showPlayers || showChat) && (
//         <div className="fixed inset-0 bg-black/50 z-20 sm:hidden" onClick={() => {
//           setShowPlayers(false);
//           setShowChat(false);
//         }} />
//       )}
//     </div>
//   );
// };



// // LiveGameRoomPage.tsx
// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import io from 'socket.io-client';
// import { LudoGame } from '../components/Ludo/LudoGame';
// import { TriviaGame } from '../components/Trivia/TriviaGame';
// import { renderChessGame } from '../components/Chess/ChessGame';
// import { renderUnoGame } from '../components/Uno/UnoGame';
// import { renderKahootGame } from '../components/Kahoot/KahootGame';
// import { renderPictionaryGame } from '../components/Pictionary/PictionaryGame';

// import { GameRoomInfo } from '../components/GameRoom/GameRoomInfo';
// import { PlayerList } from '../components/GameRoom/PlayerList';
// import { Chat } from '../components/GameRoom/Chat';
// import { Dice } from '../components/Ludo/Dice';
// import {
//   XIcon, UsersIcon, MessageCircleIcon, SendIcon, VideoIcon,
//   SmileIcon, SettingsIcon, MaximizeIcon, MinimizeIcon
// } from 'lucide-react';
// import { MediaControls } from '../components/GameRoom/MediaControls';
// import { VideoGrid } from '../components/GameRoom/VideoGrid';
// import { useSocket } from '../SocketContext';

// // Type for socket
// type SocketType = ReturnType<typeof io>;

// export const LiveGameRoomPage = () => {
//   const { id: roomId } = useParams<{ id: string }>();
//   const navigate = useNavigate();
//   const [socket, setSocket] = useState<SocketType | null>(null);
  
//   // Initialize gameState with proper default structure
//   const [gameState, setGameState] = useState<any>({
//     players: [
//       { id: 0, color: 'red', name: 'Red', coins: [0, 0, 0, 0] },
//       { id: 1, color: 'blue', name: 'Blue', coins: [0, 0, 0, 0] },
//       { id: 2, color: 'green', name: 'Green', coins: [0, 0, 0, 0] },
//       { id: 3, color: 'yellow', name: 'Yellow', coins: [0, 0, 0, 0] }
//     ],
//     currentPlayer: 0,
//     diceValue: 0,
//     diceRolled: false,
//     winner: null,
//     gameStarted: false,
//     gameOver: false,
//     roomName: '',
//     gameType: ''
//   });
  
//   const [players, setPlayers] = useState<any[]>([]);
//   const [messages, setMessages] = useState<any[]>([]);
//   const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
//   const [message, setMessage] = useState('');
//   const [showChat, setShowChat] = useState(true);
//   const [showPlayers, setShowPlayers] = useState(true);
//   const [fullscreen, setFullscreen] = useState(false);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [showVideoGrid, setShowVideoGrid] = useState(false);

//   const gameType = gameState?.gameType;

//   // const socket = useSocket();
//   // const { roomId } = useParams();
  
//   useEffect(() => {
//     if (!socket) return;
    
//     // Setup all your game room socket listeners here
//     socket.on('gameState', (gameState:any) => {
//       // Handle game state updates
//     });
    
//     socket.on('playerJoined', (player:any) => {
//       // Handle new player
//     });
    
//     return () => {
//       // Clean up listeners but don't disconnect socket
//       socket.off('gameState');
//       socket.off('playerJoined');
//     };
//   }, [socket, roomId]);

//   // useEffect(() => {
//   //   const newSocket = io('https://alu-globe-gameroom.onrender.com');
//   //   setSocket(newSocket);

//   //   const playerId = localStorage.getItem('playerId') || `player-${Math.random().toString(36).substr(2, 9)}`;
//   //   localStorage.setItem('playerId', playerId);
//   //   setCurrentPlayerId(playerId);

//   //   newSocket.emit('joinGame', { roomId, playerId: localStorage.getItem('userId') });

//   //   // Enhanced gameState handler with proper merging
//   //   newSocket.on('gameState', (state: any) => {
//   //     setGameState((prev: any) => {
//   //       // Ensure we preserve essential structure
//   //       const newState = {
//   //         ...prev,
//   //         ...state,
//   //         players: state.players && Array.isArray(state.players) && state.players.length > 0 
//   //           ? state.players 
//   //           : prev.players // Keep existing players if new state doesn't have valid players
//   //       };
        
//   //       // Additional validation for players structure
//   //       if (newState.players && Array.isArray(newState.players)) {
//   //         newState.players = newState.players.map((player: any, index: number) => ({
//   //           id: player.id !== undefined ? player.id : index,
//   //           color: player.color || ['red', 'blue', 'green', 'yellow'][index],
//   //           name: player.name || ['Red', 'Blue', 'Green', 'Yellow'][index],
//   //           coins: Array.isArray(player.coins) ? player.coins : [0, 0, 0, 0]
//   //         }));
//   //       }
        
//   //       return newState;
//   //     });
//   //   });

//   //   newSocket.on('playerJoined', ({ player }: any) => setPlayers(prev => [...prev, player]));
//   //   newSocket.on('diceRolled', ({ diceValue }: any) => setGameState((prev: any) => ({ ...prev, diceValue })));
//   //   newSocket.on('coinMoved', ({ coins, currentTurn }: any) => setGameState((prev: any) => ({ ...prev, coins, currentTurn })));
//   //   newSocket.on('gameStarted', () => setGameState((prev: any) => ({ ...prev, gameStarted: true })));
//   //   newSocket.on('gameOver', ({ winner }: any) => setGameState((prev: any) => ({ ...prev, gameOver: true, winner })));
//   //   newSocket.on('chatMessage', (message: any) => setMessages(prev => [...prev, message]));

//   //   return () => {
//   //     newSocket.disconnect();
//   //   }
//   // }, [roomId]);

//   const handleRollDice = () => {
//     if (socket && gameState?.currentTurn === currentPlayerId && gameState.diceValue === 0) {
//       socket.emit('rollDice', { roomId, playerId: currentPlayerId });
//     }
//   };

//   const handleMoveCoin = (coinId: string) => {
//     if (socket && gameState?.currentTurn === currentPlayerId && gameState.diceValue > 0) {
//       socket.emit('moveCoin', { roomId, playerId: currentPlayerId, coinId });
//     }
//   };

//   const handleStartGame = () => {
//     if (socket) {
//       socket.emit('startGame', { roomId });
//     }
//   };

//   const sendMessage = (text: string) => {
//     if (socket) {
//       socket.emit('chatMessage', { roomId, playerId: currentPlayerId, message: text });
//     }
//   };

//   const handleSendMessage = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (message.trim()) {
//       sendMessage(message);
//       setMessage('');
//     }
//   };

//   // const renderGameContent = () => {
//   //   if (gameType.toLowerCase() === 'ludo') {
//   //     return gameState?.gameStarted ? (
//   //       <div className="relative w-full h-full">
//   //         <LudoGame gameState={gameState} currentPlayerId={currentPlayerId} onMoveCoin={handleMoveCoin} />
//   //         {gameState.currentTurn === currentPlayerId && (
//   //           <div className="absolute bottom-4 right-4">
//   //             <Dice
//   //               value={gameState.diceValue}
//   //               onRoll={handleRollDice}
//   //               disabled={gameState.diceValue !== 0}
//   //             />
//   //           </div>
//   //         )}
//   //       </div>
//   //     ) : (
//   //       <div className="flex flex-col items-center justify-center h-full">
//   //         <h2 className="text-2xl mb-4">Waiting for players...</h2>
//   //         <button onClick={handleStartGame} className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700">
//   //           Start Game
//   //         </button>
//   //       </div>
//   //     );
//   //   }

//   //   return <div className="text-center text-gray-400">Game "{gameType}" not implemented yet</div>;
//   // };

//   const renderGameContent = () => {
//     const lowerCaseGameType = gameType.toLowerCase();
    
  
//     if (!gameState?.gameStarted) {
//       return (
//         <div className="flex flex-col items-center justify-center h-full">
//           <h2 className="text-2xl mb-4">Waiting for players...</h2>
//           <button
//             onClick={handleStartGame}
//             className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700"
//           >
//             Start Game
//           </button>
//         </div>
//       );
//     }
  
//     switch (lowerCaseGameType) {
//       case 'ludo':
//         return (
//           <div className="relative w-full h-full">
//             <LudoGame
//               gameState={gameState}
//               currentPlayerId={currentPlayerId}
//               onMoveCoin={handleMoveCoin}
//             />
//             {gameState.currentTurn === currentPlayerId && (
//               <div className="absolute bottom-4 right-4">
//                 <Dice
//                   value={gameState.diceValue}
//                   onRoll={handleRollDice}
//                   disabled={gameState.diceValue !== 0}
//                 />
//               </div>
//             )}
//           </div>
//         );
  
//       case 'trivia':
//         return <TriviaGame socket={socket} roomId={roomId!} currentPlayer={currentPlayerId} gameState={gameState} />
  
//         case 'chess':
//     return renderChessGame({
//       socket,
//       roomId: roomId!,
//       currentPlayer: currentPlayerId,
//       gameState,
//     });

//   case 'uno':
//     return renderUnoGame({
//       socket,
//       roomId: roomId!,
//       currentPlayer: currentPlayerId,
//       gameState,
//     });

//   case 'kahoot':
//     return renderKahootGame({
//       socket,
//       roomId: roomId!,
//       currentPlayer: currentPlayerId,
//       gameState,
//     });

//   case 'pictionary':
//     return renderPictionaryGame({
//       socket,
//       roomId: roomId!,
//       currentPlayer: currentPlayerId,
//       gameState,
//     });
//       // case 'chess':
//       //   return <renderChessGame socket={socket} roomId={roomId!} currentPlayer={currentPlayerId} gameState={gameState} />;
  
//       // case 'uno':
//       //   return <renderUnoGame socket={socket} roomId={roomId!} currentPlayer={currentPlayerId} gameState={gameState} />;
  
//       // case 'kahoot':
//       //   return <renderKahootGame socket={socket} roomId={roomId!} currentPlayer={currentPlayerId} gameState={gameState} />;
  
//       // case 'pictionary':
//       //   return <renderPictionaryGame socket={socket} roomId={roomId!} currentPlayer={currentPlayerId} gameState={gameState} />;
  
//       default:
//         return (
//           <div className="text-center text-gray-400">
//             Game "{gameType}" not implemented yet
//           </div>
//         );
//     }
//   };
  

//   const toggleSidebar = (sidebar: string) => {
//     if (sidebar === 'players') {
//       if (window.innerWidth < 1024 && showChat) setShowChat(false);
//       setShowPlayers(!showPlayers);
//     } else if (sidebar === 'chat') {
//       if (window.innerWidth < 1024 && showPlayers) setShowPlayers(false);
//       setShowChat(!showChat);
//     }
//   };

//   const handleExit = () => {
//     navigate('/');
//   };

//   return (
//     <div className={`flex flex-col h-screen bg-gray-900 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
//       {/* Topbar */}
//       <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-3 flex items-center justify-between">
//         <div className="flex items-center">
//           <button onClick={handleExit} className="mr-4 p-2 rounded-lg hover:bg-gray-700 transition-colors">
//             <XIcon size={20} />
//           </button>
//           <h1 className="font-bold text-base sm:text-xl truncate">{gameState?.roomName || 'Game Room'}</h1>
//           <div className="ml-3 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-400">
//             {gameType}
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           <button onClick={() => setShowVideoGrid(!showVideoGrid)} className={`p-2 rounded-lg ${showVideoGrid ? 'bg-purple-600' : 'hover:bg-gray-700'}`}>
//             <VideoIcon size={20} />
//           </button>
//           <button onClick={() => toggleSidebar('players')} className={`p-2 rounded-lg ${showPlayers ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
//             <UsersIcon size={20} />
//           </button>
//           <button onClick={() => toggleSidebar('chat')} className={`p-2 rounded-lg ${showChat ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
//             <MessageCircleIcon size={20} />
//           </button>
//           <button onClick={() => setFullscreen(!fullscreen)} className="hidden sm:block p-2 rounded-lg hover:bg-gray-700">
//             {fullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
//           </button>
//         </div>
//       </div>

//       {/* Main Content Layout */}
//       <div className="flex flex-1 overflow-hidden">
//         {showPlayers && (
//           <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
//             <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//               <h3 className="font-medium">Players ({players.length})</h3>
//               <button onClick={() => setShowPlayers(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
//                 <XIcon size={16} />
//               </button>
//             </div>
//             <PlayerList players={players} currentPlayerId={currentPlayerId} currentTurn={gameState?.currentTurn} />
//           </div>
//         )}

//         <div className="flex-1 bg-gray-850">
//           <div className="h-full p-2 sm:p-4">{renderGameContent()}</div>
//         </div>

//         {showChat && (
//           <div className="w-full sm:w-64 border-l border-gray-700 bg-gray-800 flex flex-col fixed sm:relative inset-y-0 right-0 z-30">
//             <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//               <h3 className="font-medium">Chat</h3>
//               <button onClick={() => setShowChat(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
//                 <XIcon size={16} />
//               </button>
//             </div>
//             <div className="flex-1 overflow-y-auto p-3 space-y-4">
//               {messages.map((msg, index) => (
//                 <div key={index} className="flex">
//                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.playerId}`} alt="" className="w-8 h-8 rounded-full border border-gray-600 mr-2" />
//                   <div>
//                     <div className="text-sm font-medium">{msg.playerId}</div>
//                     <div className="text-sm text-gray-300">{msg.message}</div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <div className="p-3 border-t border-gray-700">
//               <form onSubmit={handleSendMessage} className="flex items-center">
//                 <input
//                   type="text"
//                   className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
//                   placeholder="Type a message..."
//                   value={message}
//                   onChange={(e) => setMessage(e.target.value)}
//                 />
//                 <button type="submit" className="p-2 ml-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors">
//                   <SendIcon size={20} />
//                 </button>
//               </form>
//             </div>
//           </div>
//         )}
//       </div>

//       <MediaControls
//         videoEnabled={videoEnabled}
//         audioEnabled={audioEnabled}
//         isScreenSharing={isScreenSharing}
//         onToggleVideo={() => setVideoEnabled(!videoEnabled)}
//         onToggleAudio={() => setAudioEnabled(!audioEnabled)}
//         onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
//         onLeaveCall={handleExit}
//       />

//       {(showPlayers || showChat) && (
//         <div className="fixed inset-0 bg-black/50 z-20 sm:hidden" onClick={() => {
//           setShowPlayers(false);
//           setShowChat(false);
//         }} />
//       )}
//     </div>
//   );
// };



