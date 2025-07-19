import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Player, GameState } from "../components/Ludo/types/game";
import { LudoGame } from "../components/Ludo/LudoGame";
import { TriviaGame } from "../components/Trivia/TriviaGame";
import { ChessGame } from "../components/Chess/ChessGame";
import { renderUnoGame } from "../components/Uno/UnoGame";
import  KahootGame  from "../components/Kahoot/KahootGame";
import { renderPictionaryGame } from "../components/Pictionary/PictionaryGame";
import { GameRoomInfo } from "../components/GameRoom/GameRoomInfo";
import { PlayerList } from "../components/GameRoom/PlayerList";
import { Chat } from "../components/GameRoom/Chat";
import { Dice } from "../components/Ludo/Dice";
import {
  XIcon,
  UsersIcon,
  MessageCircleIcon,
  SendIcon,
  VideoIcon,
  SmileIcon,
  SettingsIcon,
  MaximizeIcon,
  MinimizeIcon,
} from "lucide-react";
import { MediaControls } from "../components/GameRoom/MediaControls";
import { VideoGrid } from "../components/GameRoom/VideoGrid";
import { useSocket } from "../SocketContext";
import { useAuth } from "../context/AuthContext";
import { SocketType } from "../SocketContext";

export const LiveGameRoomPage = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [gameState, setGameState] = useState<GameState>({
    roomId: roomId || "",
    players: [],
    currentTurn: "",
    currentPlayer: 0,
    diceValue: 0,
    diceRolled: false,
    coins: {},
    gameStarted: false,
    gameOver: false,
    winner: null,
    roomName: "",
    gameType: "ludo",
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerIdToUsername, setPlayerIdToUsername] = useState<
    Record<string, string>
  >({});
  const [messages, setMessages] = useState<
    { playerId: string; message: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const gameType = gameState?.gameType || roomInfo?.gameType || "ludo";

  // Audio call states
  const [inAudioCall, setInAudioCall] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream }>({});
  const [peers, setPeers] = useState<{ [key: string]: RTCPeerConnection }>({});
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Initialize local stream
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: false 
        });
        setLocalStream(stream);
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };
  
    if (inAudioCall) {
      initLocalStream();
    } else {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      // Clean up all peer connections
      Object.values(peers).forEach(peer => peer.close());
      setPeers({});
      setRemoteStreams({});
    }
  
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [inAudioCall]);
  
  // Update the WebRTC signaling useEffect
  useEffect(() => {
    if (!socket || !inAudioCall || !user?.id) return;
  
    const handleNewPeer = async ({ callerId, signal }: { callerId: string; signal: any }) => {
      if (callerId === user.id) return;
  
      const peer = createPeerConnection(callerId);
      
      try {
        if (signal.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          
          socket.emit('returnSignal', { 
            signal: peer.localDescription, 
            callerId: user.id, 
            roomId 
          });
        } else if (signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (error) {
        console.error('Error handling new peer:', error);
      }
    };
  
    const handleReturnedSignal = async ({ signal, id }: { signal: any; id: string }) => {
      const peer = peers[id];
      if (peer) {
        try {
          if (signal.type === 'answer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signal));
          } else if (signal.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch (error) {
          console.error('Error handling returned signal:', error);
        }
      }
    };
  
    const handlePeerJoined = (peerId: string) => {
      if (peerId === user.id) return;
      offerToPeer(peerId);
    };
  
    const handlePeerLeft = (peerId: string) => {
      if (peers[peerId]) {
        peers[peerId].close();
        const newPeers = { ...peers };
        delete newPeers[peerId];
        setPeers(newPeers);
  
        const newRemoteStreams = { ...remoteStreams };
        delete newRemoteStreams[peerId];
        setRemoteStreams(newRemoteStreams);
      }
    };
  
    socket.on('newPeer', handleNewPeer);
    socket.on('returnedSignal', handleReturnedSignal);
    socket.on('peerJoined', handlePeerJoined);
    socket.on('peerLeft', handlePeerLeft);
  
    // Join audio room
    socket.emit('joinAudio', { roomId, userId: user.id });
  
    return () => {
      socket.off('newPeer', handleNewPeer);
      socket.off('returnedSignal', handleReturnedSignal);
      socket.off('peerJoined', handlePeerJoined);
      socket.off('peerLeft', handlePeerLeft);
      
      // Leave audio room
      socket.emit('leaveAudio', { roomId, userId: user.id });
    };
  }, [socket, roomId, user?.id, inAudioCall, peers, remoteStreams]);
  
  // Update the createPeerConnection function
  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
  
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('signal', {
          signal: { candidate: event.candidate },
          callerId: user?.id,
          roomId,
          targetId: peerId
        });
      }
    };
  
    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: event.streams[0]
      }));
      
      // Update the audio element
      if (remoteAudioRefs.current[peerId]) {
        remoteAudioRefs.current[peerId]!.srcObject = event.streams[0];
      }
    };
  
    peer.oniceconnectionstatechange = () => {
      console.log(`ICE connection state changed for ${peerId}:`, peer.iceConnectionState);
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
        peer.close();
        const newPeers = { ...peers };
        delete newPeers[peerId];
        setPeers(newPeers);
  
        const newRemoteStreams = { ...remoteStreams };
        delete newRemoteStreams[peerId];
        setRemoteStreams(newRemoteStreams);
      }
    };
  
    // Add local tracks if available
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
      });
    }
  
    const newPeers = { ...peers, [peerId]: peer };
    setPeers(newPeers);
  
    return peer;
  };
  
  // Update the offerToPeer function
  const offerToPeer = async (peerId: string) => {
    const peer = createPeerConnection(peerId);
    
    try {
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await peer.setLocalDescription(offer);
      
      socket?.emit('signal', {
        signal: peer.localDescription,
        callerId: user?.id,
        roomId,
        targetId: peerId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const toggleAudioCall = () => {
    if (!inAudioCall) {
      setInAudioCall(true);
    } else {
      // Leave call
      Object.values(peers).forEach(peer => peer.close());
      setPeers({});
      setRemoteStreams({});
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setInAudioCall(false);
      setIsDeafened(false);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!socket || !roomId) return;

    console.log("Socket connected, joining room:", roomId);
    setIsConnected(true);

    socket.emit("joinGame", {
      roomId,
      playerId: user.id,
      playerName: user.username,
      password: "",
    });

    // Initialize playerIdToUsername with current user's username
    setPlayerIdToUsername((prev) => ({
      ...prev,
      [user.id]: user.username,
    }));

    const handleGameState = (newGameState: GameState) => {
      console.log("Game state received:", {
        players: newGameState.players.map((p) => ({ id: p.id, name: p.name })),
        currentPlayer: newGameState.currentPlayer,
        currentTurn: newGameState.currentTurn,
      });
      // Update players with usernames from playerIdToUsername
      const updatedPlayers = newGameState.players.map((p) => ({
        ...p,
        name: playerIdToUsername[p.id] || p.name || p.id,
      }));
      setGameState((prev) => ({
        ...prev,
        ...newGameState,
        coins: newGameState.coins || prev.coins,
        players: updatedPlayers,
      }));
      setPlayers(updatedPlayers);
    };

    const handlePlayerJoined = (data: any) => {
      console.log("Player joined:", data);
      if (data.success) {
        console.log("Successfully joined room");
        // Update playerIdToUsername
        setPlayerIdToUsername((prev) => ({
          ...prev,
          [data.playerId]: data.playerName || data.playerId,
        }));
      }
    };

    const handlePlayerConnected = (data: any) => {
      console.log("Player connected:", data);
      setPlayers((prev) => {
        const existingPlayerIndex = prev.findIndex(
          (p) => p.id === data.playerId
        );
        if (existingPlayerIndex === -1) {
          return [
            ...prev,
            {
              id: data.playerId,
              name: data.playerName || data.playerId,
              color: "",
              coins: [0, 0, 0, 0],
            },
          ];
        }
        return prev;
      });
      // Update playerIdToUsername
      setPlayerIdToUsername((prev) => ({
        ...prev,
        [data.playerId]: data.playerName || data.playerId,
      }));
    };

    const handlePlayerDisconnected = (data: any) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId ? { ...p, isOnline: false } : p
        )
      );
    };

    const handleChatMessage = (data: any) => {
      console.log("Chat message received:", data);
      setMessages((prev) => [...prev, data]);
    };

    const handleDiceRolled = (data: any) => {
      console.log("Dice rolled:", data);
      setGameState((prev) => ({
        ...prev,
        diceValue: data.diceValue,
        diceRolled: true,
        currentTurn: data.playerId,
        currentPlayer: prev.players.findIndex((p) => p.id === data.playerId),
      }));
    };

    const handleCoinMoved = (data: any) => {
      console.log("Coin moved:", data);
      setGameState((prev) => ({
        ...prev,
        coins: data.coins,
        currentTurn: data.currentTurn,
        currentPlayer: data.currentPlayer,
        diceValue: data.diceValue,
        diceRolled: data.diceRolled,
        gameOver: data.gameOver,
        winner: data.winner,
      }));
    };

    const handleChessMove = (move: string) => {
      if (socket && gameState?.currentTurn === user?.id) {
        socket.emit("makeChessMove", { 
          roomId, 
          playerId: user!.id, 
          move 
        });
      }
    };

    const handleKahootAnswer = (data: any) => {
      console.log("Kahoot answer:", data);
      setGameState((prev: any) => ({
        ...prev,
        kahootState: {
          ...prev.kahootState,
          answers: {
            ...prev.kahootState?.answers,
            [data.playerId]: data.answerIndex,
          },
        },
      }));
    };

    const handleGameOver = (data: any) => {
      console.log("Game over:", data);
      setGameState((prev) => ({
        ...prev,
        gameOver: true,
        winner: data.winner,
      }));
    };

    const handleError = (error: any) => {
      console.error("Socket error:", error);
      if (error.type === "startGameError") {
        alert(`Failed to join room: ${error.message}`);
        navigate("/");
      }
    };

    socket.on("gameState", handleGameState);
    socket.on("playerJoined", handlePlayerJoined);
    socket.on("playerConnected", handlePlayerConnected);
    socket.on("playerDisconnected", handlePlayerDisconnected);
    socket.on("chatMessage", handleChatMessage);
    socket.on("diceRolled", handleDiceRolled);
    socket.on("coinMoved", handleCoinMoved);
    socket.on("chessMove", handleChessMove);
    socket.on("kahootAnswer", handleKahootAnswer);
    socket.on("gameOver", handleGameOver);
    socket.on("error", handleError);

    return () => {
      socket.off("gameState", handleGameState);
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("playerConnected", handlePlayerConnected);
      socket.off("playerDisconnected", handlePlayerDisconnected);
      socket.off("chatMessage", handleChatMessage);
      socket.off("diceRolled", handleDiceRolled);
      socket.off("coinMoved", handleCoinMoved);
      socket.off("chessMove", handleChessMove);
      socket.off("kahootAnswer", handleKahootAnswer);
      socket.off("gameOver", handleGameOver);
      socket.off("error", handleError);
    };
  }, [socket, roomId, user, navigate]);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit("getGameState", { roomId });
    }
  }, [socket, roomId]);

  const handleRollDice = () => {
   
    if (
      socket &&
      gameState?.currentTurn === user?.id &&
      gameState.diceValue === 0 &&
      !gameState.currentTurn.startsWith("ai-") // Add this condition
    ) {
      socket.emit("rollDice", { roomId, playerId: user!.id });
    }
  };

  const handleMoveCoin = (coinId: string) => {
    if (
      socket &&
      gameState?.currentTurn === user?.id &&
      gameState.diceValue! > 0
    ) {
      socket.emit("moveCoin", { roomId, playerId: user!.id, coinId });
    }
  };

  const handleChessMove = (move: string) => {
    if (socket && gameState?.currentTurn === user?.id) {
      socket.emit("makeChessMove", { roomId, playerId: user!.id, move });
    }
  };

  const handleKahootAnswer = (answerIndex: number) => {
    if (socket && gameState?.kahootState?.answers[user!.id] === null) {
      socket.emit("submitKahootAnswer", {
        roomId,
        playerId: user!.id,
        answerIndex,
      });
    }
  };

  const handleStartGame = () => {
    console.log("Starting game for room:", roomId);
    if (!socket || !socket.connected) {
      console.error("Socket not connected");
      return;
    }
    if (socket && roomId) {
      socket.emit("startGame", { roomId });
    }
  };

  const sendMessage = (text: string) => {
    if (socket && roomId && user?.id) {
      socket.emit("chatMessage", { roomId, playerId: user.id, message: text });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage("");
    }
  };

  const renderGameContent = () => {
    const lowerCaseGameType = gameType.toLowerCase();

    if (!gameState?.gameStarted) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl mb-4">Waiting for players...</h2>
          <p className="text-gray-400 mb-4">
            Players in room: {players.length}
          </p>
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
      case "ludo":
        return (
          <div className="relative w-full h-full">
            <LudoGame
              gameState={gameState}
              currentPlayerId={user!.id}
              onRollDice={handleRollDice}
              onMoveCoin={handleMoveCoin}
              onStartGame={handleStartGame}
            />
            {gameState.currentTurn === user?.id &&
              typeof gameState.diceValue === "number" && (
                <div className="absolute bottom-4 right-4">
                  <Dice
                    value={gameState.diceValue}
                    onRoll={handleRollDice}
                    disabled={gameState.diceRolled && gameState.diceValue !== 6}
                    // disabled={gameState.diceValue !== 0}
                  />
                </div>
              )}
          </div>
        );

      case "trivia":
        return (
          <TriviaGame
            socket={socket!}
            roomId={roomId!}
            currentPlayer={user!.id}
            gameState={gameState}
          />
        );

      case "chess":
        return (
        <ChessGame
          socket={socket!}
          roomId={roomId!}
          currentPlayer={user!.id}
          gameState={gameState}
          onChessMove={handleChessMove}
        />
        );

      case "uno":
        return renderUnoGame({
          socket,
          roomId: roomId!,
          currentPlayer: user!.id,
          gameState,
        });

      case "kahoot":
        return <KahootGame 
        socket={socket!}
        roomId={roomId!}
        currentPlayer={user!.id}
        gameState={gameState}
      />;

      case "pictionary":
        return renderPictionaryGame({
          socket,
          roomId: roomId!,
          currentPlayer: user!.id,
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
    if (sidebar === "players") {
      if (window.innerWidth < 1024 && showChat) setShowChat(false);
      setShowPlayers(!showPlayers);
    } else if (sidebar === "chat") {
      if (window.innerWidth < 1024 && showPlayers) setShowPlayers(false);
      setShowChat(!showChat);
    }
  };

  const handleExit = () => {
    if (socket) {
      socket.emit("leaveGame", { roomId, playerId: user?.id });
    }
    navigate("/");
  };

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
    <div
      className={`flex flex-col h-screen bg-gray-900 ${
        fullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={handleExit}
            className="mr-4 p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <XIcon size={20} />
          </button>
          <h1 className="font-bold text-base sm:text-xl truncate">
            {gameState?.roomName || roomInfo?.name || "Game Room"}
          </h1>
          <div className="ml-3 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-400">
            {gameType}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVideoGrid(!showVideoGrid)}
            className={`p-2 rounded-lg ${
              showVideoGrid ? "bg-purple-600" : "hover:bg-gray-700"
            }`}
          >
            <VideoIcon size={20} />
          </button>
          <button
            onClick={() => toggleSidebar("players")}
            className={`p-2 rounded-lg ${
              showPlayers ? "bg-gray-700 text-purple-400" : "hover:bg-gray-700"
            }`}
          >
            <UsersIcon size={20} />
          </button>
          <button
            onClick={() => toggleSidebar("chat")}
            className={`p-2 rounded-lg ${
              showChat ? "bg-gray-700 text-purple-400" : "hover:bg-gray-700"
            }`}
          >
            <MessageCircleIcon size={20} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="hidden sm:block p-2 rounded-lg hover:bg-gray-700"
          >
            {fullscreen ? (
              <MinimizeIcon size={20} />
            ) : (
              <MaximizeIcon size={20} />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {showPlayers && (
          <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
            <PlayerList
              players={players}
              currentPlayerId={user!.id}
              currentTurn={gameState?.currentTurn}
            />
          </div>
        )}

        <div className="flex-1 bg-gray-850">
          <div className="h-full p-2 sm:p-4">{renderGameContent()}</div>
        </div>

        {showChat && (
          <div className="w-full sm:w-64 border-l border-gray-700 bg-gray-800 flex flex-col fixed sm:relative inset-y-0 right-0 z-30">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="sm:hidden p-2 hover:bg-gray-700 rounded-lg"
              >
                <XIcon size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className="flex">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.playerId}`}
                    alt=""
                    className="w-8 h-8 rounded-full border border-gray-600 mr-2"
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {playerIdToUsername[msg.playerId] || msg.playerId}
                    </div>
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
                <button
                  type="submit"
                  className="p-2 ml-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
                >
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
        onToggleAudio={toggleMute}
        onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
        onLeaveCall={handleExit}
        onToggleDeafen={toggleDeafen}
        isDeafened={isDeafened}
        inAudioCall={inAudioCall}
        onToggleAudioCall={toggleAudioCall}
        remoteParticipants={Object.keys(remoteStreams)}
      />

      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay playsInline muted={true} style={{ display: 'none' }} />
      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <audio
          key={peerId}
          ref={el => remoteAudioRefs.current[peerId] = el}
          autoPlay
          playsInline
          muted={isDeafened}
          style={{ display: 'none' }}
          onCanPlay={() => {
            if (remoteAudioRefs.current[peerId]) {
              remoteAudioRefs.current[peerId]!.srcObject = stream;
            }
          }}
        />
      ))}

      {(showPlayers || showChat) && (
        <div
          className="fixed inset-0 bg-black/50 z-20 sm:hidden"
          onClick={() => {
            setShowPlayers(false);
            setShowChat(false);
          }}
        />
      )}
    </div>
  );
};

