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
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mediaAvailable, setMediaAvailable] = useState<MediaAvailability>({
    audio: false,
    video: false,
  });
  const [isInitializingMedia, setIsInitializingMedia] = useState(false);

  const [inAudioCall, setInAudioCall] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const [jitsiError, setJitsiError] = useState<string | null>(null);
  const [isJitsiInitializing, setIsJitsiInitializing] = useState(false);
  const email = (user as any).email || `${user?.id}@game.local`;


  const [jwtToken, setJwtToken] = useState<string>("");

  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  const gameType = gameState?.gameType || roomInfo?.gameType || "ludo";

  // JaaS Configuration
  const JAAS_APP_ID = 'vpaas-magic-cookie-73e0b0238b9a447ab2d5bf9b9b41ff7c';
  const JAAS_KID = 'vpaas-magic-cookie-73e0b0238b9a447ab2d5bf9b9b41ff7c/bc8b7e';

  // Generate JWT token for JaaS authentication
  const generateJWT = async () => {
    try {
      // In production, this should be done on your backend server
      // For now, we'll create a simple JWT payload and use it
      const payload = {
        aud: 'jitsi',
        context: {
          user: {
            id: user?.id || `user-${Date.now()}`,
            name: user?.username || `Player-${Date.now().toString().slice(-4)}`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
            email:  `${user?.id}@game.local`,
            moderator: 'true'
          },
          features: {
            livestreaming: 'true',
            recording: 'true',
            transcription: 'true',
            "outbound-call": 'true'
          }
        },
        iss: 'chat',
        room: `gameroom-${roomId}`,
        sub: JAAS_APP_ID,
        exp: Math.round(Date.now() / 1000) + (3 * 60 * 60), // 3 hours
        nbf: Math.round(Date.now() / 1000) - 10
      };

      // For demo purposes, we'll make a request to your backend
      // Replace this with your actual JWT generation endpoint
      const response = await fetch('https://alu-globe-game-room-turn-server.onrender.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.username,
          // avatar: `your-avatar-url`,
          roomName: `gameroom-${roomId}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.token.replace(/^"|"$/g, "");
        console.log("JWT from backend:", data.token); 
      } else {
        // Fallback: create a temporary token (not secure for production)
        console.warn('JWT generation endpoint not available, using fallback method');
        return createFallbackToken();
      }
    } catch (error) {
      console.error('Error generating JWT:', error);
      return createFallbackToken();
    }
  };

  // Fallback token creation (not secure for production)
  const createFallbackToken = () => {
    // This is a simplified approach for demo purposes
    // In production, JWT generation must happen on a secure backend
    const header = btoa(JSON.stringify({
      alg: 'RS256',
      kid: JAAS_KID,
      typ: 'JWT'
    }));

    const payload = btoa(JSON.stringify({
      aud: 'jitsi',
      context: {
        user: {
          id: user?.id || `user-${Date.now()}`,
          name: user?.username || `Player-${Date.now().toString().slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
          email: `${user?.id}@game.local`,
          moderator: 'true'
        },
        features: {
          livestreaming: 'true',
          recording: 'true',
          transcription: 'true',
          "outbound-call": 'true'
        }
      },
      iss: 'chat',
      room: `gameroom-${roomId}`,
      sub: JAAS_APP_ID,
      exp: Math.round(Date.now() / 1000) + (3 * 60 * 60),
      nbf: Math.round(Date.now() / 1000) - 10
    }));

    // Note: This creates an unsigned token for demo purposes
    // For production, you MUST sign this with your private key on the backend
    return `${header}.${payload}.DEMO_SIGNATURE`;
  };

  // Generate room name for JaaS
  const generateRoomName = () => {
    return `gameroom-${roomId}`;
  };

  // JaaS Jitsi configuration
  const jitsiConfig = {
    roomName: generateRoomName(),
    width: '100%',
    height: '100%',
    parentNode: jitsiContainerRef.current,
    jwt: jwtToken, // Add JWT token for authentication
    configOverwrite: {
      // JaaS specific settings
      startWithAudioMuted: true,
      startWithVideoMuted: true,
      prejoinPageEnabled: false,
      disableDeepLinking: true,
      disableInviteFunctions: true,
      
      // Audio/Video settings
      constraints: {
        video: {
          height: { ideal: 480, max: 720, min: 240 },
          width: { ideal: 640, max: 1280, min: 320 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      },
      
      // Connection settings
      p2p: {
        enabled: false
      },
      useStunTurn: true,
      
      // Remove lobby settings since we're using JWT
      enableLobbyChat: false,
      requireDisplayName: false,
    },
    interfaceConfigOverwrite: {
      // Minimal toolbar for game integration
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'desktop',
        'hangup', 'chat', 'settings'
      ],
      
      // Disable branding
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_POWERED_BY: false,
      SHOW_BRAND_WATERMARK: false,
      
      // UI customization
      DEFAULT_BACKGROUND: '#1a1a2e',
      DISABLE_VIDEO_BACKGROUND: true,
      DISABLE_CHROME_EXTENSION_BANNER: true,
      
      // Hide problematic elements
      HIDE_INVITE_MORE_HEADER: true,
      SETTINGS_SECTIONS: ['devices', 'language'],
    },
    userInfo: {
      displayName: user?.username || `Player-${Date.now().toString().slice(-4)}`,
      email:  undefined
    }
  };

  // Load Jitsi External API
  useEffect(() => {
    const loadJitsiScript = async () => {
      if (window.JitsiMeetExternalAPI) {
        setJitsiLoaded(true);
        return;
      }

      try {
        console.log('🔄 Loading Jitsi script...');
        
        const existingScript = document.querySelector('script[src*="external_api.js"]');
        if (existingScript) {
          existingScript.remove();
        }

        const script = document.createElement('script');
        // Use JaaS domain instead of public meet.jit.si
        script.src = 'https://8x8.vc/external_api.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('✅ Jitsi script loaded successfully');
            setJitsiLoaded(true);
            setJitsiError(null);
            resolve(true);
          };
          
          script.onerror = (error) => {
            console.error('❌ Failed to load Jitsi script:', error);
            setJitsiError('Failed to load video chat. Please check your connection.');
            reject(error);
          };
        });

        document.head.appendChild(script);
        await loadPromise;
        
      } catch (error) {
        console.error('❌ Error loading Jitsi:', error);
        setJitsiError('Failed to initialize video chat');
      }
    };

    loadJitsiScript();

    return () => {
      const script = document.querySelector('script[src*="external_api.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  // Initialize Jitsi with JWT
  const initializeJitsi = async () => {
    if (!jitsiLoaded || !jitsiContainerRef.current || jitsiApi || isJitsiInitializing) {
      console.log('❌ Cannot initialize Jitsi:', { 
        jitsiLoaded, 
        hasContainer: !!jitsiContainerRef.current, 
        hasApi: !!jitsiApi, 
        isInitializing: isJitsiInitializing 
      });
      return;
    }

    setIsJitsiInitializing(true);
    setJitsiError(null);
    
    try {
      // Generate JWT token
      console.log('🔑 Generating JWT token...');
      const token = await generateJWT();
      setJwtToken(token);

      // Update config with token
      const configWithToken = {
        ...jitsiConfig,
        jwt: token
      };

      console.log('🎵 Initializing JaaS Jitsi Meet with room:', configWithToken.roomName);
      
      // Use JaaS domain instead of public meet.jit.si
      const api = new window.JitsiMeetExternalAPI("8x8.vc", configWithToken);

      // Set up event listeners
      api.on('readyToClose', () => {
        console.log('🔌 Jitsi ready to close');
        cleanupJitsi();
      });

      api.on('videoConferenceJoined', (data: any) => {
        console.log('✅ Successfully joined video conference:', data);
        setInAudioCall(true);
        setMediaAvailable({ audio: true, video: true });
        setIsJitsiInitializing(false);
        updateParticipants();
      });

      api.on('videoConferenceLeft', (data: any) => {
        console.log('👋 Left video conference:', data);
        cleanupJitsi();
      });

      // Enhanced error handling
      api.on('errorOccurred', (error: any) => {
        console.error('❌ Jitsi error occurred:', error);
        handleJitsiError(error);
      });

      // Participant events
      api.on('participantJoined', (data: any) => {
        console.log('👤 Participant joined:', data);
        updateParticipants();
      });

      api.on('participantLeft', (data: any) => {
        console.log('👤 Participant left:', data);
        updateParticipants();
      });

      // Media events
      api.on('audioMuteStatusChanged', (data: any) => {
        console.log('🎤 Audio mute changed:', data);
        setAudioEnabled(!data.muted);
      });

      api.on('videoMuteStatusChanged', (data: any) => {
        console.log('📹 Video mute changed:', data);
        setVideoEnabled(!data.muted);
      });

      api.on('screenShareStatusChanged', (data: any) => {
        console.log('🖥️ Screen share changed:', data);
        setIsScreenSharing(data.on);
      });

      setJitsiApi(api);
      
      // Timeout handler
      setTimeout(() => {
        if (isJitsiInitializing) {
          console.log('⚠️ Jitsi initialization taking longer than expected');
          setIsJitsiInitializing(false);
        }
      }, 10000);

    } catch (error) {
      console.error('❌ Error initializing Jitsi:', error);
      setJitsiError('Failed to initialize video call. Please try again.');
      setIsJitsiInitializing(false);
      cleanupJitsi();
    }
  };

  // Handle Jitsi errors
  const handleJitsiError = (error: any) => {
    console.error('Jitsi error details:', error);
    
    if (error?.message?.includes('membersOnly') || error?.message?.includes('conference.connectionError.membersOnly')) {
      setJitsiError('Authentication failed. Regenerating token...');
      setTimeout(() => {
        cleanupJitsi();
        if (inAudioCall) {
          initializeJitsi();
        }
      }, 2000);
    } else if (error?.message?.includes('connection') || error?.message?.includes('network')) {
      setJitsiError('Network connection issue. Please check your internet connection.');
    } else if (error?.message?.includes('media') || error?.message?.includes('permission')) {
      setJitsiError('Media permission denied. Please allow camera/microphone access.');
    } else if (error?.message?.includes('jwt') || error?.message?.includes('token')) {
      setJitsiError('Authentication token expired. Please refresh and try again.');
    } else {
      setJitsiError('Video call error occurred. Please try again.');
    }
    
    setIsJitsiInitializing(false);
  };

  // Update participants from Jitsi
  const updateParticipants = () => {
    if (!jitsiApi) return;

    try {
      const jitsiParticipants = jitsiApi.getParticipantsInfo();
      console.log('👥 Updating participants:', jitsiParticipants);

      const updatedParticipants: Participant[] = jitsiParticipants.map((p: any) => ({
        id: p.participantId || p.id,
        name: p.displayName || p.name || 'Anonymous',
        videoEnabled: !p.isVideoMuted,
        audioEnabled: !p.isAudioMuted,
        videoStream: null,
        audioStream: null,
        isLocal: p.isLocal || false,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.participantId || p.id}`,
      }));

      setParticipants(updatedParticipants);
    } catch (error) {
      console.error('❌ Error updating participants:', error);
    }
  };

  // Clean up Jitsi
  const cleanupJitsi = () => {
    console.log('🧹 Cleaning up Jitsi...');
    
    if (jitsiApi) {
      try {
        jitsiApi.dispose();
      } catch (error) {
        console.error('Error disposing Jitsi API:', error);
      }
      setJitsiApi(null);
    }
    
    setParticipants([]);
    setInAudioCall(false);
    setAudioEnabled(false);
    setVideoEnabled(false);
    setIsScreenSharing(false);
    setIsJitsiInitializing(false);
    setJitsiError(null);
  };

  // Media control functions
  const toggleAudioCall = async () => {
    if (isJitsiInitializing) {
      console.log('⚠️ Jitsi is already initializing...');
      return;
    }

    setJitsiError(null);
    
    if (!inAudioCall) {
      console.log("🎵 Joining audio/video call...");
      if (jitsiLoaded) {
        await initializeJitsi();
      } else {
        setJitsiError('Video chat is still loading. Please wait a moment and try again.');
      }
    } else {
      console.log("🎵 Leaving audio/video call...");
      cleanupJitsi();
    }
  };

  const toggleMute = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = async () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleVideo');
    }
  };

  const handleScreenShare = async () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleShareScreen');
    }
  };

  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    
    if (jitsiApi) {
      if (newDeafened && audioEnabled) {
        jitsiApi.executeCommand('toggleAudio');
      }
    }
  };

  const handleCameraSwitch = async () => {
    // Jitsi doesn't expose camera switching directly, users can do it through the UI
    console.log('Camera switching should be done through Jitsi UI');
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
  }, [socket, roomId, user, navigate]);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit("getGameState", { roomId });
    }
  }, [socket, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupJitsi();
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
      case "ludo":
        return (
          <div className="relative w-full h-full">
            <LudoGame
              gameState={gameState}
              currentPlayer={user!.id}
              onRollDice={handleRollDice}
              onMoveCoin={handleMoveCoin}
              onStartGame={handleStartGame}
              socket={socket!}
              roomId={roomId!}
            />
            {gameState.currentTurn === user?.id &&
              typeof gameState.diceValue === "number" && (
                <div className="absolute bottom-4 right-4">
                  <Dice
                    value={gameState.diceValue}
                    onRoll={handleRollDice}
                    disabled={gameState.diceRolled && gameState.diceValue !== 6}
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
        return (
          <KahootGame
            socket={socket!}
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
    cleanupJitsi();
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
            {fullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
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

      {/* Jitsi Meet Container - Hidden by default */}
      <div
        ref={jitsiContainerRef}
        className={`fixed inset-0 z-40 bg-black ${
          showVideoGrid ? 'block' : 'hidden'
        }`}
        style={{ height: '100vh', width: '100vw' }}
      />

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
        remoteParticipants={participants.filter(p => !p.isLocal).map(p => p.id)}
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
