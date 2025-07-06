

interface GameRenderProps {
    socket: any;
    roomId: string;
    currentPlayer: string;
    gameState: any;
  }

export const renderChessGame: React.FC<GameRenderProps> = ({ socket: _socket, roomId: _roomId, currentPlayer: _currentPlayer, gameState: _gameState }) => {
    return (
    <div className="flex items-center justify-center h-full">
        <div className="w-full max-w-lg aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden shadow-lg">
          <div className="grid grid-cols-8 grid-rows-8 h-full">
            {Array(64).fill(0).map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isBlack = (row + col) % 2 === 1;
            return <div key={i} className={`${isBlack ? 'bg-gray-700' : 'bg-gray-300'} flex items-center justify-center`}>
                    {/* Chess pieces would go here */}
                  </div>;
          })}
          </div>
        </div>
      </div>
      );
  };