// import React, { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { Player, GameState } from "../components/Ludo/types/game";
// import { LudoGame } from "../components/Ludo/LudoGame";
// import { TriviaGame } from "../components/Trivia/TriviaGame";
// import { ChessGame } from "../components/Chess/ChessGame";
// import { renderUnoGame } from "../components/Uno/UnoGame";
// import  KahootGame  from "../components/Kahoot/KahootGame";
// import { renderPictionaryGame } from "../components/Pictionary/PictionaryGame";
// import { GameRoomInfo } from "../components/GameRoom/GameRoomInfo";
// import { PlayerList } from "../components/GameRoom/PlayerList";
// import { Chat } from "../components/GameRoom/Chat";
// import { Dice } from "../components/Ludo/Dice";
// import {
//   XIcon,
//   UsersIcon,
//   MessageCircleIcon,
//   SendIcon,
//   VideoIcon,
//   SmileIcon,
//   SettingsIcon,
//   MaximizeIcon,
//   MinimizeIcon,
// } from "lucide-react";
// import { MediaControls } from "../components/GameRoom/MediaControls";
// import { VideoGrid } from "../components/GameRoom/VideoGrid";
// import { useSocket } from "../SocketContext";
// import { useAuth } from "../context/AuthContext";
// import { SocketType } from "../SocketContext";

