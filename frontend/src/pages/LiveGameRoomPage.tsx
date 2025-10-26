import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Player, GameState } from "../components/Ludo/types/game";
import { LudoGame } from "../components/Ludo/LudoGame";
import { TriviaGame } from "../components/Trivia/TriviaGame";
import { ChessGame } from "../components/Chess/ChessGame";
import { ChessPlayerSelectionModal } from "../components/Chess/ChessPlayerSelectionModal";
import { UnoGame } from "../components/Uno/UnoGame";
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
  UserX,
  VolumeX,
  Volume2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { MediaControls } from "../components/GameRoom/MediaControls";
import { VideoGrid } from "../components/GameRoom/VideoGrid";
import { useSocket, useSocketConnection } from "../SocketContext";
import { useAuth } from "../context/AuthContext";
import { SocketType } from "../SocketContext";
import { useUserData } from "../hooks/useUserData"; 
import { Link } from 'react-router-dom'; 
import { TriviaCategorySelectionModal } from '../components/Trivia/TriviaCategorySelectionModal';

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

// Player management modal interface
interface PlayerManagementModalProps {
  isOpen: boolean;
  player: Player | null;
  onClose: () => void;
  onRemovePlayer: (playerId: string) => void;
  onMutePlayer: (playerId: string) => void;
  onUnmutePlayer: (playerId: string) => void;
  isMuted: boolean;
  isHostSelf?: boolean;
  onRestartGame?: () => void;
}



