import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { LudoGame } from '../components/Ludo/LudoGame';
import { GameRoomInfo } from '../components/GameRoom/GameRoomInfo';
import { PlayerList } from '../components/GameRoom/PlayerList';
import { Chat } from '../components/GameRoom/Chat';
import { Dice } from '../components/Ludo/Dice';

// Define the socket type based on the return type of io()
type SocketType = ReturnType<typeof io>;

export const LiveGameRoomPage = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(''); // This should come from auth

  // Early return if roomId is undefined
  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Room Not Found</h1>
          <p>Invalid room ID</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('https://alu-globe-gameroom.onrender.com'); // Replace with your backend URL
    setSocket(newSocket);

    // Get current player ID (from auth or local storage)
    const playerId = localStorage.getItem('playerId') || `player-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('playerId', playerId);
    setCurrentPlayerId(playerId);

    // Join game room
    newSocket.emit('joinGame', { roomId, playerId });

    // Set up event listeners
    newSocket.on('gameState', (state:any) => {
      setGameState(state);
    });

    newSocket.on('playerJoined', ({ player }:any) => {
      setPlayers(prev => [...prev, player]);
    });

    newSocket.on('diceRolled', ({ diceValue }:any) => {
      setGameState((prev:any) => ({ ...prev, diceValue }));
    });

    newSocket.on('coinMoved', ({ coins, currentTurn }:any) => {
      setGameState((prev:any) => ({ ...prev, coins, currentTurn }));
    });

    newSocket.on('gameStarted', () => {
      setGameState((prev:any) => ({ ...prev, gameStarted: true }));
    });

    newSocket.on('gameOver', ({ winner }:any) => {
      setGameState((prev:any) => ({ ...prev, gameOver: true, winner }));
    });

    newSocket.on('chatMessage', (message:any) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

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
    if (socket) {
      socket.emit('startGame', { roomId });
    }
  };

  const sendMessage = (message: string) => {
    if (socket) {
      socket.emit('chatMessage', { roomId, playerId: currentPlayerId, message });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-900 text-white p-4 gap-4">
      <div className="lg:w-3/4 flex flex-col">
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <GameRoomInfo roomId={roomId} gameState={gameState} />
        </div>
        
        <div className="flex-1 bg-gray-800 rounded-lg p-4 relative">
          {gameState?.gameStarted ? (
            <>
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-2xl mb-4">Waiting for players...</h2>
              <button 
                onClick={handleStartGame}
                className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Start Game
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="lg:w-1/4 flex flex-col gap-4">
        <div className="bg-gray-800 rounded-lg p-4 flex-1">
          <PlayerList 
            players={players} 
            currentPlayerId={currentPlayerId}
            currentTurn={gameState?.currentTurn}
          />
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 flex-1">
          <Chat 
            messages={messages}
            onSendMessage={sendMessage}
            currentPlayerId={currentPlayerId}
          />
        </div>
      </div>
    </div>
  );

          }




   
          
          
// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { Socket } from 'socket.io-client';
// import { LudoGame } from '../components/Ludo/LudoGame';
// import { GameRoomInfo } from '../components/GameRoom/GameRoomInfo';
// import { PlayerList } from '../components/GameRoom/PlayerList';
// import { Chat } from '../components/GameRoom/Chat';
// import { Dice } from '../components/Ludo/Dice';
// import  io  from 'socket.io-client';

// type SocketType = ReturnType<typeof io>;

// export const LiveGameRoomPage = () => {
//   const { id: roomId } = useParams();
//   const [socket, setSocket] = useState<SocketType | null>(null);
//   const [gameState, setGameState] = useState<any>(null);
//   const [players, setPlayers] = useState<any[]>([]);
//   const [messages, setMessages] = useState<any[]>([]);
//   const [currentPlayerId, setCurrentPlayerId] = useState<string>(''); // This should come from auth

//   useEffect(() => {
//     // Initialize socket connection
//     const newSocket = io('https://alu-globe-gameroom.onrender.com'); // Replace with your backend URL
//     setSocket(newSocket);

//     // Get current player ID (from auth or local storage)
//     const playerId = localStorage.getItem('playerId') || `player-${Math.random().toString(36).substr(2, 9)}`;
//     localStorage.setItem('playerId', playerId);
//     setCurrentPlayerId(playerId);

//     // Join game room
//     newSocket.emit('joinGame', { roomId, playerId });

//     // Set up event listeners
//     newSocket.on('gameState', (state:any) => {
//       setGameState(state);
//     });

//     newSocket.on('playerJoined', ({ player }:any) => {
//       setPlayers(prev => [...prev, player]);
//     });

//     newSocket.on('diceRolled', ({ diceValue }:any) => {
//       setGameState((prev:any) => ({ ...prev, diceValue }));
//     });

//     newSocket.on('coinMoved', ({ coins, currentTurn }:any) => {
//       setGameState((prev:any) => ({ ...prev, coins, currentTurn }));
//     });

//     newSocket.on('gameStarted', () => {
//       setGameState((prev:any) => ({ ...prev, gameStarted: true }));
//     });

//     newSocket.on('gameOver', ({ winner }:any) => {
//       setGameState((prev:any) => ({ ...prev, gameOver: true, winner }));
//     });

//     newSocket.on('chatMessage', (message:any) => {
//       setMessages(prev => [...prev, message]);
//     });

//     return () => {
//       newSocket.disconnect();
//     };
//   }, [roomId]);

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

//   const sendMessage = (message: string) => {
//     if (socket) {
//       socket.emit('chatMessage', { roomId, playerId: currentPlayerId, message });
//     }
//   };

//   return (
//     <div className="flex flex-col lg:flex-row h-screen bg-gray-900 text-white p-4 gap-4">
//       <div className="lg:w-3/4 flex flex-col">
//         <div className="bg-gray-800 rounded-lg p-4 mb-4">
//           <GameRoomInfo roomId={roomId} gameState={gameState} />
//         </div>
        
//         <div className="flex-1 bg-gray-800 rounded-lg p-4 relative">
//           {gameState?.gameStarted ? (
//             <>
//               <LudoGame 
//                 gameState={gameState} 
//                 currentPlayerId={currentPlayerId}
//                 onMoveCoin={handleMoveCoin}
//               />
//               {gameState.currentTurn === currentPlayerId && (
//                 <div className="absolute bottom-4 right-4">
//                   <Dice 
//                     value={gameState.diceValue} 
//                     onRoll={handleRollDice}
//                     disabled={gameState.diceValue !== 0}
//                   />
//                 </div>
//               )}
//             </>
//           ) : (
//             <div className="flex flex-col items-center justify-center h-full">
//               <h2 className="text-2xl mb-4">Waiting for players...</h2>
//               <button 
//                 onClick={handleStartGame}
//                 className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700"
//               >
//                 Start Game
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
      
//       <div className="lg:w-1/4 flex flex-col gap-4">
//         <div className="bg-gray-800 rounded-lg p-4 flex-1">
//           <PlayerList 
//             players={players} 
//             currentPlayerId={currentPlayerId}
//             currentTurn={gameState?.currentTurn}
//           />
//         </div>
        
//         <div className="bg-gray-800 rounded-lg p-4 flex-1">
//           <Chat 
//             messages={messages}
//             onSendMessage={sendMessage}
//             currentPlayerId={currentPlayerId}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// import React, { useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { XIcon, UsersIcon, MessageCircleIcon, SendIcon, VideoIcon, SmileIcon, SettingsIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react';
// import { VideoGrid } from '../components/GameRoom/VideoGrid';
// import { MediaControls } from '../components/GameRoom/MediaControls';

// // Mock data for demonstration
// const MOCK_GAME_ROOMS = {
//   1: {
//     id: 1,
//     name: 'Trivia Night!',
//     gameType: 'Trivia',
//     hostName: 'Sarah',
//     hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
//     currentPlayers: 8,
//     maxPlayers: 15,
//     isPrivate: false,
//     isInviteOnly: false
//   },
//   2: {
//     id: 2,
//     name: 'Chess Tournament',
//     gameType: 'Chess',
//     hostName: 'Michael',
//     hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
//     currentPlayers: 6,
//     maxPlayers: 10,
//     isPrivate: false,
//     isInviteOnly: true
//   }
// };

// export const LiveGameRoomPage = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [message, setMessage] = useState('');
//   const [showChat, setShowChat] = useState(true);
//   const [showPlayers, setShowPlayers] = useState(true);
//   const [fullscreen, setFullscreen] = useState(false);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [showVideoGrid, setShowVideoGrid] = useState(false);
//   const chatMessages = [{
//     id: 1,
//     sender: 'Sarah',
//     message: 'Good luck everyone!',
//     time: '2:30 PM',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
//   }, {
//     id: 2,
//     sender: 'Michael',
//     message: 'This is going to be fun!',
//     time: '2:31 PM',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'
//   }, {
//     id: 3,
//     sender: 'Emma',
//     message: "I'm ready to start!",
//     time: '2:32 PM',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
//   }, {
//     id: 4,
//     sender: 'David',
//     message: "Let's do this!",
//     time: '2:33 PM',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
//   }];

//   const game = MOCK_GAME_ROOMS[Number(id)] || {
//     id: 1,
//     name: 'Trivia Night!',
//     gameType: 'Trivia',
//     hostName: 'Sarah',
//     hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
//     currentPlayers: 8,
//     maxPlayers: 15,
//     isPrivate: false,
//     isInviteOnly: false
//   };

//   const players = [{
//     id: 1,
//     name: 'Sarah',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
//     score: 1200,
//     isHost: true
//   }, {
//     id: 2,
//     name: 'Michael',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
//     score: 950
//   }, {
//     id: 3,
//     name: 'Jessica',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
//     score: 1050
//   }, {
//     id: 4,
//     name: 'David',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
//     score: 800
//   }, {
//     id: 5,
//     name: 'Emma',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
//     score: 1100
//   }, {
//     id: 6,
//     name: 'Daniel',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel',
//     score: 750
//   }, {
//     id: 7,
//     name: 'Alex',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
//     score: 900
//   }, {
//     id: 8,
//     name: 'Sophia',
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
//     score: 1000
//   }];

//   const mockParticipants = [{
//     id: 1,
//     name: 'You',
//     isLocal: true,
//     videoEnabled: videoEnabled,
//     audioEnabled: audioEnabled,
//     avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You'
//   }, ...players.slice(0, 5).map(player => ({
//     id: player.id,
//     name: player.name,
//     isLocal: false,
//     videoEnabled: Math.random() > 0.5,
//     audioEnabled: Math.random() > 0.3,
//     avatar: player.avatar
//   }))];

//   const toggleSidebar = sidebar => {
//     if (sidebar === 'players') {
//       if (window.innerWidth < 1024 && showChat) {
//         setShowChat(false);
//       }
//       setShowPlayers(!showPlayers);
//     } else if (sidebar === 'chat') {
//       if (window.innerWidth < 1024 && showPlayers) {
//         setShowPlayers(false);
//       }
//       setShowChat(!showChat);
//     }
//   };

//   const handleSendMessage = e => {
//     e.preventDefault();
//     setMessage('');
//   };

//   const renderGameContent = () => {
//     switch (game.gameType.toLowerCase()) {
//       case 'trivia':
//         return renderTriviaGame();
//       case 'chess':
//         return renderChessGame();
//       case 'uno':
//         return renderUnoGame();
//       case 'kahoot':
//         return renderKahootGame();
//       case 'pictionary':
//         return renderPictionaryGame();
//       default:
//         return <div className="flex items-center justify-center h-full">
//             <div className="text-center">
//               <h3 className="text-2xl font-bold mb-2">Game Loading...</h3>
//               <p className="text-gray-400">Preparing your game experience</p>
//             </div>
//           </div>;
//     }
//   };

//   const renderTriviaGame = () => {
//     return <div className="flex flex-col h-full">
//         <div className="flex-1 flex flex-col items-center justify-center p-8">
//           <div className="mb-4 text-purple-400 text-lg">Question 3 of 10</div>
//           <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
//             What is the largest planet in our solar system?
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
//             <button className="p-4 bg-blue-600/30 border border-blue-500/50 rounded-lg text-left hover:bg-blue-600/50 transition-colors">
//               A. Earth
//             </button>
//             <button className="p-4 bg-green-600/30 border border-green-500/50 rounded-lg text-left hover:bg-green-600/50 transition-colors">
//               B. Mars
//             </button>
//             <button className="p-4 bg-yellow-600/30 border border-yellow-500/50 rounded-lg text-left hover:bg-yellow-600/50 transition-colors">
//               C. Jupiter
//             </button>
//             <button className="p-4 bg-red-600/30 border border-red-500/50 rounded-lg text-left hover:bg-red-600/50 transition-colors">
//               D. Saturn
//             </button>
//           </div>
//         </div>
//         <div className="p-4 flex justify-center">
//           <div className="w-16 h-16 rounded-full bg-purple-600/30 border-4 border-purple-500 flex items-center justify-center text-2xl font-bold">
//             15
//           </div>
//         </div>
//       </div>;
//   };

//   const renderChessGame = () => {
//     return <div className="flex items-center justify-center h-full">
//         <div className="w-full max-w-lg aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden shadow-lg">
//           <div className="grid grid-cols-8 grid-rows-8 h-full">
//             {Array(64).fill(0).map((_, i) => {
//             const row = Math.floor(i / 8);
//             const col = i % 8;
//             const isBlack = (row + col) % 2 === 1;
//             return <div key={i} className={`${isBlack ? 'bg-gray-700' : 'bg-gray-300'} flex items-center justify-center`}>
//                     {/* Chess pieces would go here */}
//                   </div>;
//           })}
//           </div>
//         </div>
//       </div>;
//   };

//   const renderUnoGame = () => {
//     return <div className="flex flex-col items-center justify-between h-full p-4">
//         <div className="flex justify-center mb-4">
//           <div className="flex space-x-2">
//             {Array(7).fill(0).map((_, i) => <div key={i} className="w-12 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-md shadow-md transform -rotate-12 border-2 border-white/20"></div>)}
//           </div>
//         </div>
//         <div className="flex-1 flex items-center justify-center">
//           <div className="relative">
//             <div className="w-24 h-36 bg-gray-700 rounded-lg border border-gray-600 absolute -rotate-6 transform translate-x-2"></div>
//             <div className="w-24 h-36 bg-gradient-to-br from-red-500 to-red-700 rounded-lg border-2 border-white/30 shadow-lg flex items-center justify-center text-2xl font-bold z-10 relative">
//               7
//             </div>
//           </div>
//         </div>
//         <div className="flex justify-center mt-4">
//           <div className="flex space-x-2">
//             {['red', 'blue', 'green', 'yellow', 'red', 'blue', 'wild'].map((color, i) => <div key={i} className={`w-16 h-24 rounded-md shadow-lg hover:-translate-y-4 transition-transform cursor-pointer border-2 border-white/20 ${color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-700' : color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-700' : color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-700' : 'bg-gradient-to-br from-purple-500 to-pink-500'} flex items-center justify-center text-3xl font-bold`}>
//                   {i + 1}
//                 </div>)}
//           </div>
//         </div>
//       </div>;
//   };

//   const renderKahootGame = () => {
//     return <div className="flex flex-col h-full">
//         <div className="bg-purple-900 p-6 text-center">
//           <h2 className="text-2xl font-bold">
//             Who invented the World Wide Web?
//           </h2>
//         </div>
//         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
//           <button className="bg-red-600 hover:bg-red-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-red-800 mr-3 flex items-center justify-center">
//               ▲
//             </div>
//             <span className="text-xl">Tim Berners-Lee</span>
//           </button>
//           <button className="bg-blue-600 hover:bg-blue-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-blue-800 mr-3 flex items-center justify-center">
//               ■
//             </div>
//             <span className="text-xl">Bill Gates</span>
//           </button>
//           <button className="bg-yellow-600 hover:bg-yellow-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-yellow-800 mr-3 flex items-center justify-center">
//               ●
//             </div>
//             <span className="text-xl">Steve Jobs</span>
//           </button>
//           <button className="bg-green-600 hover:bg-green-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-green-800 mr-3 flex items-center justify-center">
//               ✦
//             </div>
//             <span className="text-xl">Mark Zuckerberg</span>
//           </button>
//         </div>
//         <div className="p-4 flex justify-center">
//           <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
//             20
//           </div>
//         </div>
//       </div>;
//   };

//   const renderPictionaryGame = () => {
//     return <div className="flex flex-col h-full">
//         <div className="bg-purple-900/50 p-3 text-center">
//           <p className="text-lg">
//             Your word to draw: <strong>Elephant</strong>
//           </p>
//         </div>
//         <div className="flex-1 bg-white rounded-lg m-4 relative">
//           <div className="absolute inset-0 flex items-center justify-center text-gray-400">
//             Drawing canvas would be here
//           </div>
//         </div>
//         <div className="p-3 bg-gray-800 flex justify-center space-x-3">
//           {['black', 'red', 'blue', 'green', 'yellow'].map(color => <button key={color} className={`w-8 h-8 rounded-full ${color === 'black' ? 'bg-black' : color === 'red' ? 'bg-red-500' : color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : 'bg-yellow-500'} border-2 border-white/50`}></button>)}
//           <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
//             ⌫
//           </button>
//           <button className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
//             🧽
//           </button>
//         </div>
//         <div className="p-2 flex justify-center">
//           <div className="px-4 py-1 rounded-full bg-purple-600/30 border border-purple-500 flex items-center justify-center text-lg font-bold">
//             45s remaining
//           </div>
//         </div>
//       </div>;
//   };

//   const handleExit = () => {
//     navigate('/');
//   };

//   return <div className={`flex flex-col h-screen bg-gray-900 ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
//       <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-3 flex items-center justify-between">
//         <div className="flex items-center">
//           <button onClick={handleExit} className="mr-2 sm:mr-4 p-2 rounded-lg hover:bg-gray-700 transition-colors">
//             <XIcon size={18} className="sm:hidden" />
//             <XIcon size={20} className="hidden sm:block" />
//           </button>
//           <h1 className="font-bold text-base sm:text-xl truncate max-w-[150px] sm:max-w-none">
//             {game.name}
//           </h1>
//           <div className="ml-2 sm:ml-3 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-400">
//             {game.gameType}
//           </div>
//         </div>
//         <div className="flex items-center space-x-1 sm:space-x-2">
//           <button onClick={() => setShowVideoGrid(!showVideoGrid)} className={`p-2 rounded-lg transition-colors ${showVideoGrid ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}>
//             <VideoIcon size={18} className="sm:hidden" />
//             <VideoIcon size={20} className="hidden sm:block" />
//           </button>
//           <button onClick={() => toggleSidebar('players')} className={`p-2 rounded-lg transition-colors ${showPlayers ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
//             <UsersIcon size={18} className="sm:hidden" />
//             <UsersIcon size={20} className="hidden sm:block" />
//           </button>
//           <button onClick={() => toggleSidebar('chat')} className={`p-2 rounded-lg transition-colors ${showChat ? 'bg-gray-700 text-purple-400' : 'hover:bg-gray-700'}`}>
//             <MessageCircleIcon size={18} className="sm:hidden" />
//             <MessageCircleIcon size={20} className="hidden sm:block" />
//           </button>
//           <button onClick={() => setFullscreen(!fullscreen)} className="hidden sm:block p-2 rounded-lg hover:bg-gray-700 transition-colors">
//             {fullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
//           </button>
//         </div>
//       </div>
//       <div className="flex flex-1 overflow-hidden">
//         {showPlayers && <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
//             <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//               <h3 className="font-medium">Players ({players.length})</h3>
//               <button onClick={() => setShowPlayers(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
//                 <XIcon size={16} />
//               </button>
//             </div>
//             <div className="divide-y divide-gray-700">
//               {players.map(player => <div key={player.id} className="flex items-center p-3 hover:bg-gray-700/50">
//                   <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full border border-gray-600" />
//                   <div className="ml-3 flex-1">
//                     <div className="flex items-center">
//                       <span className="font-medium">{player.name}</span>
//                       {player.isHost && <span className="ml-2 px-1.5 py-0.5 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-400">
//                           Host
//                         </span>}
//                     </div>
//                     <div className="text-sm text-gray-400">
//                       {player.score} pts
//                     </div>
//                   </div>
//                 </div>)}
//             </div>
//           </div>}
//         {showVideoGrid ? <VideoGrid participants={mockParticipants} /> : <div className="flex-1 flex flex-col overflow-hidden bg-gray-850">
//             <div className="flex-1 overflow-hidden">
//               <div className="h-full p-2 sm:p-4">{renderGameContent()}</div>
//             </div>
//           </div>}
//         {showChat && <div className="w-full sm:w-64 border-l border-gray-700 bg-gray-800 flex flex-col fixed sm:relative inset-y-0 right-0 z-30">
//             <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//               <h3 className="font-medium">Chat</h3>
//               <button onClick={() => setShowChat(false)} className="sm:hidden p-2 hover:bg-gray-700 rounded-lg">
//                 <XIcon size={16} />
//               </button>
//             </div>
//             <div className="flex-1 overflow-y-auto p-3 space-y-4">
//               {chatMessages.map(msg => <div key={msg.id} className="flex">
//                   <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-full border border-gray-600 mr-2" />
//                   <div>
//                     <div className="flex items-baseline">
//                       <span className="font-medium text-sm">{msg.sender}</span>
//                       <span className="ml-2 text-xs text-gray-500">
//                         {msg.time}
//                       </span>
//                     </div>
//                     <p className="text-sm text-gray-300">{msg.message}</p>
//                   </div>
//                 </div>)}
//             </div>
//             <div className="p-2 sm:p-3 border-t border-gray-700">
//               <form onSubmit={handleSendMessage} className="flex items-center">
//                 <input type="text" placeholder="Type a message..." className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500" value={message} onChange={e => setMessage(e.target.value)} />
//                 <button type="button" className="p-2 ml-1 sm:ml-2 rounded-lg hover:bg-gray-700 transition-colors">
//                   <SmileIcon size={18} className="sm:hidden text-gray-400" />
//                   <SmileIcon size={20} className="hidden sm:block text-gray-400" />
//                 </button>
//                 <button type="submit" className="p-2 ml-1 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors">
//                   <SendIcon size={18} className="sm:hidden" />
//                   <SendIcon size={20} className="hidden sm:block" />
//                 </button>
//               </form>
//             </div>
//           </div>}
//       </div>
//       <MediaControls videoEnabled={videoEnabled} audioEnabled={audioEnabled} isScreenSharing={isScreenSharing} onToggleVideo={() => setVideoEnabled(!videoEnabled)} onToggleAudio={() => setAudioEnabled(!audioEnabled)} onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)} onLeaveCall={handleExit} />
//       {(showPlayers || showChat) && <div className="fixed inset-0 bg-black/50 z-20 sm:hidden" onClick={() => {
//       setShowPlayers(false);
//       setShowChat(false);
//     }} />}
//     </div>;
// };