// export const LiveGameRoomPage = () => {
//   const { id: roomId } = useParams<{ id: string }>();
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const socket = useSocket();

//   const [gameState, setGameState] = useState<GameState>({
//     roomId: roomId || "",
//     players: [],
//     currentTurn: "",
//     currentPlayer: 0,
//     diceValue: 0,
//     diceRolled: false,
//     coins: {},
//     gameStarted: false,
//     gameOver: false,
//     winner: null,
//     roomName: "",
//     gameType: "ludo",
//   });
//   const [players, setPlayers] = useState<Player[]>([]);
//   const [playerIdToUsername, setPlayerIdToUsername] = useState<
//     Record<string, string>
//   >({});
//   const [messages, setMessages] = useState<
//     { playerId: string; message: string }[]
//   >([]);
//   const [message, setMessage] = useState("");
//   const [showChat, setShowChat] = useState(true);
//   const [showPlayers, setShowPlayers] = useState(true);
//   const [fullscreen, setFullscreen] = useState(false);
//   const [videoEnabled, setVideoEnabled] = useState(true);
//   const [audioEnabled, setAudioEnabled] = useState(true);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [showVideoGrid, setShowVideoGrid] = useState(false);
//   const [roomInfo, setRoomInfo] = useState<any>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const gameType = gameState?.gameType || roomInfo?.gameType || "ludo";