// Player Management Modal Component
const PlayerManagementModal: React.FC<PlayerManagementModalProps> = ({
  isOpen,
  player,
  onClose,
  onRemovePlayer,
  onMutePlayer,
  onUnmutePlayer,
  isMuted,
  isHostSelf = false,
  onRestartGame
}) => {
  if (!isOpen || !player) return null;

  // Player Avatar Component
  const PlayerAvatar = ({ playerId }: { playerId: string }) => {
    const { avatar } = useUserData(playerId);

    return (
      <img 
        src={avatar}
        alt="Player avatar"
        className="w-10 h-10 rounded-full border border-gray-600"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
        }}
      />
    );
  };

  const handleRemove = () => {
    if (window.confirm(`Are you sure you want to remove ${player.name || player.id} from the game room?`)) {
      onRemovePlayer(player.id);
      onClose();
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      onUnmutePlayer(player.id);
    } else {
      onMutePlayer(player.id);
    }
    onClose();
  };

  const handleRestartGame = () => {
    if (onRestartGame) {
      onRestartGame();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-sm w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <PlayerAvatar playerId={player.id} />
            <div>
              <h3 className="text-lg font-semibold text-white">
              <Link 
                to={`/profile/${player.name}`} 
                className="text-purple-400 hover:underline"
              >
                {player.name}
                </Link>
                </h3>
              <p className="text-sm text-gray-400">
                {isHostSelf ? 'Host Management' : 'Player Management'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {isHostSelf ? (
            // Host self-management options
            <button
              onClick={handleRestartGame}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              <RotateCcw size={18} />
              <span>Restart Game</span>
            </button>
          ) : (
            // Regular player management options
            <>
              <button
                onClick={handleMuteToggle}
                className={`w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isMuted 
                    ? 'bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30' 
                    : 'bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/30'
                }`}
              >
                {isMuted ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span>{isMuted ? 'Unmute Player' : 'Mute Player'}</span>
              </button>

              <button
                onClick={handleRemove}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
              >
                <UserX size={18} />
                <span>Remove from Room</span>
              </button>
            </>
          )}
        </div>

        <div className="mt-6 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
          <div className="flex items-start space-x-2">
            <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400">
              {isHostSelf 
                ? "Restarting the game will start a new round with the same players and spectators."
                : "These actions are permanent. Removed players will need to rejoin the room."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export const LiveGameRoomPage = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const isSocketConnected = useSocketConnection();
  const [startAfterSelect, setStartAfterSelect] = useState(false);

  // Existing state variables...
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
  // const [showChat, setShowChat] = useState(true);
  // const [showPlayers, setShowPlayers] = useState(true);
  const [showChat, setShowChat] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );
  const [showPlayers, setShowPlayers] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  
  // New state for player management
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [mutedPlayers, setMutedPlayers] = useState<string[]>([]);
  
  // Chess player selection modal state
  const [showChessPlayerModal, setShowChessPlayerModal] = useState(false);

  const hasJoinedRef = useRef(false);
  const hasJoinedUnoRef = useRef(false);
  const playerNameMapRef = useRef<Record<string, string>>({});
  const [mediaAvailable, setMediaAvailable] = useState<MediaAvailability>({
    audio: false,
    video: false,
  });
  const [isInitializingMedia, setIsInitializingMedia] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const email = (user as any).email || `${user?.id}@game.local`;
  const gameType = gameState?.gameType || roomInfo?.gameType || "ludo";
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [inAudioCall, setInAudioCall] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [gameEndedMessage, setGameEndedMessage] = useState("");
  const [gameStatus, setGameStatus] = useState(''); 
  
  
const [showTriviaCategoryModal, setShowTriviaCategoryModal] = useState(false);
const [isUpdatingTriviaSettings, setIsUpdatingTriviaSettings] = useState(false);

  // TURN/STUN config
  const rtcConfig: RTCConfiguration = React.useMemo(() => ({
    iceServers: [
      {
        urls: [
          `stun:alu-globe-game-room-turn-server.onrender.com`,
          `turn:alu-globe-game-room-turn-server.onrender.com`,
        ],
        username: "aluglobe2025",
        credential: "aluglobe2025development",
      },
    ],
  }), []);


  // Add this useEffect to update player names when game state changes
useEffect(() => {
  if (gameState?.players) {
    // Update player name mapping
    const newMapping = { ...playerIdToUsername };
    gameState.players.forEach(player => {
      if (player.name && player.name !== player.id) {
        newMapping[player.id] = player.name;
      } else if (!newMapping[player.id]) {
        // You might need to implement this API call
        newMapping[player.id] = player.id; // Fallback to ID
      }
    });
    setPlayerIdToUsername(newMapping);
    
    // Update players list with proper names
    setPlayers(prevPlayers => {
      const existingPlayersMap = new Map(prevPlayers.map(p => [p.id, p]));
      
      gameState.players.forEach(player => {
        const existing = existingPlayersMap.get(player.id) || {};
        existingPlayersMap.set(player.id, {
          ...existing,
          ...player,
          name: newMapping[player.id] || player.name || player.id,
        });
      });
      
      return Array.from(existingPlayersMap.values());
    });
  }
}, [gameState?.players]);



useEffect(() => {
  if (socket && roomId && gameType === 'uno' && user?.id && !hasJoinedUnoRef.current) {
    console.log('Auto-joining UNO game for current user in UNO room:', user.id);
    
    const joinUno = () => {
      if (hasJoinedUnoRef.current) return;
      
      socket.emit('unoJoinGame', {
        roomId,
        playerId: user.id,
        playerName: user.username
      });
      
      hasJoinedUnoRef.current = true;
    };

    // Small delay to ensure room is properly joined first
    const timeoutId = setTimeout(joinUno, 1000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }
}, [socket, roomId, gameType, user?.id]);


useEffect(() => {
  return () => {
    // Reset the UNO join flag when leaving the room
    hasJoinedUnoRef.current = false;
    
    // Other cleanup code...
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    Object.values(remoteAudioRefs.current).forEach((audioEl) => {
      audioEl.remove();
    });
  };
}, []);

  // Helper function to check if current user is a playing participant (not host spectator)
  const isActivePlayer = () => {
    return gameState.players.some(p => p.id === user?.id);
  };

  // Helper function to get actual game players
  const getActiveGamePlayers = () => {
    return gameState.players;
  };

  // Player management functions
  const handlePlayerClick = (player: Player) => {
    if (isHost) {
      // Allow host to click on any player
      if (player.id === user?.id || player.id !== user?.id) {
        setSelectedPlayer(player);
        setShowPlayerModal(true);
      }
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    if (socket && roomId && isHost) {
      socket.emit('removePlayer', {
        roomId,
        hostId: user?.id,
        playerIdToRemove: playerId
      });
      
      // Update local state immediately for better UX
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      setMutedPlayers(prev => prev.filter(id => id !== playerId));
    }
  };

  const handleMutePlayer = (playerId: string) => {
    if (socket && roomId && isHost) {
      socket.emit('mutePlayer', {
        roomId,
        hostId: user?.id,
        playerIdToMute: playerId
      });
      
      setMutedPlayers(prev => [...prev, playerId]);
    }
  };

  const handleUnmutePlayer = (playerId: string) => {
    if (socket && roomId && isHost) {
      socket.emit('unmutePlayer', {
        roomId,
        hostId: user?.id,
        playerIdToUnmute: playerId
      });
      
      setMutedPlayers(prev => prev.filter(id => id !== playerId));
    }
  };

  // All existing functions (checkMediaDevices, startAudioCall, etc.) remain the same...
  const checkMediaDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported');
        setMediaAvailable({ audio: false, video: false });
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      setMediaAvailable({
        audio: audioDevices.length > 0,
        video: videoDevices.length > 0
      });

      console.log('Available devices:', { audio: audioDevices.length, video: videoDevices.length });
    } catch (error) {
      console.error('Error checking media devices:', error);
      setMediaAvailable({ audio: false, video: false });
    }
  };

  useEffect(() => {
    checkMediaDevices();
  }, []);

  const startAudioCall = async () => {
    if (!socket) return;

    try {
      setIsInitializingMedia(true);
      
      if (!mediaAvailable.audio) {
        console.log('No audio device available, checking permissions...');
        await checkMediaDevices();
        
        if (!mediaAvailable.audio) {
          throw new Error('No audio device available. Please check your microphone permissions and ensure a microphone is connected.');
        }
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      } catch (mediaError: any) {
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('Microphone is in use by another application. Please close other apps using the microphone.');
        } else {
          throw new Error(`Microphone error: ${mediaError.message}`);
        }
      }

      localStreamRef.current = stream;
      pcRef.current = new RTCPeerConnection(rtcConfig);

      stream.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, stream);
      });

      pcRef.current.ontrack = (event) => {
        const [remoteStream] = event.streams;
        const audioEl = document.createElement("audio");
        audioEl.srcObject = remoteStream;
        audioEl.autoplay = true;
        audioEl.id = `remote-audio-${Date.now()}`;
        document.body.appendChild(audioEl);
        
        const audioId = audioEl.id;
        remoteAudioRefs.current[audioId] = audioEl;
      };

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-candidate", {
            candidate: event.candidate,
            roomId,
          });
        }
      };

      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      socket.emit("webrtc-offer", { sdp: offer, roomId });

      setInAudioCall(true);
      console.log('Audio call started successfully');
    } catch (err: any) {
      console.error("Error starting audio call:", err);
      
      const errorMessage = err.message || 'Failed to start audio call';
      alert(`Audio Call Error: ${errorMessage}`);
      
      setIsInitializingMedia(false);
      setInAudioCall(false);
    } finally {
      setIsInitializingMedia(false);
    }
  };

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

  useEffect(() => {
    playerNameMapRef.current = playerIdToUsername;
  }, [playerIdToUsername]);

  const leaveAudioCall = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    setInAudioCall(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const enabled = !audioEnabled;
      localStreamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = enabled));
      setAudioEnabled(enabled);
    }
  };

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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setVideoEnabled(true);
      } else {
        setVideoEnabled(false);
      }
    } catch (err) {
      console.error("Error toggling video:", err);
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setIsScreenSharing(true);
      } else {
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error("Error handling screen share:", err);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    Object.values(remoteAudioRefs.current).forEach((audioEl) => {
      audioEl.muted = !isDeafened;
    });
  };

  const handleCameraSwitch = async () => {
    console.log("Camera switching should be done through Jitsi UI");
  };

  // Game logic and socket handlers remain the same...
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!socket || !roomId) return;

    if (!hasJoinedRef.current && isSocketConnected) {
      console.log("Socket connected, joining room:", roomId);
      hasJoinedRef.current = true;
      socket.emit("joinGame", {
        roomId,
        playerId: user.id,
        playerName: user.username,
        password: "",
      });
      setPlayerIdToUsername((prev) => ({
        ...prev,
        [String(user.id)]: user.username,
      }));
    }

    const handleGameState = (newGameState: GameState) => {
      console.log("Game state received:", {
        players: newGameState.players.map((p) => ({ id: p.id, name: p.name })),
        currentPlayer: newGameState.currentPlayer,
        currentTurn: newGameState.currentTurn,
        host: newGameState.host,
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
        host: newGameState.host || prev.host,
      }));
      
      // Fix: Merge players instead of completely replacing them
      setPlayers((prevPlayers) => {
        // Create a map of existing players
        const existingPlayersMap = new Map(prevPlayers.map(p => [p.id, p]));
        
        // Update existing players or add new ones from game state
        updatedPlayers.forEach(player => {
          existingPlayersMap.set(player.id, {
            ...existingPlayersMap.get(player.id) || {},
            ...player,
            name: playerIdToUsername[player.id] || player.name || player.id,
          });
        });
        
        // Convert back to array
        return Array.from(existingPlayersMap.values());
      });
    };

    const handlePlayerJoined = (data: any) => {
      console.log("Player joined:", data);
      if (data.success) {
        console.log("Successfully joined room");
        setPlayerIdToUsername((prev) => ({
          ...prev,
          [data.playerId]: data.playerName || data.playerId,
        }));

        if (gameType === 'uno' && socket && roomId) {
          socket.emit('unoJoinGame', { 
            roomId, 
            playerId: data.playerId, 
            playerName: data.playerName || data.playerId 
          });
        }

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
              isSpectator: false  // Explicitly set for players
            },
          ];
        }
        return prev;
      });
      setPlayerIdToUsername((prev) => ({
        ...prev,
        [data.playerId]: data.playerName || data.playerId,
      }));
      // Refresh room info to get updated player/spectator lists
      socket.emit('getRoomInfo', { roomId });
    };
    const handleSpectatorConnected = (data: any) => {
      console.log("Spectator connected:", data);
      // Add to players list with isSpectator flag
      setPlayers((prev) => {
        const exists = prev.some(p => p.id === data.playerId);
        if (!exists) {
          return [
            ...prev,
            {
              id: data.playerId,
              name: data.playerName || data.playerId,
              color: "",
              coins: [0, 0, 0, 0],
              isSpectator: true
            },
          ];
        }
        return prev;
      });
      setPlayerIdToUsername((prev) => ({
        ...prev,
        [data.playerId]: data.playerName || data.playerId,
      }));
      // Refresh room info to update spectatorIds
      socket.emit('getRoomInfo', { roomId });
    };

    const handlePlayerDisconnected = (data: any) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId ? { ...p, isOnline: false } : p
        )
      );
    };

    // Add new socket handlers for player management
    const handlePlayerRemoved = (data: any) => {
      console.log("Player removed:", data);
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
      setMutedPlayers(prev => prev.filter(id => id !== data.playerId));
      
      if (data.playerId === user?.id) {
        alert("You have been removed from the game room by the host.");
        navigate("/");
      }
    };

    const handlePlayerMuted = (data: any) => {
      console.log("Player muted:", data);
      setMutedPlayers(prev => [...prev.filter(id => id !== data.playerId), data.playerId]);
      
      if (data.playerId === user?.id) {
        // Mute the current user's audio
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
          setAudioEnabled(false);
        }
      }
    };

    const handlePlayerUnmuted = (data: any) => {
      console.log("Player unmuted:", data);
      setMutedPlayers(prev => prev.filter(id => id !== data.playerId));
      
      if (data.playerId === user?.id) {
        // Unmute the current user's audio
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => track.enabled = true);
          setAudioEnabled(true);
        }
      }
    };



    
