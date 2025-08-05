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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{
    [key: string]: MediaStream;
  }>({});
  const [peers, setPeers] = useState<{ [key: string]: RTCPeerConnection }>({});
  const [queuedCandidates, setQueuedCandidates] = useState<
  Record<string, RTCIceCandidateInit[]> // Changed from RTCIceCandidate[] to RTCIceCandidateInit[]
>({});
  const [participants, setParticipants] = useState<Participant[]>([]);

  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const gameType = gameState?.gameType || roomInfo?.gameType || "ludo";

  // Check media device availability
  const checkMediaDevices = async (): Promise<MediaAvailability> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audio: devices.some((device) => device.kind === "audioinput"),
        video: devices.some((device) => device.kind === "videoinput"),
      };
    } catch (error) {
      console.error("Error enumerating devices:", error);
      return { audio: false, video: false };
    }
  };

  // Request media permissions
  const requestMediaPermissions = async (withVideo = false): Promise<boolean> => {
    try {
      const constraints = { audio: true, video: withVideo };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Permission denied:", error);
      return false;
    }
  };

  // Initialize local media stream
  const initLocalStream = async () => {
    if (!user?.id) return;
    setIsInitializingMedia(true);
    try {
      const { audio, video } = await checkMediaDevices();
      setMediaAvailable({ audio, video });
      if (!audio) {
        throw new Error("No audio devices available");
      }
      const constraints = {
        audio: true,
        video: videoEnabled && video ? { facingMode: "user" } : false,
      };
      const stream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch(async (err) => {
          console.error("Error accessing media devices:", err);
          if (videoEnabled) {
            return navigator.mediaDevices.getUserMedia({ audio: true });
          }
          throw err;
        });
      setLocalStream(stream);
      setParticipants((prev) => {
        const localParticipant = prev.find((p) => p.isLocal) || {
          id: user.id,
          name: user.username,
          isLocal: true,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        };
        return [
          {
            ...localParticipant,
            videoEnabled: stream.getVideoTracks().length > 0,
            audioEnabled: stream.getAudioTracks().length > 0,
            videoStream: stream.getVideoTracks().length > 0 ? stream : null,
            audioStream: stream.getAudioTracks().length > 0 ? stream : null,
          },
          ...prev.filter((p) => !p.isLocal),
        ];
      });
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing media:", error);
      setParticipants((prev) => prev.filter((p) => !p.isLocal));
      setLocalStream(null);
      setMediaAvailable((prev) => ({ ...prev, audio: false }));
    } finally {
      setIsInitializingMedia(false);
    }
  };

  // Clean up media streams
  const cleanupMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    Object.values(peers).forEach((peer) => peer.close());
    setPeers({});
    setRemoteStreams({});
    setParticipants((prev) => prev.filter((p) => p.isLocal));
  };

  const cleanupInvalidCandidates = () => {
  setQueuedCandidates((prev) => {
    const cleaned: Record<string, RTCIceCandidateInit[]> = {};
    
    Object.entries(prev).forEach(([peerId, candidates]) => {
      const validCandidates = candidates.filter(isValidIceCandidate);
      if (validCandidates.length > 0) {
        cleaned[peerId] = validCandidates;
      }
    });
    
    return cleaned;
  });
};