//   // audio
//   const [inAudioCall, setInAudioCall] = useState(false);
// const [isDeafened, setIsDeafened] = useState(false);
// const [localStream, setLocalStream] = useState<MediaStream | null>(null);
// const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream }>({});
// const [peers, setPeers] = useState<{ [key: string]: RTCPeerConnection }>({});
// const localAudioRef = useRef<HTMLAudioElement>(null);
// const remoteAudioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

//   useEffect(() => {
//     if (!user) {
//       navigate("/login");
//       return;
//     }

//     if (!socket || !roomId) return;

//     console.log("Socket connected, joining room:", roomId);
//     setIsConnected(true);

//     socket.emit("joinGame", {
//       roomId,
//       playerId: user.id,
//       playerName: user.username,
//       password: "",
//     });

//     // Initialize playerIdToUsername with current user's username
//     setPlayerIdToUsername((prev) => ({
//       ...prev,
//       [user.id]: user.username,
//     }));

//     const handleGameState = (newGameState: GameState) => {
//       console.log("Game state received:", {
//         players: newGameState.players.map((p) => ({ id: p.id, name: p.name })),
//         currentPlayer: newGameState.currentPlayer,
//         currentTurn: newGameState.currentTurn,
//       });
//       // Update players with usernames from playerIdToUsername
//       const updatedPlayers = newGameState.players.map((p) => ({
//         ...p,
//         name: playerIdToUsername[p.id] || p.name || p.id,
//       }));
//       setGameState((prev) => ({
//         ...prev,
//         ...newGameState,
//         coins: newGameState.coins || prev.coins,
//         players: updatedPlayers,
//       }));
//       setPlayers(updatedPlayers);
//     };