const handleGameRestarted = (data: any) => {
  console.log('Game restarted:', data);
  
  // CRITICAL: Reset all game-ended flags
  setGameEnded(false);
  setGameEndedMessage('');
  
  // Use the gameState from the event if available
  if (data.gameState) {
    console.log('Applying restarted game state:', data.gameState);
    setGameState(data.gameState);
  } else {
    // Fallback: request fresh game state
    console.log('Requesting fresh game state after restart');
    if (socket) {
      socket.emit('getGameState', { roomId });
    }
  }
  
  // Clear any selections or local UI state
  setSelectedPlayer(null);
  setShowChessPlayerModal(false);
  
  // Show success message
  setGameStatus('Game restarted! Get ready for a new round.');
  setTimeout(() => setGameStatus(''), 3000);
};
  
    const handleGameEnded = (data: any) => {
      console.log("Game ended:", data);
      setGameEnded(true);
      setGameEndedMessage(data.message || 'The game has ended');
      setGameState(prev => ({
        ...prev,
        gameStarted: false,
        gameOver: true
      }));
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
  // data: { roomId, move, moveDetails, playerId, success, board, currentTurn, nextPlayer, timestamp }
  setGameState((prev) => {
    const nextMoves =
      data.move && prev.chessState?.moves
        ? [...prev.chessState.moves, data.move]
        : prev.chessState?.moves || [];

    const updatedChessState = data.board
      ? { board: data.board, moves: nextMoves }
      : prev.chessState;

    const nextTurn = data.currentTurn ?? prev.currentTurn;
    const nextPlayerIndex =
      nextTurn ? prev.players.findIndex((p) => p.id === nextTurn) : prev.currentPlayer;

    return {
      ...prev,
      chessState: updatedChessState,
      currentTurn: nextTurn,
      currentPlayer: nextPlayerIndex !== -1 ? nextPlayerIndex : prev.currentPlayer,
    };
  });
};

    const handleChessPlayersSelected = (data: any) => {
      console.log("Chess players selected:", data);
      setGameState((prev) => ({
        ...prev,
        chessPlayers: data.chessPlayers,
        currentTurn: data.currentTurn,
        players: data.gameState.players,
      }));
    
      // Refresh room info to get updated player/spectator lists
      socket.emit('getRoomInfo', { roomId });
      
      if (startAfterSelect) {
        socket.emit('startChessGame', { roomId });
        setStartAfterSelect(false);
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

    const handleChatHistory = (history: any[]) => {
      setMessages(history);
    };


    // In the socket event handlers section, add:
const handleTriviaQuestionsRegenerated = (data: any) => {
  console.log('Trivia questions regenerated:', data);
  // This will trigger a re-fetch of game state which will update the questions
  if (socket && roomId) {
    socket.emit('getGameState', { roomId });
  }
};



// In LiveGameRoomPage.tsx - Fix the socket event handlers
const handleUnoGameState = (newGameState: any) => {
  console.log("UNO game state received:", newGameState);
  
  // Ensure all UNO-specific properties are properly set
  const enhancedGameState = {
    ...newGameState,
    deck: newGameState.deck || [],
    discardPile: newGameState.discardPile || [],
    currentColor: newGameState.currentColor || 'red',
    currentValue: newGameState.currentValue || '',
    direction: newGameState.direction || 1,
    pendingDraw: newGameState.pendingDraw || 0,
    pendingColorChoice: newGameState.pendingColorChoice || false,
    lastPlayer: newGameState.lastPlayer || null,
    consecutivePasses: newGameState.consecutivePasses || 0,
    players: newGameState.players || [],
    // Preserve existing properties that might not be in UNO state
    coins: newGameState.coins || gameState.coins,
    diceValue: newGameState.diceValue || gameState.diceValue,
    diceRolled: newGameState.diceRolled || gameState.diceRolled
  };
  
  setGameState(enhancedGameState);
};

const handleUnoGameOver = (data: any) => {
  console.log("UNO game over:", data);
  setGameEnded(true);
  setGameEndedMessage(data.message || 'UNO game completed!');
};

const handleUnoError = (error: any) => {
  console.error("UNO error:", error);
  alert(`UNO Error: ${error.message}`);
};


// Add this to your socket event handlers in useEffect
const handleTriviaSettingsUpdated = (data: any) => {
  console.log('Trivia settings updated:', data);
  // Refresh game state to get updated settings
  if (socket && roomId) {
    socket.emit('getGameState', { roomId });
  }
};



    socket.on("chatHistory", handleChatHistory);
    socket.emit("getChatHistory", { roomId });
    socket.on("gameState", handleGameState);
    socket.on("playerJoined", handlePlayerJoined);
    socket.on("playerConnected", handlePlayerConnected);
    socket.on("spectatorConnected", handleSpectatorConnected);
    socket.on("playerDisconnected", handlePlayerDisconnected);
    socket.on("playerRemoved", handlePlayerRemoved);
    socket.on("playerMuted", handlePlayerMuted);
    socket.on("playerUnmuted", handlePlayerUnmuted);
    socket.on("chatMessage", handleChatMessage);
    socket.on("diceRolled", handleDiceRolled);
    socket.on("coinMoved", handleCoinMoved);
    socket.on("chessMove", handleChessMove);
    socket.on("chessPlayersSelected", handleChessPlayersSelected);
    socket.on("kahootAnswer", handleKahootAnswer);
    socket.on("gameOver", handleGameOver);
    socket.on("error", handleError);
    socket.on("gameRestarted", handleGameRestarted);
    socket.on("gameEnded", handleGameEnded);
    socket.on('triviaQuestionsRegenerated', handleTriviaQuestionsRegenerated);    
    socket.on("unoGameState", handleUnoGameState);
socket.on("unoGameOver", handleUnoGameOver);
socket.on("unoError", handleUnoError);
socket.on('triviaSettingsUpdated', handleTriviaSettingsUpdated);


    return () => {
      socket.off("gameState", handleGameState);
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("playerConnected", handlePlayerConnected);
      socket.off("spectatorConnected", handleSpectatorConnected);
      socket.off("playerDisconnected", handlePlayerDisconnected);
      socket.off("playerRemoved", handlePlayerRemoved);
      socket.off("playerMuted", handlePlayerMuted);
      socket.off("playerUnmuted", handlePlayerUnmuted);
      socket.off("chatMessage", handleChatMessage);
      socket.off("diceRolled", handleDiceRolled);
      socket.off("coinMoved", handleCoinMoved);
      socket.off("chessMove", handleChessMove);
      socket.off("chessPlayersSelected", handleChessPlayersSelected);
      socket.off("kahootAnswer", handleKahootAnswer);
      socket.off("gameOver", handleGameOver);
      socket.off("error", handleError);
      socket.off("chatHistory", handleChatHistory);
      socket.off("gameEnded", handleGameEnded);
      socket.off("gameRestarted", handleGameRestarted);
      socket.off("gameEnded", handleGameEnded);
      socket.off('triviaQuestionsRegenerated', handleTriviaQuestionsRegenerated);
      socket.off("unoGameState", handleUnoGameState);
      socket.off("unoGameOver", handleUnoGameOver);
      socket.off("unoError", handleUnoError);
      socket.off('triviaSettingsUpdated', handleTriviaSettingsUpdated);
    };
  }, [socket, roomId, user, navigate, isSocketConnected]);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit("getGameState", { roomId });
    }
  }, [socket, roomId]);

  // Add this useEffect to request room info via socket
  useEffect(() => {
    if (socket && roomId && user?.id) {
      // Request room information from the server
      socket.emit('getRoomInfo', { roomId });
      

      const handleRoomInfo = (roomData: any) => {
        console.log('Room info received:', roomData);
        setRoomInfo(roomData);
        
        // Set isHost based on the room data
        const userIsHost = String(user.id) === String(roomData.host);
        setIsHost(userIsHost);
      
        // Build players list from both playerIds and spectatorIds
        const allParticipantIds = [
          ...(roomData.playerIds || []),
          ...(roomData.spectatorIds || [])
        ];
        
        setPlayers(prev => {
          const existing = new Map(prev.map(p => [p.id, p]));
          
          allParticipantIds.forEach(id => {
            if (!existing.has(id)) {
              existing.set(id, {
                id: id,
                name: playerIdToUsername[id] || id,
                color: '',
                coins: [0,0,0,0],
                isOnline: true
              } as Player);
            }
          });
          
          return Array.from(existing.values());
        });
      };
      
      socket.on('roomInfo', handleRoomInfo);
      
      return () => {
        socket.off('roomInfo', handleRoomInfo);
      };
    }
  }, [socket, roomId, user?.id]);

  // Update the existing isHost useEffect (around line 833-842)
  useEffect(() => {
    if (user?.id) {
      // Priority 1: use roomInfo.host if available (most reliable)
      if (roomInfo?.host) {
        const userIsHost = String(user.id) === String(roomInfo.host);
        setIsHost(userIsHost);
        console.log('Setting isHost from roomInfo:', { 
          userId: user.id, 
          hostId: roomInfo.host, 
          isHost: userIsHost 
        });
      }
      // Priority 2: use gameState.host as fallback
      else if (gameState?.host) {
        const userIsHost = String(user.id) === String(gameState.host);
        setIsHost(userIsHost);
        console.log('Setting isHost from gameState:', { 
          userId: user.id, 
          hostId: gameState.host, 
          isHost: userIsHost 
        });
      }
    }
  }, [user?.id, gameState?.host, roomInfo?.host]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());

      Object.values(remoteAudioRefs.current).forEach((audioEl) => {
        audioEl.remove();
      });
    };
  }, []);

  // All game action handlers remain the same...
  const handleRollDice = () => {
    if (
      socket &&
      gameState?.currentTurn === user?.id &&
      gameState.diceValue === 0 &&
      isActivePlayer()
    ) {
      socket.emit("rollDice", { roomId, playerId: user!.id });
    }
  };

  const handleMoveCoin = (coinId: string) => {
    if (
      socket &&
      gameState?.currentTurn === user?.id &&
      gameState.diceValue! > 0 &&
      isActivePlayer()
    ) {
      socket.emit("moveCoin", { roomId, playerId: user!.id, coinId });
    }
  };

  const handleChessMoveAction = (move: string) => {
    // Only allow chess move if user is an active playing participant (not host spectator)
    if (socket && gameState?.currentTurn === user?.id && isActivePlayer()) {
      socket.emit("makeChessMove", { roomId, playerId: user!.id, move });
    }
  };

  const handleKahootAnswerAction = (answerIndex: number) => {
    if (socket && gameState?.kahootState?.answers[String(user!.id)] === null && isActivePlayer()) {
      socket.emit("submitKahootAnswer", {
        roomId,
        playerId: user!.id,
        answerIndex,
      });
    }
  };