useEffect(() => {
  const cleanupInterval = setInterval(cleanupInvalidCandidates, 30000); // Every 30 seconds
  return () => clearInterval(cleanupInterval);
}, []);

  // Effect for media device initialization
  useEffect(() => {
    const initializeMedia = async () => {
      const available = await checkMediaDevices();
      setMediaAvailable(available);
    };
    initializeMedia();
  }, []);

  // Effect for audio call state changes
  useEffect(() => {
    if (!user?.id) return;
    if (inAudioCall) {
      const joinAudioCall = async () => {
        const hasPermission = await requestMediaPermissions();
        if (!hasPermission) {
          alert(
            "Microphone access is required for audio calls. Please enable microphone permissions."
          );
          setInAudioCall(false);
          return;
        }
        const { audio } = await checkMediaDevices();
        if (!audio) {
          alert(
            "No microphone found. Please connect a microphone to join the audio call."
          );
          setInAudioCall(false);
          return;
        }
        await initLocalStream();
        socket?.emit("joinAudio", { roomId, userId: user.id });
      };
      joinAudioCall();
    } else {
      cleanupMedia();
      socket?.emit("leaveAudio", { roomId, userId: user.id });
      setIsDeafened(false);
    }
    return () => {
      cleanupMedia();
    };
  }, [inAudioCall]);

  // WebRTC Peer Connection setup
  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "turn:alu-globe-game-room-turn-server.onrender.com:3478", // Fixed port
          username: "aluglobe2025",
          credential: "aluglobe2025development",
        },
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
  
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });
    }
  
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        // Validate candidate before sending
        if (isValidIceCandidate(event.candidate)) {
          socket?.emit("signal", {
            signal: { candidate: event.candidate },
            callerId: user?.id,
            roomId,
            targetId: peerId,
            type: "candidate",
          });
        } else {
          console.warn("Generated invalid ICE candidate, not sending:", event.candidate);
        }
      }
    };
  
    peer.ontrack = (event) => {
      const stream = event.streams[0];
      setParticipants((prev) => {
        const existing = prev.find((p) => p.id === peerId);
        if (existing) {
          return prev.map((p) =>
            p.id === peerId
              ? {
                  ...p,
                  videoStream:
                    stream.getVideoTracks().length > 0
                      ? stream
                      : p.videoStream,
                  audioStream:
                    stream.getAudioTracks().length > 0
                      ? stream
                      : p.audioStream,
                  videoEnabled: stream.getVideoTracks().length > 0,
                  audioEnabled: stream.getAudioTracks().length > 0,
                }
              : p
          );
        }
        return [
          ...prev,
          {
            id: peerId,
            name: peerId.slice(0, 8),
            videoEnabled: stream.getVideoTracks().length > 0,
            audioEnabled: stream.getAudioTracks().length > 0,
            videoStream: stream.getVideoTracks().length > 0 ? stream : null,
            audioStream: stream.getAudioTracks().length > 0 ? stream : null,
            isLocal: false,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerId}`,
          },
        ];
      });
    };
  
    peer.oniceconnectionstatechange = () => {
      console.log(
        `ICE connection state changed for ${peerId}:`,
        peer.iceConnectionState
      );
      if (
        peer.iceConnectionState === "disconnected" ||
        peer.iceConnectionState === "failed"
      ) {
        peer.close();
        setPeers((prev) => {
          const newPeers = { ...prev };
          delete newPeers[peerId];
          return newPeers;
        });
        setParticipants((prev) => prev.filter((p) => p.id !== peerId));
        
        // Clear any queued candidates for this peer
        setQueuedCandidates((prev) => {
          const newQueues = { ...prev };
          delete newQueues[peerId];
          return newQueues;
        });
      }
    };
  
    setPeers((prev) => ({ ...prev, [peerId]: peer }));
    return peer;
  };

  const isValidIceCandidate = (candidate: any): boolean => {
    return (
      candidate &&
      candidate.candidate &&
      typeof candidate.candidate === 'string' &&
      candidate.candidate.trim() !== '' &&
      (candidate.sdpMid !== null || candidate.sdpMLineIndex !== null)
    );
  };

  

  // WebRTC signaling handlers
  useEffect(() => {
    if (!socket || !user?.id) return;

    
    
    const handleSignal = async ({
      type,
      signal,
      senderId,
    }: {
      type: "offer" | "answer" | "candidate";
      signal: any;
      senderId: string;
    }) => {
      try {
        let peer = peers[senderId];
        
        if (!peer && type === "offer") {
          peer = createPeerConnection(senderId);
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("signal", {
            type: "answer",
            signal: answer,
            callerId: user.id,
            roomId,
            targetId: senderId,
          });
        } else if (peer && type === "answer") {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (type === "candidate") {
          // Validate the candidate before processing
          if (!isValidIceCandidate(signal)) {
            console.warn("Invalid ICE candidate received, skipping:", signal);
            return;
          }
    
          if (peer && peer.remoteDescription) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(signal));
            } catch (error) {
              console.error("Failed to add ICE candidate:", error, signal);
            }
          } else {
            // Store raw candidate data, not RTCIceCandidate object
            setQueuedCandidates((prev) => ({
              ...prev,
              [senderId]: [...(prev[senderId] || []), signal], // Store raw signal data
            }));
          }
        }
      } catch (error) {
        console.error("Signal handling error:", error);
      }
    };
    
    const handleQueuedCandidate = ({
      candidate,
      senderId,
    }: {
      candidate: RTCIceCandidateInit;
      senderId: string;
    }) => {
      // Validate the candidate before queuing
      if (!isValidIceCandidate(candidate)) {
        console.warn("Invalid queued ICE candidate received, skipping:", candidate);
        return;
      }
    
      setQueuedCandidates((prev) => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), candidate], // Store raw candidate data
      }));
    };



    const handlePeerJoined = (peerId: string) => {
      if (peerId === user.id || !inAudioCall) return;
      setupConnection(peerId);
    };

    const handlePeerLeft = (peerId: string) => {
      if (peers[peerId]) {
        peers[peerId].close();
        setPeers((prev) => {
          const newPeers = { ...prev };
          delete newPeers[peerId];
          return newPeers;
        });
        setParticipants((prev) => prev.filter((p) => p.id !== peerId));
      }
    };

    socket.on("signal", handleSignal);
    socket.on("queuedCandidate", handleQueuedCandidate);
    socket.on("peerJoined", handlePeerJoined);
    socket.on("peerLeft", handlePeerLeft);

    return () => {
      socket.off("signal", handleSignal);
      socket.off("queuedCandidate", handleQueuedCandidate);
      socket.off("peerJoined", handlePeerJoined);
      socket.off("peerLeft", handlePeerLeft);
    };
  }, [socket, user?.id, roomId, peers, inAudioCall]);

  const setupConnection = async (peerId: string) => {
    if (peers[peerId] || peerId === user?.id) return;
    
    const peer = createPeerConnection(peerId);
    
    try {
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await peer.setLocalDescription(offer);
      socket?.emit("signal", {
        type: "offer",
        signal: offer,
        callerId: user?.id,
        roomId,
        targetId: peerId,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      return;
    }};

  // Media control functions
  const toggleVideo = async () => {
    if (isScreenSharing) {
      localStream?.getVideoTracks().forEach((track) => track.stop());
      setIsScreenSharing(false);
    }
    const newVideoEnabled = !videoEnabled;
    setVideoEnabled(newVideoEnabled);
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = newVideoEnabled;
      } else if (newVideoEnabled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          const newVideoTrack = stream.getVideoTracks()[0];
          localStream.addTrack(newVideoTrack);
          Object.values(peers).forEach((peer) => {
            const sender = peer
              .getSenders()
              .find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            } else {
              peer.addTrack(newVideoTrack, localStream);
            }
          });
        } catch (error) {
          console.error("Error enabling video:", error);
          setVideoEnabled(false);
        }
      }
    }
    setParticipants((prev) =>
      prev.map((p) =>
        p.isLocal
          ? {
              ...p,
              videoEnabled: newVideoEnabled,
              videoStream: newVideoEnabled && localStream ? localStream : null,
            }
          : p
      )
    );
  };

  const toggleAudio = () => {
    const newAudioEnabled = !audioEnabled;
    setAudioEnabled(newAudioEnabled);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = newAudioEnabled;
      });
    }
    setParticipants((prev) =>
      prev.map((p) =>
        p.isLocal ? { ...p, audioEnabled: newAudioEnabled } : p
      )
    );
  };

  const toggleAudioCall = async () => {
    if (!inAudioCall) {
      setInAudioCall(true);
    } else {
      cleanupMedia();
      setInAudioCall(false);
      setIsDeafened(false);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  const toggleMute = () => {
    toggleAudio();
  };

  const handleScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const videoTrack = screenStream.getVideoTracks()[0];
      Object.values(peers).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });
      setParticipants((prev) =>
        prev.map((p) =>
          p.isLocal
            ? {
                ...p,
                videoStream: screenStream,
                videoEnabled: true,
              }
            : p
        )
      );
      setIsScreenSharing(true);
      videoTrack.onended = () => {
        toggleVideo();
      };
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };

  const handleCameraSwitch = async () => {
    const constraints = { video: { facingMode: "user" } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoTrack = stream.getVideoTracks()[0];
    Object.values(peers).forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(videoTrack);
    });
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => track.stop());
      localStream.addTrack(videoTrack);
    }
    setIsScreenSharing(false);
    stream.getTracks().forEach((track) => {
      if (track.kind !== "video") track.stop();
    });
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
      {showVideoGrid && (
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
        remoteParticipants={Object.keys(remoteStreams)}
        mediaAvailable={mediaAvailable}
        isInitializingMedia={isInitializingMedia}
      />
      <audio
        ref={localAudioRef}
        autoPlay
        playsInline
        muted={true}
        style={{ display: "none" }}
      />
      {Object.entries(remoteStreams).map(([peerId]) => (
        <audio
          key={peerId}
          ref={(el) => (remoteAudioRefs.current[peerId] = el)}
          autoPlay
          playsInline
          muted={isDeafened}
          style={{ display: "none" }}
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