//     const handlePlayerJoined = (data: any) => {
//       console.log("Player joined:", data);
//       if (data.success) {
//         console.log("Successfully joined room");
//         // Update playerIdToUsername
//         setPlayerIdToUsername((prev) => ({
//           ...prev,
//           [data.playerId]: data.playerName || data.playerId,
//         }));
//       }
//     };

//     const handlePlayerConnected = (data: any) => {
//       console.log("Player connected:", data);
//       setPlayers((prev) => {
//         const existingPlayerIndex = prev.findIndex(
//           (p) => p.id === data.playerId
//         );
//         if (existingPlayerIndex === -1) {
//           return [
//             ...prev,
//             {
//               id: data.playerId,
//               name: data.playerName || data.playerId,
//               color: "",
//               coins: [0, 0, 0, 0],
//             },
//           ];
//         }
//         return prev;
//       });
//       // Update playerIdToUsername
//       setPlayerIdToUsername((prev) => ({
//         ...prev,
//         [data.playerId]: data.playerName || data.playerId,
//       }));
//     };

//     const handlePlayerDisconnected = (data: any) => {
//       setPlayers((prev) =>
//         prev.map((p) =>
//           p.id === data.playerId ? { ...p, isOnline: false } : p
//         )
//       );
//     };

//     const handleChatMessage = (data: any) => {
//       console.log("Chat message received:", data);
//       setMessages((prev) => [...prev, data]);
//     };

