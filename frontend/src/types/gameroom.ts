export interface GameRoom {
  id: string;
  roomId: string;
  name: string;
  gameType: string;
  host: string;
  hostName: string;
  hostAvatar: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  isInviteOnly: boolean;
  startTime?: string;
  scheduledTimeCombined?: string;
  playerIds: string[];
  entryFee?: number;
}

export interface Tournament {
  id: number;
  name: string;
  gameType: string;
  participants: number;
  startDate: string;
  prize: string;
  banner: string;
}

export interface JoinRoomResponse {
  roomId: string;
  success: boolean;
  message?: string;
}