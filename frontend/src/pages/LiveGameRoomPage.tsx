import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Player, GameState } from "../components/Ludo/types/game";
import { LudoGame } from "../components/Ludo/LudoGame";
import { TriviaGame } from "../components/Trivia/TriviaGame";
import { ChessGame } from "../components/Chess/ChessGame";
import { renderUnoGame } from "../components/Uno/UnoGame";
import KahootGame from "../components/Kahoot/KahootGame";
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

interface Participant {
  id: string;
  name: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  isLocal: boolean;
  avatar: string;
}

interface MediaAvailability {
  audio: boolean;
  video: boolean;
}

// Jitsi API type declaration
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

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
  const [videoEnabled, setVideoEnabled] = useState(false);
  
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mediaAvailable, setMediaAvailable] = useState<MediaAvailability>({
    audio: false,
    video: false,
  });
  const [isInitializingMedia, setIsInitializingMedia] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const email = (user as any).email || `${user?.id}@game.local`;
  const gameType = gameState?.gameType || roomInfo?.gameType || "ludo";
  // Add state and refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [inAudioCall, setInAudioCall] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // TURN/STUN config
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      {
        urls: [
          `stun:alu-globe-game-room-turn-server.onrender.com:3478`, // your STUN ${window.location.hostname}:
          `turn:alu-globe-game-room-turn-server.onrender.com:3478`, // your TURN
        ],
        username: "aluglobe2025",
        credential: "aluglobe2025development",
      },
    ],
  };

  // Start audio call
  const startAudioCall = async () => {
    if (!socket) return;
    
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      pcRef.current = new RTCPeerConnection(rtcConfig);

      // Add local audio to connection
      localStreamRef.current.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, localStreamRef.current!);
      });

      // Handle remote tracks
      pcRef.current.ontrack = (event) => {
        const [stream] = event.streams;
        const audioEl = document.createElement("audio");
        audioEl.srcObject = stream;
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
      };

      // ICE candidate handler
      pcRef.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-candidate", {
            candidate: event.candidate,
            roomId,
          });
        }
      };

      // Create offer
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      socket.emit("webrtc-offer", { sdp: offer, roomId });

      setInAudioCall(true);
    } catch (err) {
      console.error("Error starting audio call:", err);
    }
  };

  // Listen for offer
  useEffect(() => {
    if (!socket) return;

    const handleWebRTCOffer = async ({ sdp, from }: any) => {
      try {
        pcRef.current = new RTCPeerConnection(rtcConfig);
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        localStreamRef.current.getTracks().forEach((track) => {
          pcRef.current?.addTrack(track, localStreamRef.current!);
        });

        pcRef.current.ontrack = (event) => {
          const [stream] = event.streams;
          const audioEl = document.createElement("audio");
          audioEl.srcObject = stream;
          audioEl.autoplay = true;
          document.body.appendChild(audioEl);
        };

        pcRef.current.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit("webrtc-candidate", {
              candidate: event.candidate,
              roomId,
            });
          }
        };

        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);

        if (socket) {
          socket.emit("webrtc-answer", { sdp: answer, roomId });
        }
        setInAudioCall(true);
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    const handleWebRTCAnswer = async ({ sdp }: any) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
      }
    };

    const handleWebRTCCandidate = async ({ candidate }: any) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    };

    socket.on("webrtc-offer", handleWebRTCOffer);
    socket.on("webrtc-answer", handleWebRTCAnswer);
    socket.on("webrtc-candidate", handleWebRTCCandidate);

    return () => {
      socket.off("webrtc-offer", handleWebRTCOffer);
      socket.off("webrtc-answer", handleWebRTCAnswer);
      socket.off("webrtc-candidate", handleWebRTCCandidate);
    };
  }, [socket, roomId, rtcConfig]);

  // Leave audio call
  const leaveAudioCall = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    setInAudioCall(false);
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const enabled = !audioEnabled;
      localStreamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = enabled));
      setAudioEnabled(enabled);
    }
  };

  // Media control functions
  const toggleAudioCall = async () => {
    if (inAudioCall) {
      leaveAudioCall();
    } else {
      await startAudioCall();
    }
  };

  const toggleVideo = async () => {
    try {
      if (!videoEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Handle video stream logic here
        setVideoEnabled(true);
      } else {
        // Stop video tracks
        setVideoEnabled(false);
      }
    } catch (err) {
      console.error("Error toggling video:", err);
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        // Handle screen share logic here
        setIsScreenSharing(true);
      } else {
        // Stop screen sharing
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error("Error handling screen share:", err);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    // Implement deafen logic - mute all remote audio
    Object.values(remoteAudioRefs.current).forEach(audioEl => {
      audioEl.muted = !isDeafened;
    });
  };

  const handleCameraSwitch = async () => {
    // Jitsi doesn't expose camera switching directly, users can do it through the UI
    console.log("Camera switching should be done through Jitsi UI");
  };

  // Game logic (unchanged)
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

    const handleChessMove = (data: any) => {
      setGameState((prev) => ({
        ...prev,
        chessState: data.gameState.chessState,
        currentTurn: data.gameState.currentTurn,
        currentPlayer: data.gameState.currentPlayer,
      }));
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

    const handleChatHistory = (history: any[]) => {
      setMessages(history);
    };

    socket.on("chatHistory", handleChatHistory);
    socket.emit("getChatHistory", { roomId });
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
      socket.off("chatHistory", handleChatHistory);
    };
  }, [socket, roomId, user, navigate, playerIdToUsername]);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit("getGameState", { roomId });
    }
  }, [socket, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up WebRTC connections
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      
      // Clean up remote audio elements
      Object.values(remoteAudioRefs.current).forEach(audioEl => {
        audioEl.remove();
      });
    };
  }, []);

  const handleRollDice = () => {
    if (
      socket &&
      gameState?.currentTurn === user?.id &&
      gameState.diceValue === 0 &&
      !gameState.currentTurn.startsWith("ai-")
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

  const handleChessMoveAction = (move: string) => {
    if (socket && gameState?.currentTurn === user?.id) {
      socket.emit("makeChessMove", { roomId, playerId: user!.id, move });
    }
  };

  const handleKahootAnswerAction = (answerIndex: number) => {
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
    if (!socket) return null;
    
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
          <div>
            <LudoGame
              gameState={gameState}
              currentPlayerId={user!.id}
              onRollDice={handleRollDice}
              onMoveCoin={handleMoveCoin}
              onStartGame={handleStartGame}
              socket={socket}
              roomId={roomId!}
            />
            {/* Only show dice when it's the current player's turn and they need to roll */}
            {gameState.currentTurn === user?.id &&
              !gameState.diceRolled &&
              !gameState.gameOver && (
                <div className="absolute bottom-4 right-4">
                  <Dice
                    value={gameState.diceValue || 0}
                    onRoll={handleRollDice}
                    disabled={false}
                  />
                </div>
              )}
          </div>
        );

      case "trivia":
        return (
          <TriviaGame
            socket={socket}
            roomId={roomId!}
            currentPlayer={user!.id}
            gameState={gameState}
          />
        );
      case "chess":
        return (
          <ChessGame
            socket={socket}
            roomId={roomId!}
            currentPlayer={user!.id}
            gameState={gameState}
            onChessMove={handleChessMoveAction}
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
        return (
          <KahootGame
            socket={socket}
            roomId={roomId!}
            currentPlayer={user!.id}
            gameState={gameState}
          />
        );
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
    // Clean up before leaving
    leaveAudioCall();
    
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
          <div className="fixed sm:relative inset-y-0 right-0 z-30 w-full sm:w-64">
            <Chat
              messages={messages}
              onSendMessage={sendMessage}
              currentPlayerId={user!.id}
              playerIdToUsername={playerIdToUsername}
            />
            <button
              onClick={() => setShowChat(false)}
              className="sm:hidden absolute top-2 right-2 p-1 bg-gray-800 rounded-full"
            >
              <XIcon size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Custom Video Grid Overlay when Jitsi is not in full view */}
      {showVideoGrid && !inAudioCall && (
        <div className="fixed inset-0 bg-gray-900 z-40 p-4 overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Participants</h2>
            <button
              onClick={() => setShowVideoGrid(false)}
              className="text-white bg-red-600 p-2 rounded-full"
            >
              <XIcon size={20} />
            </button>
          </div>
          <VideoGrid participants={participants} />
        </div>
      )}

      {/* Media Controls */}
      <MediaControls
        videoEnabled={videoEnabled && mediaAvailable.video}
        audioEnabled={audioEnabled && mediaAvailable.audio}
        isScreenSharing={isScreenSharing}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleMute}
        onToggleScreenShare={handleScreenShare}
        onLeaveCall={handleExit}
        onToggleDeafen={toggleDeafen}
        isDeafened={isDeafened}
        inAudioCall={inAudioCall}
        onToggleAudioCall={toggleAudioCall}
        remoteParticipants={participants
          .filter((p) => !p.isLocal)
          .map((p) => p.id)}
        mediaAvailable={mediaAvailable}
        isInitializingMedia={isInitializingMedia}
      />

      {/* Overlay for mobile sidebars */}
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
// import KahootGame from "../components/Kahoot/KahootGame";
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

// interface Participant {
//   id: string;
//   name: string;
//   videoEnabled: boolean;
//   audioEnabled: boolean;
//   videoStream: MediaStream | null;
//   audioStream: MediaStream | null;
//   isLocal: boolean;
//   avatar: string;
// }

// interface MediaAvailability {
//   audio: boolean;
//   video: boolean;
// }

// // Jitsi API type declaration
// declare global {
//   interface Window {
//     JitsiMeetExternalAPI: any;
//   }
// }

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
//   const [videoEnabled, setVideoEnabled] = useState(false);
  
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [showVideoGrid, setShowVideoGrid] = useState(false);
//   const [roomInfo, setRoomInfo] = useState<any>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [mediaAvailable, setMediaAvailable] = useState<MediaAvailability>({
//     audio: false,
//     video: false,
//   });
//   const [isInitializingMedia, setIsInitializingMedia] = useState(false);
//   const [isDeafened, setIsDeafened] = useState(false);
//   const [participants, setParticipants] = useState<Participant[]>([]);
//   const email = (user as any).email || `${user?.id}@game.local`;
//   const gameType = gameState?.gameType || roomInfo?.gameType || "ludo";
//   // Add state and refs
//   const pcRef = useRef<RTCPeerConnection | null>(null);
//   const localStreamRef = useRef<MediaStream | null>(null);
//   const remoteAudioRefs = useRef<Record<string, HTMLAudioElement>>({});
//   const [inAudioCall, setInAudioCall] = useState(false);
//   const [audioEnabled, setAudioEnabled] = useState(true);

//   // TURN/STUN config
//   const rtcConfig: RTCConfiguration = {
//     iceServers: [
//       {
//         urls: [
//           `stun:${window.location.hostname}:3478`, // your STUN
//           `turn:${window.location.hostname}:3478`, // your TURN
//         ],
//         username: process.env.REACT_APP_TURN_USERNAME || "myturnuser",
//         credential: process.env.REACT_APP_TURN_PASSWORD || "myturnpass",
//       },
//     ],
//   };

//   // Start audio call
//   const startAudioCall = async () => {
//     try {
//       localStreamRef.current = await navigator.mediaDevices.getUserMedia({
//         audio: true,
//         video: false,
//       });

//       pcRef.current = new RTCPeerConnection(rtcConfig);

//       // Add local audio to connection
//       localStreamRef.current.getTracks().forEach((track) => {
//         pcRef.current?.addTrack(track, localStreamRef.current!);
//       });

//       // Handle remote tracks
//       pcRef.current.ontrack = (event) => {
//         const [stream] = event.streams;
//         const audioEl = document.createElement("audio");
//         audioEl.srcObject = stream;
//         audioEl.autoplay = true;
//         document.body.appendChild(audioEl);
//       };

//       // ICE candidate handler
//       pcRef.current.onicecandidate = (event) => {
//         if (event.candidate) {
//           socket.emit("webrtc-candidate", {
//             candidate: event.candidate,
//             roomId,
//           });
//         }
//       };

//       // Create offer
//       const offer = await pcRef.current.createOffer();
//       await pcRef.current.setLocalDescription(offer);

//       socket.emit("webrtc-offer", { sdp: offer, roomId });

//       setInAudioCall(true);
//     } catch (err) {
//       console.error("Error starting audio call:", err);
//     }
//   };

//   // Listen for offer
//   useEffect(() => {
//     socket.on("webrtc-offer", async ({ sdp, from }:any) => {
//       try {
//         pcRef.current = new RTCPeerConnection(rtcConfig);
//         localStreamRef.current = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: false,
//         });

//         localStreamRef.current.getTracks().forEach((track) => {
//           pcRef.current?.addTrack(track, localStreamRef.current!);
//         });

//         pcRef.current.ontrack = (event) => {
//           const [stream] = event.streams;
//           const audioEl = document.createElement("audio");
//           audioEl.srcObject = stream;
//           audioEl.autoplay = true;
//           document.body.appendChild(audioEl);
//         };

//         pcRef.current.onicecandidate = (event) => {
//           if (event.candidate) {
//             socket.emit("webrtc-candidate", {
//               candidate: event.candidate,
//               roomId,
//             });
//           }
//         };

//         await pcRef.current.setRemoteDescription(
//           new RTCSessionDescription(sdp)
//         );
//         const answer = await pcRef.current.createAnswer();
//         await pcRef.current.setLocalDescription(answer);

//         socket.emit("webrtc-answer", { sdp: answer, roomId });
//         setInAudioCall(true);
//       } catch (err) {
//         console.error("Error handling offer:", err);
//       }
//     });

//     socket.on("webrtc-answer", async ({ sdp }:any) => {
//       if (pcRef.current) {
//         await pcRef.current.setRemoteDescription(
//           new RTCSessionDescription(sdp)
//         );
//       }
//     });

//     socket.on("webrtc-candidate", async ({ candidate }:any) => {
//       try {
//         await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
//       } catch (err) {
//         console.error("Error adding ICE candidate:", err);
//       }
//     });

//     return () => {
//       socket.off("webrtc-offer");
//       socket.off("webrtc-answer");
//       socket.off("webrtc-candidate");
//     };
//   }, [socket, roomId]);

//   // Leave audio call
//   const leaveAudioCall = () => {
//     pcRef.current?.close();
//     pcRef.current = null;
//     localStreamRef.current?.getTracks().forEach((track) => track.stop());
//     setInAudioCall(false);
//   };

//   // Toggle mute
//   const toggleMute = () => {
//     if (localStreamRef.current) {
//       const enabled = !audioEnabled;
//       localStreamRef.current
//         .getAudioTracks()
//         .forEach((track) => (track.enabled = enabled));
//       setAudioEnabled(enabled);
//     }
//   };

//   // Media control functions
//   const toggleAudioCall = async () => {
//     // implement the logic
//   };

//   const toggleVideo = async () => {
//     // implemet the logic
//   };

//   const handleScreenShare = async () => {
//     // implement the logic
//   };

//   const toggleDeafen = () => {
//     // implement the logic
//   };

//   const handleCameraSwitch = async () => {
//     // Jitsi doesn't expose camera switching directly, users can do it through the UI
//     console.log("Camera switching should be done through Jitsi UI");
//   };

//   // Game logic (unchanged)
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

//     const handleChessMove = (data: any) => {
//       setGameState((prev) => ({
//         ...prev,
//         chessState: data.gameState.chessState,
//         currentTurn: data.gameState.currentTurn,
//         currentPlayer: data.gameState.currentPlayer,
//       }));
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

//     const handleChatHistory = (history: any[]) => {
//       setMessages(history);
//     };

//     socket.on("chatHistory", handleChatHistory);
//     socket.emit("getChatHistory", { roomId });
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
//       socket.off("chatHistory", handleChatHistory);
//     };
//   }, [socket, roomId, user, navigate]);

//   useEffect(() => {
//     if (socket && roomId) {
//       socket.emit("getGameState", { roomId });
//     }
//   }, [socket, roomId]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       // implement the logic
//     };
//   }, []);

//   const handleRollDice = () => {
//     if (
//       socket &&
//       gameState?.currentTurn === user?.id &&
//       gameState.diceValue === 0 &&
//       !gameState.currentTurn.startsWith("ai-")
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
//           <div>
//             <LudoGame
//               gameState={gameState}
//               currentPlayerId={user!.id}
//               onRollDice={handleRollDice}
//               onMoveCoin={handleMoveCoin}
//               onStartGame={handleStartGame}
//               socket={socket!}
//               roomId={roomId!}
//             />
//             {/* Only show dice when it's the current player's turn and they need to roll */}
//             {gameState.currentTurn === user?.id &&
//               !gameState.diceRolled &&
//               !gameState.gameOver && (
//                 <div className="absolute bottom-4 right-4">
//                   <Dice
//                     value={gameState.diceValue || 0}
//                     onRoll={handleRollDice}
//                     disabled={false}
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
//           <ChessGame
//             socket={socket!}
//             roomId={roomId!}
//             currentPlayer={user!.id}
//             gameState={gameState}
//             onChessMove={handleChessMove}
//           />
//         );
//       case "uno":
//         return renderUnoGame({
//           socket,
//           roomId: roomId!,
//           currentPlayer: user!.id,
//           gameState,
//         });
//       case "kahoot":
//         return (
//           <KahootGame
//             socket={socket!}
//             roomId={roomId!}
//             currentPlayer={user!.id}
//             gameState={gameState}
//           />
//         );
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
//     // implement the logic
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
//           <div className="fixed sm:relative inset-y-0 right-0 z-30 w-full sm:w-64">
//             <Chat
//               messages={messages}
//               onSendMessage={sendMessage}
//               currentPlayerId={user!.id}
//               playerIdToUsername={playerIdToUsername}
//             />
//             <button
//               onClick={() => setShowChat(false)}
//               className="sm:hidden absolute top-2 right-2 p-1 bg-gray-800 rounded-full"
//             >
//               <XIcon size={16} />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Custom Video Grid Overlay when Jitsi is not in full view */}
//       {showVideoGrid && !inAudioCall && (
//         <div className="fixed inset-0 bg-gray-900 z-40 p-4 overflow-auto">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="text-xl font-bold text-white">Participants</h2>
//             <button
//               onClick={() => setShowVideoGrid(false)}
//               className="text-white bg-red-600 p-2 rounded-full"
//             >
//               <XIcon size={20} />
//             </button>
//           </div>
//           <VideoGrid participants={participants} />
//         </div>
//       )}

//       {/* Media Controls */}
//       <MediaControls
//         videoEnabled={videoEnabled && mediaAvailable.video}
//         audioEnabled={audioEnabled && mediaAvailable.audio}
//         isScreenSharing={isScreenSharing}
//         onToggleVideo={toggleVideo}
//         onToggleAudio={toggleMute}
//         onToggleScreenShare={handleScreenShare}
//         onLeaveCall={handleExit}
//         onToggleDeafen={toggleDeafen}
//         isDeafened={isDeafened}
//         inAudioCall={inAudioCall}
//         onToggleAudioCall={startAudioCall} // toggleAudioCall
//         remoteParticipants={participants
//           .filter((p) => !p.isLocal)
//           .map((p) => p.id)}
//         mediaAvailable={mediaAvailable}
//         isInitializingMedia={isInitializingMedia}
//       />

//       {/* Overlay for mobile sidebars */}
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