//     const handleDiceRolled = (data: any) => {
//       console.log("Dice rolled:", data);
//       setGameState((prev) => ({
//         ...prev,
//         diceValue: data.diceValue,
//         diceRolled: true,
//         currentTurn: data.playerId,
//         currentPlayer: prev.players.findIndex((p) => p.id === data.playerId),
//       }));
//     };

//     const handleCoinMoved = (data: any) => {
//       console.log("Coin moved:", data);
//       setGameState((prev) => ({
//         ...prev,
//         coins: data.coins,
//         currentTurn: data.currentTurn,
//         currentPlayer: data.currentPlayer,
//         diceValue: data.diceValue,
//         diceRolled: data.diceRolled,
//         gameOver: data.gameOver,
//         winner: data.winner,
//       }));
//     };


//     const handleChessMove = (move: string) => {
//       if (socket && gameState?.currentTurn === user?.id) {
//         socket.emit("makeChessMove", { 
//           roomId, 
//           playerId: user!.id, 
//           move 
//         });
//       }
//     };

//     const handleKahootAnswer = (data: any) => {
//       console.log("Kahoot answer:", data);
//       setGameState((prev: any) => ({
//         ...prev,
//         kahootState: {
//           ...prev.kahootState,
//           answers: {
//             ...prev.kahootState?.answers,
//             [data.playerId]: data.answerIndex,
//           },
//         },
//       }));
//     };

//     const handleGameOver = (data: any) => {
//       console.log("Game over:", data);
//       setGameState((prev) => ({
//         ...prev,
//         gameOver: true,
//         winner: data.winner,
//       }));
//     };

//     const handleError = (error: any) => {
//       console.error("Socket error:", error);
//       if (error.type === "startGameError") {
//         alert(`Failed to join room: ${error.message}`);
//         navigate("/");
//       }
//     };

//     socket.on("gameState", handleGameState);
//     socket.on("playerJoined", handlePlayerJoined);
//     socket.on("playerConnected", handlePlayerConnected);
//     socket.on("playerDisconnected", handlePlayerDisconnected);
//     socket.on("chatMessage", handleChatMessage);
//     socket.on("diceRolled", handleDiceRolled);
//     socket.on("coinMoved", handleCoinMoved);
//     socket.on("chessMove", handleChessMove);
//     socket.on("kahootAnswer", handleKahootAnswer);
//     socket.on("gameOver", handleGameOver);
//     socket.on("error", handleError);