const handleStartGame = () => {
  if (!isHost) {
    alert('Only the host can start the game.');
    return;
  }
  
  console.log("Starting game for room:", roomId);
  if (!socket || !socket.connected) {
    console.error("Socket not connected");
    return;
  }

   // For UNO games, use the UNO-specific start event
   if (gameType === 'uno') {
    socket.emit('unoStartGame', { roomId });
    return;
  }
  
  // For chess games, check if players are already selected
  if (gameType === 'chess') {
    const playersSelected = gameState.players.length === 2 && 
      gameState.players.every(p => p.chessColor === 'white' || p.chessColor === 'black');
    
    if (playersSelected) {
      socket.emit('startChessGame', { roomId });
    } else {
      setShowChessPlayerModal(true);
    }
    return;
  }
  
  if (socket && roomId) {
    socket.emit("startGame", { roomId });
  }
};
  

  const handleChessPlayerSelection = (player1Id: string, player2Id: string) => {
    if (!socket || !roomId || !user?.id) return;
    
    console.log("Selecting chess players:", { player1Id, player2Id });
    
    socket.emit("selectChessPlayers", {
      roomId,
      hostId: user.id,
      player1Id,
      player2Id
    });
    
    setStartAfterSelect(true);  
    setShowChessPlayerModal(false);
  };

  const handleEndGame = () => {
    if (!isHost || !socket || !roomId) {
      console.error('Cannot end game: not host or missing socket/roomId');
      return;
    }
    
    const confirmEnd = window.confirm(
      'Are you sure you want to end this game? Players will be able to stay in the room, but the current game will be completed.'
    );
    
    if (confirmEnd) {
      console.log('Emitting endGame event');
      socket.emit('endGame', { roomId, hostId: user?.id });
    }
  };

  // const handleUpdateTriviaSettings = async (newSettings: any) => {
  //   if (!socket || !roomId || !user?.id) return;
    
  //   setIsUpdatingTriviaSettings(true);
    
  //   try {
  //     console.log('Updating trivia settings and restarting game:', newSettings);
      
  //     // Emit event to update trivia settings
  //     socket.emit('updateTriviaSettings', { 
  //       roomId, 
  //       hostId: user.id, 
  //       triviaSettings: newSettings 
  //     });
      
  //     // Wait a moment for settings to update, then restart game
  //     setTimeout(() => {
  //       handleRestartGame();
  //       setShowTriviaCategoryModal(false);
  //       setIsUpdatingTriviaSettings(false);
  //     }, 1000);
      
  //   } catch (error) {
  //     console.error('Error updating trivia settings:', error);
  //     setIsUpdatingTriviaSettings(false);
  //     alert('Failed to update trivia settings. Please try again.');
  //   }
  // };

  const handleUpdateTriviaSettings = async (newSettings: any) => {
    if (!socket || !roomId || !user?.id) return;
    
    setIsUpdatingTriviaSettings(true);
    
    try {
      console.log('Updating trivia settings and restarting game:', newSettings);
      
      // First update the trivia settings
      socket.emit('updateTriviaSettings', { 
        roomId, 
        hostId: user.id, 
        triviaSettings: newSettings 
      });
      
      // Wait a moment for settings to update, then restart game
      setTimeout(() => {
        console.log('Emitting restartGame after settings update');
        socket.emit('restartGame', { roomId, hostId: user.id });
        
        setShowTriviaCategoryModal(false);
        setIsUpdatingTriviaSettings(false);
      }, 500);
      
    } catch (error) {
      console.error('Error updating trivia settings:', error);
      setIsUpdatingTriviaSettings(false);
      alert('Failed to update trivia settings. Please try again.');
    }
  };


  const handleRestartGame = () => {
    if (!isHost || !socket || !roomId) {
      console.error('Cannot restart: not host or missing socket/roomId');
      return;
    }
  
    // For trivia games, open category modal instead of immediate restart
    if (gameType === 'trivia') {
      setShowTriviaCategoryModal(true);
      return;
    }
    
    const confirmRestart = window.confirm(
      'Are you sure you want to restart the game? This will start a fresh new round with all current players.'
    );
    
    if (confirmRestart) {
      console.log('Emitting restartGame event');
      
      // Optimistically reset local state immediately
      setGameEnded(false);
      setGameEndedMessage('');
      
      socket.emit('restartGame', { roomId, hostId: user?.id });
    }
  };
  
  // Update the handleRestartGame function
