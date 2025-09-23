
import React, { useState } from 'react';
import { XIcon, UsersIcon, CheckIcon } from 'lucide-react';
import { useUserData } from '../../hooks/useUserData';

interface Player {
  id: string;
  name: string;
  isSpectator?: boolean;
}

interface ChessPlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (player1Id: string, player2Id: string) => void;
  players: Player[];
  hostId: string;
  playerIdToUsername?: Record<string, string>;
}

// Component for each player to use the useUserData hook
const PlayerSelectionItem: React.FC<{
  player: Player;
  isHost: boolean;
  isSpectator: boolean;
  playerName: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}> = ({ player, isHost, isSpectator, playerName, isSelected, isDisabled, onClick }) => {
  const { avatar } = useUserData(player.id);

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`p-4 rounded-lg border-2 transition-all text-left ${
        isDisabled
          ? 'border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed'
          : isSelected
          ? 'border-purple-500 bg-purple-500/20 text-purple-400'
          : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={avatar}
            alt="Player avatar"
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.id)}`;
            }}
          />
          <div className="flex flex-col items-start">
            <span className="font-medium">{playerName}</span>
            <div className="flex items-center space-x-2 mt-1">
              {isHost && (
                <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-600/30">
                  Host
                </span>
              )}
              {isSpectator && (
                <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full border border-blue-600/30">
                  Spectator
                </span>
              )}
              {!isHost && !isSpectator && (
                <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full border border-green-600/30">
                  Player
                </span>
              )}
            </div>
          </div>
        </div>
        {isSelected && (
          <CheckIcon size={20} className="text-purple-400" />
        )}
      </div>
    </button>
  );
};

export const ChessPlayerSelectionModal: React.FC<ChessPlayerSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  players,
  hostId,
  playerIdToUsername = {}
}) => {
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('');
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('');

  if (!isOpen) return null;

  const availablePlayers = players.filter(player => player.id);

  const handleConfirm = () => {
    if (selectedPlayer1 && selectedPlayer2 && selectedPlayer1 !== selectedPlayer2) {
      onConfirm(selectedPlayer1, selectedPlayer2);
      onClose();
      // Reset selections
      setSelectedPlayer1('');
      setSelectedPlayer2('');
    }
  };

  const handlePlayerSelect = (playerId: string, isPlayer1: boolean) => {
    if (isPlayer1) {
      setSelectedPlayer1(playerId);
      if (selectedPlayer2 === playerId) {
        setSelectedPlayer2('');
      }
    } else {
      setSelectedPlayer2(playerId);
      if (selectedPlayer1 === playerId) {
        setSelectedPlayer1('');
      }
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return playerIdToUsername[playerId] || player?.name || playerId;
  };

  const handleClose = () => {
    setSelectedPlayer1('');
    setSelectedPlayer2('');
    onClose();
  };

  const isConfirmDisabled = !selectedPlayer1 || !selectedPlayer2 || selectedPlayer1 === selectedPlayer2;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <UsersIcon size={24} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Select Chess Players</h3>
              <p className="text-sm text-gray-400">Choose 2 players to play chess (anyone can play)</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {availablePlayers.length < 2 ? (
          <div className="text-center py-8">
            <div className="text-yellow-400 mb-4">
              <UsersIcon size={48} className="mx-auto" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Not Enough Players</h4>
            <p className="text-gray-400 mb-4">
              You need at least 2 players to start a chess game. Currently available: {availablePlayers.length}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Player 1 Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Player 1 (White Pieces)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                {availablePlayers.map((player) => {
                  const isHost = player.id === hostId;
                  const isSpectator = player.isSpectator || false;
                  const playerName = getPlayerName(player.id);
                  const isDisabled = selectedPlayer2 === player.id; // Disable if already selected as Player 2
                  
                  return (
                    <PlayerSelectionItem
                      key={`player1-${player.id}`}
                      player={player}
                      isHost={isHost}
                      isSpectator={isSpectator}
                      playerName={playerName}
                      isSelected={selectedPlayer1 === player.id}
                      isDisabled={isDisabled}
                      onClick={() => handlePlayerSelect(player.id, true)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Player 2 Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Player 2 (Black Pieces)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                {availablePlayers.map((player) => {
                  const isHost = player.id === hostId;
                  const isSpectator = player.isSpectator || false;
                  const playerName = getPlayerName(player.id);
                  const isDisabled = selectedPlayer1 === player.id; // Disable if already selected as Player 1
                  
                  return (
                    <PlayerSelectionItem
                      key={`player2-${player.id}`}
                      player={player}
                      isHost={isHost}
                      isSpectator={isSpectator}
                      playerName={playerName}
                      isSelected={selectedPlayer2 === player.id}
                      isDisabled={isDisabled}
                      onClick={() => handlePlayerSelect(player.id, false)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-700">
              <button
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className={`py-3 px-6 rounded-lg font-bold transition-colors ${
                  isConfirmDisabled
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                Confirm Players
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};