//     return () => {
//       socket.off("gameState", handleGameState);
//       socket.off("playerJoined", handlePlayerJoined);
//       socket.off("playerConnected", handlePlayerConnected);
//       socket.off("playerDisconnected", handlePlayerDisconnected);
//       socket.off("chatMessage", handleChatMessage);
//       socket.off("diceRolled", handleDiceRolled);
//       socket.off("coinMoved", handleCoinMoved);
//       socket.off("chessMove", handleChessMove);
//       socket.off("kahootAnswer", handleKahootAnswer);
//       socket.off("gameOver", handleGameOver);
//       socket.off("error", handleError);
//     };
//   }, [socket, roomId, user, navigate]);

//   useEffect(() => {
//     if (socket && roomId) {
//       socket.emit("getGameState", { roomId });
//     }
//   }, [socket, roomId]);

//   const handleRollDice = () => {
   
//     if (
//       socket &&
//       gameState?.currentTurn === user?.id &&
//       gameState.diceValue === 0 &&
//       !gameState.currentTurn.startsWith("ai-") // Add this condition
//     ) {
//       socket.emit("rollDice", { roomId, playerId: user!.id });
//     }
//   };

//   const handleMoveCoin = (coinId: string) => {
//     if (
//       socket &&
//       gameState?.currentTurn === user?.id &&
//       gameState.diceValue! > 0
//     ) {
//       socket.emit("moveCoin", { roomId, playerId: user!.id, coinId });
//     }
//   };

//   const handleChessMove = (move: string) => {
//     if (socket && gameState?.currentTurn === user?.id) {
//       socket.emit("makeChessMove", { roomId, playerId: user!.id, move });
//     }
//   };

//   const handleKahootAnswer = (answerIndex: number) => {
//     if (socket && gameState?.kahootState?.answers[user!.id] === null) {
//       socket.emit("submitKahootAnswer", {
//         roomId,
//         playerId: user!.id,
//         answerIndex,
//       });
//     }
//   };

//   const handleStartGame = () => {
//     console.log("Starting game for room:", roomId);
//     if (!socket || !socket.connected) {
//       console.error("Socket not connected");
//       return;
//     }
//     if (socket && roomId) {
//       socket.emit("startGame", { roomId });
//     }
//   };

//   const sendMessage = (text: string) => {
//     if (socket && roomId && user?.id) {
//       socket.emit("chatMessage", { roomId, playerId: user.id, message: text });
//     }
//   };

//   const handleSendMessage = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (message.trim()) {
//       sendMessage(message);
//       setMessage("");
//     }
//   };

//   const renderGameContent = () => {
//     const lowerCaseGameType = gameType.toLowerCase();

//     if (!gameState?.gameStarted) {
//       return (
//         <div className="flex flex-col items-center justify-center h-full">
//           <h2 className="text-2xl mb-4">Waiting for players...</h2>
//           <p className="text-gray-400 mb-4">
//             Players in room: {players.length}
//           </p>
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
//       case "ludo":
//         return (
//           <div className="relative w-full h-full">
//             <LudoGame
//               gameState={gameState}
//               currentPlayerId={user!.id}
//               onRollDice={handleRollDice}
//               onMoveCoin={handleMoveCoin}
//               onStartGame={handleStartGame}
//             />
//             {gameState.currentTurn === user?.id &&
//               typeof gameState.diceValue === "number" && (
//                 <div className="absolute bottom-4 right-4">
//                   <Dice
//                     value={gameState.diceValue}
//                     onRoll={handleRollDice}
//                     disabled={gameState.diceRolled && gameState.diceValue !== 6}
//                     // disabled={gameState.diceValue !== 0}
//                   />
//                 </div>
//               )}
//           </div>
//         );

//       case "trivia":
//         return (
//           <TriviaGame
//             socket={socket!}
//             roomId={roomId!}
//             currentPlayer={user!.id}
//             gameState={gameState}
//           />
//         );

//       case "chess":
//         return (
//         <ChessGame
//           socket={socket!}
//           roomId={roomId!}
//           currentPlayer={user!.id}
//           gameState={gameState}
//           onChessMove={handleChessMove}
//         />
//         );

//       case "uno":
//         return renderUnoGame({
//           socket,
//           roomId: roomId!,
//           currentPlayer: user!.id,
//           gameState,
//         });

//       case "kahoot":
//         return <KahootGame 
//         socket={socket!}
//         roomId={roomId!}
//         currentPlayer={user!.id}
//         gameState={gameState}
//       />;