// const handleRestartGame = () => {
//   if (!isHost || !socket || !roomId) {
//     console.error('Cannot restart: not host or missing socket/roomId');
//     return;
//   }

//   if (gameType === 'trivia') {
//     setShowTriviaCategoryModal(true);
//     return;
//   }
  
//   const confirmRestart = window.confirm(
//     'Are you sure you want to restart the game? This will start a fresh new round with all current players.'
//   );
  
//   if (confirmRestart) {
//     console.log('Emitting restartGame event');
    
//     // Optimistically reset local state immediately
//     setGameEnded(false);
//     setGameEndedMessage('');
//     setGameState(prev => ({
//       ...prev,
//       gameStarted: false,
//       gameOver: false,
//       winner: null,
//       diceValue: 0,
//       diceRolled: false
//     }));

   
    
//     socket.emit('restartGame', { roomId, hostId: user?.id });
//   }
// };



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

  // renderGameContent function remains the same...
  const renderGameContent = () => {
    if (!socket) return null;

    const lowerCaseGameType = gameType.toLowerCase();
    
    // Handle game ended state
    if (gameEnded) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto p-6 bg-gray-800 rounded-xl border border-gray-700">
            <div className="mb-4">
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white mb-2">Game Ended</h2>
              <p className="text-gray-300 mb-4">{gameEndedMessage}</p>
            </div>
            
          </div>
        </div>
      );
    }

    if (!gameState?.gameStarted) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl mb-4">Waiting for players...</h2>
          <p className="text-gray-400 mb-4">
            Active players in room: {roomInfo?.currentPlayers || gameState.players.length}
            {isHost && !isActivePlayer() && (
              <span className="block text-sm text-purple-400 mt-1">
                (You are spectating as host)
              </span>
            )}
          </p>
          {isSocketConnected && (
            <div className="text-green-400 mb-4">✅ Connected</div>
          )}
          
          {isHost ? (
            <div className="flex flex-col items-center space-y-3">
              <button
                onClick={handleStartGame}
                className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start Game
              </button>
              <button
                onClick={handleEndGame}
                className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                End Game
              </button>
            </div>
          ) : (
            <p className="text-gray-400">Waiting for host to start the game...</p>
          )}
        </div>
      );
    }

    const gameContent = (() => {
      switch (lowerCaseGameType) {
        case "ludo":
          return (
            <div>
              <LudoGame
                gameState={gameState}
                currentPlayerId={String(user!.id)}
                onRollDice={handleRollDice}
                onMoveCoin={handleMoveCoin}
                onStartGame={handleStartGame}
                socket={socket}
                roomId={roomId!}
              />
              {gameState.currentTurn === user?.id &&
                !gameState.diceRolled &&
                !gameState.gameOver &&
                isActivePlayer() && (
                  <div className="absolute bottom-4 right-4">
                    <Dice
                      value={gameState.diceValue || 0}
                      onRoll={handleRollDice}
                      disabled={false}
                    />
                  </div>
                )}
              
              {/* Show spectator message for host */}
              {isHost && !isActivePlayer() && (
                <div className="absolute top-4 left-4 bg-purple-900/50 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <SettingsIcon size={16} className="text-purple-400" />
                    <span className="text-sm text-purple-400">Spectating as Host</span>
                  </div>
                </div>
              )}
            </div>
          );

        case "trivia":
          return (
            <div className="relative">
              <TriviaGame
                socket={socket}
                roomId={roomId!}
                currentPlayer={String(user!.id)}
                gameState={gameState}
              />
              
              {/* Show spectator message for host */}
              {isHost && !isActivePlayer() && (
                <div className="absolute top-4 left-4 bg-purple-900/50 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <SettingsIcon size={16} className="text-purple-400" />
                    <span className="text-sm text-purple-400">Spectating as Host</span>
                  </div>
                </div>
              )}
            </div>
          );
        case "chess":
          return (
            <div className="relative">
              <ChessGame
                socket={socket}
                roomId={roomId!}
                currentPlayer={String(user!.id)}
                gameState={gameState}
                onChessMove={handleChessMoveAction}
                // playerIdToUsername={playerIdToUsername}
              />
              
              {/* Show spectator message for host */}
              {isHost && !isActivePlayer() && (
                <div className="absolute top-4 left-4 bg-purple-900/50 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <SettingsIcon size={16} className="text-purple-400" />
                    <span className="text-sm text-purple-400">Spectating as Host</span>
                  </div>
                </div>
              )}
            </div>
          );
        case "uno":
          return (
            <div className="relative">
              <UnoGame
              socket={socket}
              roomId={roomId!}
              currentPlayer={String(user!.id)}
              gameState={gameState}
            />
              
              {/* Show spectator message for host */}
              {isHost && !isActivePlayer() && (
                <div className="absolute top-4 left-4 bg-purple-900/50 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <SettingsIcon size={16} className="text-purple-400" />
                    <span className="text-sm text-purple-400">Spectating as Host</span>
                  </div>
                </div>
              )}
            </div>
          );
        case "kahoot":
          return (
            <div className="relative">
              <KahootGame
                socket={socket}
                roomId={roomId!}
                currentPlayer={String(user!.id)}
                gameState={gameState}
              />
              
              {/* Show spectator message for host */}
              {isHost && !isActivePlayer() && (
                <div className="absolute top-4 left-4 bg-purple-900/50 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <SettingsIcon size={16} className="text-purple-400" />
                    <span className="text-sm text-purple-400">Spectating as Host</span>
                  </div>
                </div>
              )}
            </div>
          );
        case "pictionary":
          return (
            <div className="relative">
              {renderPictionaryGame({
                socket,
                roomId: roomId!,
                currentPlayer: String(user!.id),
                gameState,
              })}
              
              {/* Show spectator message for host */}
              {isHost && !isActivePlayer() && (
                <div className="absolute top-4 left-4 bg-purple-900/50 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <SettingsIcon size={16} className="text-purple-400" />
                    <span className="text-sm text-purple-400">Spectating as Host</span>
                  </div>
                </div>
              )}
            </div>
          );
        default:
          return (
            <div className="text-center text-gray-400">
              Game "{gameType}" not implemented yet
            </div>
          );
      }
    })();

    return (
      <div className="relative h-full">
        {gameContent}
        
        {isHost && gameState?.gameStarted && !gameState?.gameOver && (
          <div className="absolute top-4 right-4 flex space-x-2">
            <button
              onClick={handleEndGame}
              className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              End Game
            </button>
          </div>
        )}
        
        {isHost && gameState?.gameOver && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
          <button
            onClick={handleRestartGame}
            className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-glow"
          >
            Start New Round
          </button>
          <button
            onClick={handleEndGame}
            className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-red-glow"
          >
            End Game
          </button>
        </div>
        )}
      </div>
    );
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
    leaveAudioCall();

    if (socket) {
      socket.emit("leaveGame", { roomId, playerId: user?.id });
    }
    navigate("/");
  };

  if (!socket || !isSocketConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 border-t-transparent mx-auto mb-4"></div>
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
          {/* <button
            onClick={() => setShowVideoGrid(!showVideoGrid)}
            className={`p-2 rounded-lg ${
              showVideoGrid ? "bg-purple-600" : "hover:bg-gray-700"
            }`}
          >
            <VideoIcon size={20} />
          </button> */}
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
         <div>
           <PlayerList
            players={players}
            currentPlayerId={String(user!.id)}
            currentTurn={gameState?.currentTurn}
            isHost={isHost}
            onPlayerClick={handlePlayerClick}
            mutedPlayers={mutedPlayers}
            playerIdToUsername={playerIdToUsername}
            spectatorIds={roomInfo?.spectatorIds || []}
          />
          <button
        onClick={() => setShowPlayers(false)}
        className="sm:hidden absolute top-2 left-2 p-1 bg-gray-800 rounded-full z-50"
      >
        <XIcon size={16} />
      </button>
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
              currentPlayerId={String(user!.id)}
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

      <div className="fixed left-4 bottom-4 z-50">
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
      </div>

      {/* Player Management Modal */}
      <PlayerManagementModal
        isOpen={showPlayerModal}
        player={selectedPlayer}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayer(null);
        }}
        onRemovePlayer={handleRemovePlayer}
        onMutePlayer={handleMutePlayer}
        onUnmutePlayer={handleUnmutePlayer}
        isMuted={selectedPlayer ? mutedPlayers.includes(selectedPlayer.id) : false}
        isHostSelf={isHost && selectedPlayer?.id === user?.id}
        onRestartGame={handleRestartGame}
      />

      {/* Chess Player Selection Modal */}
      <ChessPlayerSelectionModal
        isOpen={showChessPlayerModal}
        onClose={() => setShowChessPlayerModal(false)}
        onConfirm={handleChessPlayerSelection}
        players={players.map(p => ({
          id: p.id,
          name: p.name || playerIdToUsername[p.id] || p.id,
          isSpectator: p.isSpectator
        }))}
        hostId={user?.id?.toString() || ''}  
        playerIdToUsername={playerIdToUsername}
      />

      {/* Trivia Category Selection Modal */}
    <TriviaCategorySelectionModal
      isOpen={showTriviaCategoryModal}
      onClose={() => setShowTriviaCategoryModal(false)}
      onConfirm={handleUpdateTriviaSettings}
      currentSettings={gameState.triviaSettings}
      isLoading={isUpdatingTriviaSettings}
    />

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



