import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface KahootGameProps {
  socket: Socket;
  roomId: string;
  currentPlayer: string;
  gameState: any;
}

const KahootGame: React.FC<KahootGameProps> = ({ socket, roomId, currentPlayer, gameState }) => {
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [answered, setAnswered] = useState<boolean>(false);

  useEffect(() => {
    if (gameState.kahootState) {
      const { currentQuestionIndex, questions, scores, questionTimer } = gameState.kahootState;
      if (questions && questions[currentQuestionIndex]) {
        setCurrentQuestion(questions[currentQuestionIndex]);
        setTimer(questionTimer);
        setScores(scores);
        setAnswered(gameState.kahootState.answers[currentPlayer] !== null);
      }
    }

    const handleGameState = (newGameState: any) => {
      if (newGameState.kahootState) {
        const { currentQuestionIndex, questions, scores, questionTimer, answers } = newGameState.kahootState;
        if (questions && questions[currentQuestionIndex]) {
          setCurrentQuestion(questions[currentQuestionIndex]);
          setTimer(questionTimer);
          setScores(scores);
          setAnswered(answers[currentPlayer] !== null);
          setSelectedAnswer(null);
        }
      }
    };

    const handleGameOver = (data: { winner: string }) => {
      alert(`Game Over! Winner: ${data.winner}`);
    };

    socket.on('gameState', handleGameState);
    socket.on('gameOver', handleGameOver);

    return () => {
      socket.off('gameState', handleGameState);
      socket.off('gameOver', handleGameOver);
    };
  }, [socket, gameState, currentPlayer]);

  useEffect(() => {
    if (timer > 0 && !answered) {
      const timerId = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [timer, answered]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (!answered) {
      setSelectedAnswer(answerIndex);
      socket.emit('submitKahootAnswer', { roomId, playerId: currentPlayer, answerIndex });
      setAnswered(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white">
      {gameState.gameOver ? (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
          <p className="text-xl">Winner: {gameState.winner}</p>
          <div className="mt-4">
            <h3 className="text-2xl">Final Scores:</h3>
            {Object.entries(scores).map(([playerId, score]) => (
              <p key={playerId}>{playerId}: {score}</p>
            ))}
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">{currentQuestion.text}</h2>
          <div className="grid grid-cols-2 gap-4">
            {currentQuestion.options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={answered}
                className={`p-4 rounded-lg text-lg font-semibold transition-colors ${
                  answered
                    ? index === currentQuestion.correctAnswer
                      ? 'bg-green-500'
                      : selectedAnswer === index
                      ? 'bg-red-500'
                      : 'bg-gray-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p>Time remaining: {timer}s</p>
            <p>Your score: {scores[currentPlayer] || 0}</p>
          </div>
        </div>
      ) : (
        <p>Loading question...</p>
      )}
    </div>
  );
};

export default KahootGame;



// import React, { useEffect, useState } from 'react';

// interface GameRenderProps {
//   socket: any;
//   roomId: string;
//   currentPlayer: string;
//   gameState: any;
//   onKahootAnswer: (answerIndex: number) => void;
// }

// export const renderKahootGame: React.FC<GameRenderProps> = ({ socket, roomId, currentPlayer, gameState, onKahootAnswer }) => {
//   const [timer, setTimer] = useState(gameState.kahootState?.questionTimer || 20);

//   useEffect(() => {
//     setTimer(gameState.kahootState?.questionTimer || 20);
//     const interval = setInterval(() => {
//       setTimer((prev: number) => (prev > 0 ? prev - 1 : 0));
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [gameState.kahootState?.currentQuestionIndex]);

//   const handleAnswer = (index: number) => {
//     if (gameState.kahootState?.answers[currentPlayer] === null && timer > 0) {
//       onKahootAnswer(index);
//     }
//   };

//   if (!gameState.kahootState || gameState.kahootState.currentQuestionIndex >= gameState.kahootState.questions.length) {
//     return (
//       <div className="flex flex-col h-full items-center justify-center">
//         <h2 className="text-2xl font-bold">Game Over!</h2>
//         <p className="text-gray-400 mt-2">Winner: {gameState.winner}</p>
//         <div className="mt-4">
//           {gameState.players.map((p: any) => (
//             <p key={p.id} className="text-gray-300">
//               {p.name}: {gameState.kahootState?.scores[p.id] || 0} points
//             </p>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   const question = gameState.kahootState.questions[gameState.kahootState.currentQuestionIndex];
//   const hasAnswered = gameState.kahootState?.answers[currentPlayer] !== null;

//   return (
//     <div className="flex flex-col h-full">
//       <div className="bg-purple-900 p-6 text-center">
//         <h2 className="text-2xl font-bold">{question.text}</h2>
//       </div>
//       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
//         {question.options.map((option: string, index: number) => (
//           <button
//             key={index}
//             className={`p-6 rounded-lg flex items-center transition-colors ${
//               hasAnswered
//                 ? 'bg-gray-600 cursor-not-allowed'
//                 : index === 0
//                 ? 'bg-red-600 hover:bg-red-700'
//                 : index === 1
//                 ? 'bg-blue-600 hover:bg-blue-700'
//                 : index === 2
//                 ? 'bg-yellow-600 hover:bg-yellow-700'
//                 : 'bg-green-600 hover:bg-green-700'
//             }`}
//             onClick={() => handleAnswer(index)}
//             disabled={hasAnswered || timer === 0}
//           >
//             <div
//               className={`w-8 h-8 rounded-md mr-3 flex items-center justify-center ${
//                 index === 0
//                   ? 'bg-red-800'
//                   : index === 1
//                   ? 'bg-blue-800'
//                   : index === 2
//                   ? 'bg-yellow-800'
//                   : 'bg-green-800'
//               }`}
//             >
//               {index === 0 ? '▲' : index === 1 ? '■' : index === 2 ? '●' : '✦'}
//             </div>
//             <span className="text-xl">{option}</span>
//           </button>
//         ))}
//       </div>
//       <div className="p-4 flex justify-center">
//         <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
//           {timer}
//         </div>
//       </div>
//       <div className="p-4 text-center">
//         <p className="text-gray-400">Your Score: {gameState.kahootState?.scores[currentPlayer] || 0}</p>
//       </div>
//     </div>
//   );
// };

// interface GameRenderProps {
//     socket: any;
//     roomId: string;
//     currentPlayer: string;
//     gameState: any;
//   }

// export  const renderKahootGame: React.FC<GameRenderProps> = ({ socket: _socket, roomId: _roomId, currentPlayer: _currentPlayer, gameState: _gameState }) => {
//     return ( <div className="flex flex-col h-full">
//         <div className="bg-purple-900 p-6 text-center">
//           <h2 className="text-2xl font-bold">
//             Who invented the World Wide Web?
//           </h2>
//         </div>
//         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
//           <button className="bg-red-600 hover:bg-red-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-red-800 mr-3 flex items-center justify-center">
//               ▲
//             </div>
//             <span className="text-xl">Tim Berners-Lee</span>
//           </button>
//           <button className="bg-blue-600 hover:bg-blue-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-blue-800 mr-3 flex items-center justify-center">
//               ■
//             </div>
//             <span className="text-xl">Bill Gates</span>
//           </button>
//           <button className="bg-yellow-600 hover:bg-yellow-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-yellow-800 mr-3 flex items-center justify-center">
//               ●
//             </div>
//             <span className="text-xl">Steve Jobs</span>
//           </button>
//           <button className="bg-green-600 hover:bg-green-700 transition-colors p-6 rounded-lg flex items-center">
//             <div className="w-8 h-8 rounded-md bg-green-800 mr-3 flex items-center justify-center">
//               ✦
//             </div>
//             <span className="text-xl">Mark Zuckerberg</span>
//           </button>
//         </div>
//         <div className="p-4 flex justify-center">
//           <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
//             20
//           </div>
//         </div>
//       </div>
//       );
//   };
