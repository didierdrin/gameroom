
interface GameRenderProps {
    socket: any;
    roomId: string;
    currentPlayer: string;
    gameState: any;
  }

export const renderUnoGame: React.FC<GameRenderProps> = ({ socket: _socket, roomId: _roomId, currentPlayer: _currentPlayer, gameState: _gameState }) => {
    return <div className="flex flex-col items-center justify-between h-full p-4">
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            {Array(7).fill(0).map((_, i) => <div key={i} className="w-12 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-md shadow-md transform -rotate-12 border-2 border-white/20"></div>)}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="w-24 h-36 bg-gray-700 rounded-lg border border-gray-600 absolute -rotate-6 transform translate-x-2"></div>
            <div className="w-24 h-36 bg-gradient-to-br from-red-500 to-red-700 rounded-lg border-2 border-white/30 shadow-lg flex items-center justify-center text-2xl font-bold z-10 relative">
              7
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            {['red', 'blue', 'green', 'yellow', 'red', 'blue', 'wild'].map((color, i) => <div key={i} className={`w-16 h-24 rounded-md shadow-lg hover:-translate-y-4 transition-transform cursor-pointer border-2 border-white/20 ${color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-700' : color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-700' : color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-700' : 'bg-gradient-to-br from-purple-500 to-pink-500'} flex items-center justify-center text-3xl font-bold`}>
                  {i + 1}
                </div>)}
          </div>
        </div>
      </div>;
  };