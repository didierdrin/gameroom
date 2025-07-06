
export  const renderPictionaryGame = () => {
    return <div className="flex flex-col h-full">
        <div className="bg-purple-900/50 p-3 text-center">
          <p className="text-lg">
            Your word to draw: <strong>Elephant</strong>
          </p>
        </div>
        <div className="flex-1 bg-white rounded-lg m-4 relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Drawing canvas would be here
          </div>
        </div>
        <div className="p-3 bg-gray-800 flex justify-center space-x-3">
          {['black', 'red', 'blue', 'green', 'yellow'].map(color => <button key={color} className={`w-8 h-8 rounded-full ${color === 'black' ? 'bg-black' : color === 'red' ? 'bg-red-500' : color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : 'bg-yellow-500'} border-2 border-white/50`}></button>)}
          <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
            ⌫
          </button>
          <button className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            🧽
          </button>
        </div>
        <div className="p-2 flex justify-center">
          <div className="px-4 py-1 rounded-full bg-purple-600/30 border border-purple-500 flex items-center justify-center text-lg font-bold">
            45s remaining
          </div>
        </div>
      </div>;
  };