//       case "pictionary":
//         return renderPictionaryGame({
//           socket,
//           roomId: roomId!,
//           currentPlayer: user!.id,
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
//     if (sidebar === "players") {
//       if (window.innerWidth < 1024 && showChat) setShowChat(false);
//       setShowPlayers(!showPlayers);
//     } else if (sidebar === "chat") {
//       if (window.innerWidth < 1024 && showPlayers) setShowPlayers(false);
//       setShowChat(!showChat);
//     }
//   };

//   const handleExit = () => {
//     if (socket) {
//       socket.emit("leaveGame", { roomId, playerId: user?.id });
//     }
//     navigate("/");
//   };

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
//     <div
//       className={`flex flex-col h-screen bg-gray-900 ${
//         fullscreen ? "fixed inset-0 z-50" : ""
//       }`}
//     >
//       <div className="bg-gray-800 border-b border-gray-700 p-2 sm:p-3 flex items-center justify-between">
//         <div className="flex items-center">
//           <button
//             onClick={handleExit}
//             className="mr-4 p-2 rounded-lg hover:bg-gray-700 transition-colors"
//           >
//             <XIcon size={20} />
//           </button>
//           <h1 className="font-bold text-base sm:text-xl truncate">
//             {gameState?.roomName || roomInfo?.name || "Game Room"}
//           </h1>
//           <div className="ml-3 px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-400">
//             {gameType}
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           <button
//             onClick={() => setShowVideoGrid(!showVideoGrid)}
//             className={`p-2 rounded-lg ${
//               showVideoGrid ? "bg-purple-600" : "hover:bg-gray-700"
//             }`}
//           >
//             <VideoIcon size={20} />
//           </button>
//           <button
//             onClick={() => toggleSidebar("players")}
//             className={`p-2 rounded-lg ${
//               showPlayers ? "bg-gray-700 text-purple-400" : "hover:bg-gray-700"
//             }`}
//           >
//             <UsersIcon size={20} />
//           </button>
//           <button
//             onClick={() => toggleSidebar("chat")}
//             className={`p-2 rounded-lg ${
//               showChat ? "bg-gray-700 text-purple-400" : "hover:bg-gray-700"
//             }`}
//           >
//             <MessageCircleIcon size={20} />
//           </button>
//           <button
//             onClick={() => setFullscreen(!fullscreen)}
//             className="hidden sm:block p-2 rounded-lg hover:bg-gray-700"
//           >
//             {fullscreen ? (
//               <MinimizeIcon size={20} />
//             ) : (
//               <MaximizeIcon size={20} />
//             )}
//           </button>
//         </div>
//       </div>

//       <div className="flex flex-1 overflow-hidden">
//         {showPlayers && (
//           <div className="w-full sm:w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto fixed sm:relative inset-y-0 left-0 z-30">
//             <PlayerList
//               players={players}
//               currentPlayerId={user!.id}
//               currentTurn={gameState?.currentTurn}
//             />
//           </div>
//         )}

//         <div className="flex-1 bg-gray-850">
//           <div className="h-full p-2 sm:p-4">{renderGameContent()}</div>
//         </div>

//         {showChat && (
//           <div className="w-full sm:w-64 border-l border-gray-700 bg-gray-800 flex flex-col fixed sm:relative inset-y-0 right-0 z-30">
//             <div className="p-3 border-b border-gray-700 flex justify-between items-center">
//               <h3 className="font-medium">Chat</h3>
//               <button
//                 onClick={() => setShowChat(false)}
//                 className="sm:hidden p-2 hover:bg-gray-700 rounded-lg"
//               >
//                 <XIcon size={16} />
//               </button>
//             </div>
//             <div className="flex-1 overflow-y-auto p-3 space-y-4">
//               {messages.map((msg, index) => (
//                 <div key={index} className="flex">
//                   <img
//                     src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.playerId}`}
//                     alt=""
//                     className="w-8 h-8 rounded-full border border-gray-600 mr-2"
//                   />
//                   <div>
//                     <div className="text-sm font-medium">
//                       {playerIdToUsername[msg.playerId] || msg.playerId}
//                     </div>
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
//                 <button
//                   type="submit"
//                   className="p-2 ml-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
//                 >
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
//         <div
//           className="fixed inset-0 bg-black/50 z-20 sm:hidden"
//           onClick={() => {
//             setShowPlayers(false);
//             setShowChat(false);
//           }}
//         />
//       )}
//     </div>
//   );
// };
