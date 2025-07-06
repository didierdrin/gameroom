
interface GameRenderProps {
    socket: any;
    roomId: string;
    currentPlayer: string;
    gameState: any;
  }

export  const renderKahootGame: React.FC<GameRenderProps> = ({ socket: _socket, roomId: _roomId, currentPlayer: _currentPlayer, gameState: _gameState }) => {
    return ( <div className="flex flex-col h-full">
        <div className="bg-purple-900 p-6 text-center">
          <h2 className="text-2xl font-bold">
            Who invented the World Wide Web?
          </h2>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <button className="bg-red-600 hover:bg-red-700 transition-colors p-6 rounded-lg flex items-center">
            <div className="w-8 h-8 rounded-md bg-red-800 mr-3 flex items-center justify-center">
              ▲
            </div>
            <span className="text-xl">Tim Berners-Lee</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 transition-colors p-6 rounded-lg flex items-center">
            <div className="w-8 h-8 rounded-md bg-blue-800 mr-3 flex items-center justify-center">
              ■
            </div>
            <span className="text-xl">Bill Gates</span>
          </button>
          <button className="bg-yellow-600 hover:bg-yellow-700 transition-colors p-6 rounded-lg flex items-center">
            <div className="w-8 h-8 rounded-md bg-yellow-800 mr-3 flex items-center justify-center">
              ●
            </div>
            <span className="text-xl">Steve Jobs</span>
          </button>
          <button className="bg-green-600 hover:bg-green-700 transition-colors p-6 rounded-lg flex items-center">
            <div className="w-8 h-8 rounded-md bg-green-800 mr-3 flex items-center justify-center">
              ✦
            </div>
            <span className="text-xl">Mark Zuckerberg</span>
          </button>
        </div>
        <div className="p-4 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
            20
          </div>
        </div>
      </div>
      );
  };
