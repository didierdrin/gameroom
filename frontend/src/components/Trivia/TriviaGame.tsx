// /components/TriviaGame.tsx 
import React, { useEffect, useState } from 'react';
import { SocketType } from '../../SocketContext';
import { Fireworks } from '../UI/Fireworks';
import { useUserData } from '../../hooks/useUserData';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty?: string;
  category?: string;
}

interface TriviaGameProps {
  socket: SocketType;
  roomId: string;
  currentPlayer: string;
  gameState: any;
}

const PlayerDisplay: React.FC<{ playerId: string }> = ({ playerId }) => {
  const { username, avatar } = useUserData(playerId);

  return (
    <div className="flex items-center">
      <img 
        src={avatar} 
        alt={username} 
        className="w-10 h-10 rounded-full border border-gray-600"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
        }}
      />
      <div className="ml-3">
        <div className="font-medium">{username || playerId}</div>
      </div>
    </div>
  );
};

export const TriviaGame: React.FC<TriviaGameProps> = ({ 
  socket, 
  roomId, 
  currentPlayer, 
  gameState 
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timer, setTimer] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showAnswerResult, setShowAnswerResult] = useState(false);
  const [hasCompletedGame, setHasCompletedGame] = useState(false);

  useEffect(() => {
    if (gameState.triviaState?.questions) {
      setQuestions(gameState.triviaState.questions);
      setCurrentQ(gameState.triviaState.currentQuestionIndex || 0);
      setLoading(false);
    }
  }, [gameState]);

  // Sync with backend game over state
  useEffect(() => {
    if (gameState.gameOver && !hasCompletedGame) {
      console.log('Game over detected from backend, showing results');
      setShowFireworks(true);
      setHasCompletedGame(true);
    }
  }, [gameState.gameOver, hasCompletedGame]);

  useEffect(() => {
    if (timer > 0 && !loading && questions.length > 0 && !hasAnswered) {
      const timeout = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(timeout);
    } else if (timer === 0 && !hasAnswered) {
      submitAnswer();
    }
  }, [timer, loading, questions, hasAnswered]);

  const submitAnswer = () => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    setShowAnswerResult(true);
    
    const currentQuestion = questions[currentQ];
    const isCorrect = selected === currentQuestion.correctAnswer;
    
    console.log('Submitting answer:', {
      questionId: currentQuestion.id,
      selected,
      correct: currentQuestion.correctAnswer,
      isCorrect,
      currentScore: gameState.triviaState?.scores?.[currentPlayer] || 0
    });
    
    socket.emit('triviaAnswer', { 
      roomId, 
      playerId: currentPlayer, 
      qId: currentQuestion.id, 
      answer: selected,
      correct: currentQuestion.correctAnswer,
      isCorrect
    });

    // Move to next question after showing result
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = () => {
    // Check if this was the last question
    if (currentQ + 1 >= questions.length) {
      console.log('Last question answered, completing game');
      
      // Show fireworks immediately
      setShowFireworks(true);
      
      // Get final score from gameState
      const finalScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
      
      console.log('Emitting triviaComplete:', {
        playerId: currentPlayer,
        finalScore,
        totalQuestions: questions.length
      });
      
      // Emit completion to backend
      socket.emit('triviaComplete', { 
        roomId, 
        playerId: currentPlayer, 
        score: finalScore,
        total: questions.length 
      });
      
      setHasCompletedGame(true);
    } else {
      // Move to next question
      setCurrentQ(currentQ + 1);
      setTimer(10);
      setSelected(null);
      setHasAnswered(false);
      setShowAnswerResult(false);
    }
  };

  const getLeaderboardData = () => {
    const scores = gameState.triviaState?.scores || {};
    
    console.log('Building leaderboard with scores:', scores);
    
    return Object.entries(scores)
      .map(([playerId, playerScore]) => {
        const playerInfo = gameState.players.find((p:any) => p.id === playerId);
        return {
          _id: playerId,
          score: playerScore as number,
          name: playerInfo?.name || playerId
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  const leaderboardData = gameState.gameOver ? getLeaderboardData() : [];
  const { username: currentUsername } = useUserData(currentPlayer);
  const isWinner = leaderboardData.length > 0 && leaderboardData[0]._id === currentPlayer;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <p>Loading trivia questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
        <p>No questions available. Please try again later.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQ];
  const currentPlayerScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
  const isCorrect = selected === currentQuestion.correctAnswer;

  return (
    <div className="flex flex-col h-full">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      {gameState.gameOver ? (
        <div className="text-center p-6">
          <h2 className="text-3xl font-bold mb-6">
            {isWinner ? '🎉 Congratulations!' : 'Game Over!'}
          </h2>
          
          {leaderboardData.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden max-w-2xl mx-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {leaderboardData.map((player, index) => (
                    <tr key={player._id} className={index < 3 ? 'bg-gray-800/30' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-300' : 
                          index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                          index === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-gray-700/50 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PlayerDisplay playerId={player._id} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold">{player.score} points</div>
                        <div className="text-sm text-gray-400">
                          {Math.floor(player.score / 5)} correct answers
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="mb-4 text-purple-400 text-lg flex justify-between w-full max-w-3xl">
              <span>Question {currentQ + 1} of {questions.length}</span>
              <span className="font-bold">Score: {currentPlayerScore}</span>
            </div>
            {currentQuestion.category && (
              <div className="text-sm text-gray-500 mb-1">
                Category: {currentQuestion.category}
              </div>
            )}
            {currentQuestion.difficulty && (
              <div className="text-sm text-gray-500 mb-4">
                Difficulty: {currentQuestion.difficulty}
              </div>
            )}
            
            {showAnswerResult && (
              <div className={`p-4 mb-4 rounded-lg text-center text-xl font-bold ${
                isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect!'}
                <div className="text-sm mt-2 font-normal">
                  {currentQ + 1 < questions.length ? 'Moving to next question...' : 'Calculating final results...'}
                </div>
              </div>
            )}
            
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              {currentQuestion.text}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    selected === option 
                      ? 'bg-purple-600 text-white border-purple-600' 
                      : 'bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50'
                  } ${
                    hasAnswered && option === currentQuestion.correctAnswer 
                      ? '!bg-green-500 !text-white !border-green-500' 
                      : ''
                  } ${
                    hasAnswered && selected !== currentQuestion.correctAnswer && selected === option 
                      ? '!bg-red-500 !text-white !border-red-500' 
                      : ''
                  }`}
                  onClick={() => !hasAnswered && setSelected(option)}
                  disabled={hasAnswered}
                >
                  {String.fromCharCode(65 + index)}. {option}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-purple-600/30 border-4 border-purple-500 flex items-center justify-center text-2xl font-bold">
              {timer}
            </div>
          </div>
          {selected && !hasAnswered && (
            <div className="p-4">
              <button
                className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                onClick={submitAnswer}
              >
                Submit Answer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};


// // /components/TriviaGame.tsx 
// import React, { useEffect, useState } from 'react';
// import { SocketType } from '../../SocketContext';
// import { Fireworks } from '../UI/Fireworks';
// import { useUserData } from '../../hooks/useUserData';

// interface Question {
//   id: string;
//   text: string;
//   options: string[];
//   correctAnswer: string;
//   difficulty?: string;
//   category?: string;
// }

// interface TriviaGameProps {
//   socket: SocketType;
//   roomId: string;
//   currentPlayer: string;
//   gameState: any;
// }

// // Component to handle player display with proper data fetching
// const PlayerDisplay: React.FC<{ playerId: string }> = ({ playerId }) => {
//   const { username, avatar } = useUserData(playerId);

//   return (
//     <div className="flex items-center">
//       <img 
//         src={avatar} 
//         alt={username} 
//         className="w-10 h-10 rounded-full border border-gray-600"
//         onError={(e) => {
//           const target = e.target as HTMLImageElement;
//           target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
//         }}
//       />
//       <div className="ml-3">
//         <div className="font-medium">{username || playerId}</div>
//       </div>
//     </div>
//   );
// };

// export const TriviaGame: React.FC<TriviaGameProps> = ({ 
//   socket, 
//   roomId, 
//   currentPlayer, 
//   gameState 
// }) => {
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [currentQ, setCurrentQ] = useState(0);
//   const [selected, setSelected] = useState<string | null>(null);
//   const [timer, setTimer] = useState(10);
//   const [loading, setLoading] = useState(true);
//   const [showFireworks, setShowFireworks] = useState(false);
//   const [hasAnswered, setHasAnswered] = useState(false);
//   const [showAnswerResult, setShowAnswerResult] = useState(false);

//   useEffect(() => {
//     if (gameState.triviaState?.questions) {
//       setQuestions(gameState.triviaState.questions);
//       setLoading(false);
//     }
//   }, [gameState]);

//   useEffect(() => {
//     if (timer > 0 && !loading && questions.length > 0 && !hasAnswered) {
//       const timeout = setTimeout(() => setTimer(timer - 1), 1000);
//       return () => clearTimeout(timeout);
//     } else if (timer === 0 && !hasAnswered) {
//       submitAnswer();
//     }
//   }, [timer, loading, questions, hasAnswered]);


// // Update the submitAnswer function to ensure proper score calculation
// const submitAnswer = () => {
//   if (hasAnswered) return;
  
//   setHasAnswered(true);
//   setShowAnswerResult(true);
  
//   const currentQuestion = questions[currentQ];
//   const isCorrect = selected === currentQuestion.correctAnswer;
  
//   console.log('Submitting answer:', {
//     questionId: currentQuestion.id,
//     selected,
//     correct: currentQuestion.correctAnswer,
//     isCorrect,
//     currentScore: gameState.triviaState?.scores?.[currentPlayer] || 0
//   });
  
//   // Emit answer to backend
//   socket.emit('triviaAnswer', { 
//     roomId, 
//     playerId: currentPlayer, 
//     qId: currentQuestion.id, 
//     answer: selected,
//     correct: currentQuestion.correctAnswer,
//     isCorrect
//   });
  
//   // Update local state immediately for better UX
//   if (isCorrect) {
//     const currentScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
//     const newScore = currentScore + 5;
//     console.log(`Updating local score: ${currentScore} -> ${newScore}`);
//   }

//   // Move to next question after delay
//   setTimeout(() => {
//     nextQuestion();
//   }, 2000);
// };


// // Update the nextQuestion function to handle game completion properly
// const nextQuestion = () => {
//   if (currentQ + 1 < questions.length) {
//     setCurrentQ(currentQ + 1);
//     setTimer(10);
//     setSelected(null);
//     setHasAnswered(false);
//     setShowAnswerResult(false);
//   } else {
//     setShowFireworks(true);
    
//     // Get final score from gameState - this should now be properly calculated
//     const finalScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
    
//     console.log('Game complete - sending final score:', {
//       playerId: currentPlayer,
//       finalScore,
//       totalQuestions: questions.length,
//       allScores: gameState.triviaState?.scores
//     });
    
//     socket.emit('triviaComplete', { 
//       roomId, 
//       playerId: currentPlayer, 
//       score: finalScore,
//       total: questions.length 
//     });
//   }
// };

//   const handleNextQuestion = () => {
//     nextQuestion();
//   };


//   const getLeaderboardData = () => {
//     const scores = gameState.triviaState?.scores || {};
    
//     console.log('Building leaderboard with scores:', scores);
//     console.log('Current players:', gameState.players);
    
//     // Create leaderboard data with proper player info
//     return Object.entries(scores)
//       .map(([playerId, playerScore]) => {
//         // Find player info from gameState.players
//         const playerInfo = gameState.players.find((p:any) => p.id === playerId);
//         return {
//           _id: playerId,
//           score: playerScore as number,
//           name: playerInfo?.name || playerId
//         };
//       })
//       .sort((a, b) => b.score - a.score);
//   };

//   const leaderboardData = gameState.gameOver ? getLeaderboardData() : [];
//   const { username: currentUsername } = useUserData(currentPlayer);
//   const isWinner = leaderboardData.length > 0 && leaderboardData[0]._id === currentPlayer;

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center h-full">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
//         <p>Loading trivia questions...</p>
//       </div>
//     );
//   }

//   if (questions.length === 0) {
//     return (
//       <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
//         <p>No questions available. Please try again later.</p>
//       </div>
//     );
//   }

//   const currentQuestion = questions[currentQ];
//   const currentPlayerScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
//   const isCorrect = selected === currentQuestion.correctAnswer;

//   return (
//     <div className="flex flex-col h-full">
//       <Fireworks 
//         show={showFireworks} 
//         onComplete={() => setShowFireworks(false)} 
//       />
//       {gameState.gameOver ? (
//         <div className="text-center p-6">
//           <h2 className="text-3xl font-bold mb-6">
//             {isWinner ? 'Congratulations!' : 'Game Over!'}
//           </h2>
          
//           {leaderboardData.length > 0 && (
//             <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden max-w-2xl mx-auto">
//               <table className="w-full">
//                 <thead>
//                   <tr className="bg-gray-800">
//                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                       Rank
//                     </th>
//                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                       Player
//                     </th>
//                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                       Score
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-700">
//                 {leaderboardData.map((player, index) => (
//   <tr key={player._id} className={index < 3 ? 'bg-gray-800/30' : ''}>
//     <td className="px-6 py-4 whitespace-nowrap">
//       <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
//         index === 0 ? 'bg-yellow-500/20 text-yellow-300' : 
//         index === 1 ? 'bg-gray-400/20 text-gray-300' : 
//         index === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-gray-700/50 text-gray-400'
//       }`}>
//         {index + 1}
//       </div>
//     </td>
//     <td className="px-6 py-4 whitespace-nowrap">
//       <PlayerDisplay playerId={player._id} />
//     </td>
//     <td className="px-6 py-4 whitespace-nowrap">
//       <div className="text-lg font-bold">{player.score} points</div>
//       <div className="text-sm text-gray-400">
//         {Math.floor(player.score / 5)} correct answers
//       </div>
//     </td>
//   </tr>
// ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       ) : (
//         <>
//           <div className="flex-1 flex flex-col items-center justify-center p-8">
//             <div className="mb-4 text-purple-400 text-lg flex justify-between w-full max-w-3xl">
//               <span>Question {currentQ + 1} of {questions.length}</span>
//               <span className="font-bold">Score: {currentPlayerScore}</span>
//             </div>
//             {currentQuestion.category && (
//               <div className="text-sm text-gray-500 mb-1">
//                 Category: {currentQuestion.category}
//               </div>
//             )}
//             {currentQuestion.difficulty && (
//               <div className="text-sm text-gray-500 mb-4">
//                 Difficulty: {currentQuestion.difficulty}
//               </div>
//             )}
            
//             {/* Show result feedback for 2 seconds after answering */}
//             {showAnswerResult && (
//               <div className={`p-4 mb-4 rounded-lg text-center text-xl font-bold ${
//                 isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
//               }`}>
//                 {isCorrect ? '✓ Correct!' : '✗ Incorrect!'}
//                 <div className="text-sm mt-2 font-normal">
//                   Moving to next question...
//                 </div>
//               </div>
//             )}
            
//             <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
//               {currentQuestion.text}
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
//               {currentQuestion.options.map((option, index) => (
//                 <button
//                   key={index}
//                   className={`p-4 rounded-lg text-left transition-colors ${
//                     selected === option 
//                       ? 'bg-purple-600 text-white border-purple-600' 
//                       : 'bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50'
//                   } ${
//                     hasAnswered && option === currentQuestion.correctAnswer 
//                       ? '!bg-green-500 !text-white !border-green-500' 
//                       : ''
//                   } ${
//                     hasAnswered && selected !== currentQuestion.correctAnswer && selected === option 
//                       ? '!bg-red-500 !text-white !border-red-500' 
//                       : ''
//                   }`}
//                   onClick={() => !hasAnswered && setSelected(option)}
//                   disabled={hasAnswered}
//                 >
//                   {String.fromCharCode(65 + index)}. {option}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <div className="p-4 flex justify-center">
//             <div className="w-16 h-16 rounded-full bg-purple-600/30 border-4 border-purple-500 flex items-center justify-center text-2xl font-bold">
//               {timer}
//             </div>
//           </div>
//           {selected && !hasAnswered && (
//             <div className="p-4">
//               <button
//                 className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
//                 onClick={submitAnswer}
//               >
//                 Submit Answer
//               </button>
//             </div>
//           )}
//           {/* Keep the manual next button as backup */}
//           {hasAnswered && !showAnswerResult && (
//             <div className="p-4">
//               <button
//                 className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
//                 onClick={handleNextQuestion}
//               >
//                 {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'}
//               </button>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// };


// // /components/TriviaGame.tsx 
// import React, { useEffect, useState } from 'react';
// import { SocketType } from '../../SocketContext';
// import { Fireworks } from '../UI/Fireworks';
// import { useUserData } from '../../hooks/useUserData';

// interface Question {
//   id: string;
//   text: string;
//   options: string[];
//   correctAnswer: string;
//   difficulty?: string;
//   category?: string;
// }

// interface TriviaGameProps {
//   socket: SocketType;
//   roomId: string;
//   currentPlayer: string;
//   gameState: any;
// }

// // Component to handle player display with proper data fetching
// const PlayerDisplay: React.FC<{ playerId: string }> = ({ playerId }) => {
//   const { username, avatar } = useUserData(playerId);

//   return (
//     <div className="flex items-center">
//       <img 
//         src={avatar} 
//         alt={username} 
//         className="w-10 h-10 rounded-full border border-gray-600"
//         onError={(e) => {
//           const target = e.target as HTMLImageElement;
//           target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
//         }}
//       />
//       <div className="ml-3">
//         <div className="font-medium">{username || playerId}</div>
//       </div>
//     </div>
//   );
// };

// export const TriviaGame: React.FC<TriviaGameProps> = ({ 
//   socket, 
//   roomId, 
//   currentPlayer, 
//   gameState 
// }) => {
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [currentQ, setCurrentQ] = useState(0);
//   const [selected, setSelected] = useState<string | null>(null);
//   const [timer, setTimer] = useState(5);
//   const [loading, setLoading] = useState(true);
//   const [score, setScore] = useState(0);
//   const [showFireworks, setShowFireworks] = useState(false);

//   useEffect(() => {
//     if (gameState.triviaState?.questions) {
//       setQuestions(gameState.triviaState.questions);
//       setLoading(false);
//     }
//   }, [gameState]);

//   useEffect(() => {
//     if (timer > 0 && !loading && questions.length > 0) {
//       const timeout = setTimeout(() => setTimer(timer - 1), 1000);
//       return () => clearTimeout(timeout);
//     } else if (timer === 0) {
//       submitAnswer();
//     }
//   }, [timer, loading, questions]);

//   const submitAnswer = () => {
//     if (!selected) {
//       socket.emit('triviaAnswer', { 
//         roomId, 
//         playerId: currentPlayer, 
//         qId: questions[currentQ].id, 
//         answer: null 
//       });
//     } else {
//       const isCorrect = selected === questions[currentQ].correctAnswer;
//       if (isCorrect) {
//         setScore(prev => prev + 5);
//       }
      
//       socket.emit('triviaAnswer', { 
//         roomId, 
//         playerId: currentPlayer, 
//         qId: questions[currentQ].id, 
//         answer: selected,
//         correct: questions[currentQ].correctAnswer,
//         isCorrect
//       });
//     }
    
//     setSelected(null);
//     nextQuestion();
//   };

//   const nextQuestion = () => {
//     if (currentQ + 1 < questions.length) {
//       setCurrentQ(currentQ + 1);
//       setTimer(5);
//       setSelected(null); 
//     } else {
//       setShowFireworks(true);
//       socket.emit('triviaComplete', { 
//         roomId, 
//         playerId: currentPlayer, 
//         score,
//         total: questions.length 
//       });
//     }
//   };

//   const handleNextQuestion = () => {
//     nextQuestion();
//   };

//   // Prepare leaderboard data from game state
//   const getLeaderboardData = () => {
//     const scores = gameState.triviaState?.scores || {};
    
//     return Object.entries(scores)
//       .map(([playerId, playerScore]) => ({
//         _id: playerId,
//         score: playerScore as number
//       }))
//       .sort((a, b) => b.score - a.score);
//   };

//   const leaderboardData = gameState.gameOver ? getLeaderboardData() : [];
//   const { username: currentUsername } = useUserData(currentPlayer);
//   const isWinner = leaderboardData.length > 0 && leaderboardData[0]._id === currentPlayer;

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center h-full">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
//         <p>Loading trivia questions...</p>
//       </div>
//     );
//   }

//   if (questions.length === 0) {
//     return (
//       <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
//         <p>No questions available. Please try again later.</p>
//       </div>
//     );
//   }

//   const currentQuestion = questions[currentQ];

//   return (
//     <div className="flex flex-col h-full">
//       <Fireworks 
//         show={showFireworks} 
//         onComplete={() => setShowFireworks(false)} 
//       />
//       {gameState.gameOver ? (
//         <div className="text-center p-6">
//           <h2 className="text-3xl font-bold mb-6">
//             {isWinner ? 'Congratulations!' : 'Game Over!'}
//           </h2>
          
//           {leaderboardData.length > 0 && (
//             <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden max-w-2xl mx-auto">
//               <table className="w-full">
//                 <thead>
//                   <tr className="bg-gray-800">
//                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                       Rank
//                     </th>
//                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                       Player
//                     </th>
//                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
//                       Score
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-700">
//                   {leaderboardData.map((player, index) => (
//                     <tr key={player._id} className={index < 3 ? 'bg-gray-800/30' : ''}>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
//                           index === 0 ? 'bg-yellow-500/20 text-yellow-300' : 
//                           index === 1 ? 'bg-gray-400/20 text-gray-300' : 
//                           index === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-gray-700/50 text-gray-400'
//                         }`}>
//                           {index + 1}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <PlayerDisplay playerId={player._id} />
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-lg font-bold">{player.score}</div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       ) : (
//         <>
//           <div className="flex-1 flex flex-col items-center justify-center p-8">
//             <div className="mb-4 text-purple-400 text-lg">
//               Question {currentQ + 1} of {questions.length}
//             </div>
//             {currentQuestion.category && (
//               <div className="text-sm text-gray-500 mb-1">
//                 Category: {currentQuestion.category}
//               </div>
//             )}
//             {currentQuestion.difficulty && (
//               <div className="text-sm text-gray-500 mb-4">
//                 Difficulty: {currentQuestion.difficulty}
//               </div>
//             )}
//             <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
//               {currentQuestion.text}
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
//               {currentQuestion.options.map((option, index) => (
//                 <button
//                   key={index}
//                   className={`p-4 rounded-lg text-left transition-colors ${
//                     selected === option 
//                       ? 'bg-purple-600 text-white border-purple-600' 
//                       : 'bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50'
//                   } ${
//                     selected && option === currentQuestion.correctAnswer 
//                       ? '!bg-green-500 !text-white !border-green-500' 
//                       : ''
//                   } ${
//                     selected && selected !== currentQuestion.correctAnswer && selected === option 
//                       ? '!bg-red-500 !text-white !border-red-500' 
//                       : ''
//                   }`}
//                   onClick={() => !selected && setSelected(option)}
//                   disabled={!!selected}
//                 >
//                   {String.fromCharCode(65 + index)}. {option}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <div className="p-4 flex justify-center">
//             <div className="w-16 h-16 rounded-full bg-purple-600/30 border-4 border-purple-500 flex items-center justify-center text-2xl font-bold">
//               {timer}
//             </div>
//           </div>
//           {selected && (
//             <div className="p-4">
//               <button
//                 className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
//                 onClick={handleNextQuestion}
//               >
//                 {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'}
//               </button>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// };

