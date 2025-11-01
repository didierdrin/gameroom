// /components/TriviaGame.tsx - FIXED VERSION
import React, { useEffect, useState, useRef } from 'react';
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
  
  const isProcessingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [localScore, setLocalScore] = useState(0);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);

  // CRITICAL FIX: Store the timer value when answer is submitted
  const answerTimeRef = useRef(10);

  useEffect(() => {
    const backendScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
    setLocalScore(backendScore);
  }, [gameState.triviaState?.scores?.[currentPlayer]]);

  useEffect(() => {
    if (gameState.triviaState?.questions) {
      const questionsFromBackend = gameState.triviaState.questions;
      setQuestions(questionsFromBackend);
      setLoading(false);
      
      console.log('Questions loaded from backend (pre-shuffled):', {
        count: questionsFromBackend.length,
        firstQuestion: questionsFromBackend[0]?.text.substring(0, 50) + '...'
      });
    }
  }, [gameState.triviaState?.questions]);

  // Timer effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (timer > 0 && !loading && questions.length > 0 && !hasAnswered && !isProcessingRef.current) {
      timeoutRef.current = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0 && !hasAnswered && !isProcessingRef.current) {
      console.log('⏰ Timer expired - auto-submitting answer');
      submitAnswer();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [timer, loading, questions, hasAnswered]);

  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      console.log('Resetting trivia game state for new round', {
        questionsCount: gameState.triviaState?.questions?.length,
        currentQuestionIndex: gameState.triviaState?.currentQuestionIndex
      });
      
      setCurrentQ(0);
      setSelected(null);
      setTimer(10);
      setHasAnswered(false);
      setShowAnswerResult(false);
      setShowFireworks(false);
      isProcessingRef.current = false;
      answerTimeRef.current = 10;
      
      if (gameState.triviaState?.questions) {
        const questionsFromBackend = gameState.triviaState.questions;
        setQuestions(questionsFromBackend);
        console.log('New questions loaded for restarted game:', questionsFromBackend.length);
      }
    }
  }, [gameState.gameStarted, gameState.gameOver]);

  // FIXED: Submit answer with proper time tracking
  const submitAnswer = () => {
    if (isProcessingRef.current || hasAnswered) {
      console.log('⚠️ Already processing answer, skipping submission');
      return;
    }
    
    isProcessingRef.current = true;
    setHasAnswered(true);
    setShowAnswerResult(true);
    
    // CRITICAL FIX: Capture the timer value BEFORE it changes
    const timeWhenAnswered = timer > 0 ? timer : 0;
    answerTimeRef.current = timeWhenAnswered;
    
    const currentQuestion = questions[currentQ];
    const isCorrect = selected === currentQuestion.correctAnswer;
    
    const totalTime = 10;
    const timePercentage = timeWhenAnswered / totalTime;
    
    // CRITICAL FIX: Ensure minimum 1 point for correct answers, even at time=0
    let pointsEarned = 0;
    if (isCorrect) {
      if (timeWhenAnswered > 0) {
        // Normal time-based scoring (1-5 points based on speed)
        pointsEarned = Math.max(1, Math.round(5 * timePercentage * 100) / 100);
      } else {
        // Answered at last second - give 1 point
        pointsEarned = 1;
      }
    }
    
    // Store for display
    setLastPointsEarned(pointsEarned);
    
    // Update local score immediately
    const currentScore = localScore;
    const newScore = currentScore + pointsEarned;
    if (isCorrect) {
      setLocalScore(newScore);
    }
    
    console.log('🎯 SUBMITTING ANSWER WITH CORRECT TIME:', {
      question: currentQ + 1,
      selected,
      correct: currentQuestion.correctAnswer,
      isCorrect,
      timeWhenAnswered,
      timePercentage: Math.round(timePercentage * 100) + '%',
      pointsEarned,
      newScoreLocal: newScore
    });
    
    socket.emit('triviaAnswer', { 
      roomId, 
      playerId: currentPlayer, 
      qId: currentQuestion.id, 
      answer: selected,
      correct: currentQuestion.correctAnswer,
      isCorrect,
      pointsEarned,
      timeRemaining: timeWhenAnswered
    });
  
    setTimeout(() => {
      setShowAnswerResult(false);
      
      if (currentQ + 1 >= questions.length) {
        // Use the accumulated local score for final submission
        socket.emit('triviaComplete', { 
          roomId, 
          playerId: currentPlayer, 
          score: newScore, // Use the updated score
          total: questions.length 
        });
        setShowFireworks(true);
        isProcessingRef.current = false;
      } else {
        nextQuestion();
      }
    }, 2000);
  };

  const nextQuestion = () => {
    if (currentQ + 1 < questions.length) {
      console.log(`➡️ Moving from question ${currentQ + 1} to ${currentQ + 2}`);
      
      const nextQuestionIndex = currentQ + 1;
      setCurrentQ(nextQuestionIndex);
      setTimer(10);
      setSelected(null);
      setHasAnswered(false);
      setShowAnswerResult(false);
      isProcessingRef.current = false;
      answerTimeRef.current = 10;
      
      console.log(`✅ Now on question ${nextQuestionIndex + 1}/${questions.length}`);
    } else {
      console.log('⚠️ No more questions to move to');
      isProcessingRef.current = false;
    }
  };

  useEffect(() => {
    console.log('🎯 SCORE UPDATED:', {
      player: currentPlayer,
      currentScore: gameState.triviaState?.scores?.[currentPlayer] || 0,
      allScores: gameState.triviaState?.scores
    });
  }, [gameState.triviaState?.scores?.[currentPlayer]]);

  const getLeaderboardData = () => {
    const scores = gameState.triviaState?.scores || {};
    
    console.log('🏆 BUILDING LEADERBOARD:', {
      scores: scores,
      players: gameState.players,
      gameOver: gameState.gameOver
    });
    
    if (Object.keys(scores).length === 0) {
      return gameState.players.map((player: any) => ({
        _id: player.id,
        score: player.score || 0,
        name: player.name || player.id,
        correctAnswers: 0
      })).sort((a:any, b:any) => b.score - a.score);
    }
    
    const leaderboard = Object.entries(scores)
      .map(([playerId, playerScore]) => {
        const playerInfo = gameState.players.find((p: any) => p.id === playerId);
        // Estimate correct answers (assuming average 2.5 points per correct answer)
        const correctAnswers = Math.floor((playerScore as number) / 2.5);
        
        return {
          _id: playerId,
          score: playerScore as number,
          name: playerInfo?.name || playerId,
          correctAnswers: correctAnswers
        };
      })
      .sort((a, b) => b.score - a.score);

    console.log('🏆 FINAL LEADERBOARD:', leaderboard);
    return leaderboard;
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
  const currentPlayerScore = localScore;
  const isCorrect = selected === currentQuestion.correctAnswer;

  console.log('Current game state:', {
    currentQuestionIndex: currentQ,
    totalQuestions: questions.length,
    gameOver: gameState.gameOver,
    hasAnswered,
    timer
  });

  return (
    <div className="flex flex-col h-full">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      {gameState.gameOver ? (
        <div className="text-center p-6">
          <h2 className="text-3xl font-bold mb-6">
            {isWinner ? 'Congratulations! 🎉' : 'Game Over!'}
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
                  {leaderboardData.map((player:any, index:any) => (
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
                        {/* <div className="text-sm text-gray-400">
                          ~{player.correctAnswers} correct answers
                        </div> */}
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
                {isCorrect ? (
                  <>
                    <div>✓ Correct!</div>
                    <div className="text-lg mt-1">
                      +{lastPointsEarned} points
                    </div>
                    <div className="text-sm text-green-300 mt-1">
                      {answerTimeRef.current > 0 
                        ? `(Answered in ${10 - answerTimeRef.current}s - ${Math.round((answerTimeRef.current / 10) * 100)}% time bonus)`
                        : '(Answered at buzzer - 1 point)'
                      }
                    </div>
                  </>
                ) : (
                  <>
                    <div>✗ Incorrect!</div>
                    <div className="text-sm mt-2">
                      Correct answer: {currentQuestion.correctAnswer}
                    </div>
                  </>
                )}
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

//   // Load questions from gameState WITHOUT any shuffling
//   useEffect(() => {
//     if (gameState.triviaState?.questions) {
//       const questionsFromBackend = gameState.triviaState.questions;
      
//       // CRITICAL: Do NOT shuffle - backend already did this
//       setQuestions(questionsFromBackend);
//       setLoading(false);
      
//       console.log('Questions loaded from backend (pre-shuffled):', {
//         count: questionsFromBackend.length,
//         firstQuestion: questionsFromBackend[0]?.text.substring(0, 50) + '...'
//       });
//     }
//   }, [gameState.triviaState?.questions]);

//   useEffect(() => {
//     if (timer > 0 && !loading && questions.length > 0 && !hasAnswered) {
//       const timeout = setTimeout(() => setTimer(timer - 1), 1000);
//       return () => clearTimeout(timeout);
//     } else if (timer === 0 && !hasAnswered) {
//       submitAnswer();
//     }
//   }, [timer, loading, questions, hasAnswered]);

//   useEffect(() => {
//     // Reset game state when gameState indicates a restart
//     if (gameState.gameStarted && !gameState.gameOver) {
//       console.log('Resetting trivia game state for new round', {
//         questionsCount: gameState.triviaState?.questions?.length,
//         currentQuestionIndex: gameState.triviaState?.currentQuestionIndex
//       });
      
//       setCurrentQ(0);
//       setSelected(null);
//       setTimer(10);
//       setHasAnswered(false);
//       setShowAnswerResult(false);
//       setShowFireworks(false);
      
//       // If we have new questions, load them WITHOUT shuffling
//       if (gameState.triviaState?.questions) {
//         const questionsFromBackend = gameState.triviaState.questions;
//         setQuestions(questionsFromBackend);
//         console.log('New questions loaded for restarted game:', questionsFromBackend.length);
//       }
//     }
//   }, [gameState.gameStarted, gameState.gameOver, gameState.triviaState?.questions]);

//   const submitAnswer = () => {
//     if (hasAnswered) return;
    
//     setHasAnswered(true);
//     setShowAnswerResult(true);
    
//     const currentQuestion = questions[currentQ];
//     const isCorrect = selected === currentQuestion.correctAnswer;
    
//     // Calculate time-based score
//     const totalTime = 10;
//     const timeRemaining = timer;
//     const timePercentage = timeRemaining / totalTime;
//     const pointsEarned = isCorrect ? Math.round(5 * timePercentage * 100) / 100 : 0;
    
//     const scoreBefore = gameState.triviaState?.scores?.[currentPlayer] || 0;
    
//     console.log('🎯 SUBMITTING ANSWER WITH TIME-BASED SCORING:', {
//       question: currentQ + 1,
//       totalQuestions: questions.length,
//       questionId: currentQuestion.id,
//       selected,
//       correct: currentQuestion.correctAnswer,
//       isCorrect,
//       timeRemaining,
//       timePercentage: (timePercentage * 100).toFixed(1) + '%',
//       pointsEarned,
//       scoreBefore: scoreBefore,
//       expectedNewScore: scoreBefore + pointsEarned
//     });
    
//     socket.emit('triviaAnswer', { 
//       roomId, 
//       playerId: currentPlayer, 
//       qId: currentQuestion.id, 
//       answer: selected,
//       correct: currentQuestion.correctAnswer,
//       isCorrect,
//       pointsEarned,
//       timeRemaining
//     });

//     setTimeout(() => {
//       setShowAnswerResult(false);
      
//       if (currentQ + 1 >= questions.length) {
//         console.log('🎯 LAST QUESTION ANSWERED - COMPLETING GAME');
        
//         const finalScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
        
//         console.log('🎯 SENDING COMPLETION:', {
//           playerId: currentPlayer,
//           finalScore: finalScore,
//           totalQuestions: questions.length
//         });
        
//         socket.emit('triviaComplete', { 
//           roomId, 
//           playerId: currentPlayer, 
//           score: finalScore,
//           total: questions.length 
//         });
        
//         setShowFireworks(true);
//       } else {
//         console.log(`🎯 MOVING TO QUESTION ${currentQ + 2} of ${questions.length}`);
//         nextQuestion();
//       }
//     }, 2000);
//   };

//   useEffect(() => {
//     console.log('🎯 SCORE UPDATED:', {
//       player: currentPlayer,
//       currentScore: gameState.triviaState?.scores?.[currentPlayer] || 0,
//       allScores: gameState.triviaState?.scores
//     });
//   }, [gameState.triviaState?.scores?.[currentPlayer]]);

//   const getLeaderboardData = () => {
//     const scores = gameState.triviaState?.scores || {};
    
//     console.log('🏆 BUILDING LEADERBOARD:', {
//       scores: scores,
//       players: gameState.players,
//       gameOver: gameState.gameOver
//     });
    
//     if (Object.keys(scores).length === 0) {
//       return gameState.players.map((player: any) => ({
//         _id: player.id,
//         score: player.score || 0,
//         name: player.name || player.id
//       })).sort((a:any, b:any) => b.score - a.score);
//     }
    
//     const leaderboard = Object.entries(scores)
//       .map(([playerId, playerScore]) => {
//         const playerInfo = gameState.players.find((p: any) => p.id === playerId);
//         const correctAnswers = Math.floor((playerScore as number) / 5);
        
//         console.log(`🏆 PLAYER SCORE: ${playerId} = ${playerScore} (${correctAnswers} correct)`);
        
//         return {
//           _id: playerId,
//           score: playerScore as number,
//           name: playerInfo?.name || playerId,
//           correctAnswers: correctAnswers
//         };
//       })
//       .sort((a, b) => b.score - a.score);

//     console.log('🏆 FINAL LEADERBOARD:', leaderboard);
//     return leaderboard;
//   };

//   const nextQuestion = () => {
//     if (currentQ + 1 < questions.length) {
//       setCurrentQ(currentQ + 1);
//       setTimer(10);
//       setSelected(null);
//       setHasAnswered(false);
//       setShowAnswerResult(false);
//     }
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

//   console.log('Current game state:', {
//     gameOver: gameState.gameOver,
//     scores: gameState.triviaState?.scores,
//     completedPlayers: gameState.triviaState?.completedPlayers,
//     totalPlayers: gameState.players.length
//   });

//   return (
//     <div className="flex flex-col h-full">
//       <Fireworks 
//         show={showFireworks} 
//         onComplete={() => setShowFireworks(false)} 
//       />
//       {gameState.gameOver ? (
//         <div className="text-center p-6">
//           <h2 className="text-3xl font-bold mb-6">
//             {isWinner ? 'Congratulations! 🎉' : 'Game Over!'}
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
//                   {leaderboardData.map((player:any, index:any) => (
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
//                         <div className="text-lg font-bold">{player.score} points</div>
//                         <div className="text-sm text-gray-400">
//                           {Math.floor(player.score / 5)} correct answers
//                         </div>
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

//             {showAnswerResult && (
//               <div className={`p-4 mb-4 rounded-lg text-center text-xl font-bold ${
//                 isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
//               }`}>
//                 {isCorrect ? (
//                   <>
//                     <div>✓ Correct!</div>
//                     <div className="text-lg mt-1">
//                       +{Math.round(5 * (timer / 10) * 100) / 100} points
//                     </div>
//                     <div className="text-sm text-green-300 mt-1">
//                       (Answered in {10 - timer}s - {Math.round(((timer) / 10) * 100)}% time remaining)
//                     </div>
//                   </>
//                 ) : (
//                   '✗ Incorrect!'
//                 )}
//                 <div className="text-sm mt-2 font-normal">
//                   {currentQ + 1 < questions.length ? 'Moving to next question...' : 'Waiting for other players...'}
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
//         </>
//       )}
//     </div>
//   );
// };

