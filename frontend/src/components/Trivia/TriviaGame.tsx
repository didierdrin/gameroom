// /components/TriviaGame.tsx 
import React, { useEffect, useState } from 'react';
import { SocketType } from '../../SocketContext';
import { Fireworks } from '../UI/Fireworks';
import { useUserData } from '../../hooks/useUserData';
import { shuffleArray } from '../../utils/arrayUtils';

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

  useEffect(() => {
    if (gameState.triviaState?.questions) {
      const questions = gameState.triviaState.questions;
      
      // Shuffle the questions array to randomize order
      const shuffledQuestions = shuffleArray(questions).map(question => ({
        ...question as any,
        // Also shuffle the options for each question
        options: shuffleArray([...(question as any).options])
      }));
      
      setQuestions(shuffledQuestions);
      setLoading(false);
      
      console.log('Questions loaded and shuffled:', {
        originalCount: questions.length,
        shuffledCount: shuffledQuestions.length,
        firstQuestion: shuffledQuestions[0]?.text.substring(0, 50) + '...'
      });
    }
  }, [gameState]);
  

  useEffect(() => {
    if (timer > 0 && !loading && questions.length > 0 && !hasAnswered) {
      const timeout = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(timeout);
    } else if (timer === 0 && !hasAnswered) {
      submitAnswer();
    }
  }, [timer, loading, questions, hasAnswered]);



  useEffect(() => {
    // Reset game state when gameState indicates a restart
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
      
      // If we have new questions, update the local questions state
      if (gameState.triviaState?.questions) {
        const questions = gameState.triviaState.questions;
        const shuffledQuestions = shuffleArray(questions).map(question => ({
          ...question as any,
          options: shuffleArray([...(question as any).options])
        }));
        
        setQuestions(shuffledQuestions);
        console.log('New questions loaded for restarted game:', shuffledQuestions.length);
      }
    }
  }, [gameState.gameStarted, gameState.gameOver, gameState.triviaState?.questions]);


// Update the submitAnswer function to calculate time-based scoring
const submitAnswer = () => {
  if (hasAnswered) return;
  
  setHasAnswered(true);
  setShowAnswerResult(true);
  
  const currentQuestion = questions[currentQ];
  const isCorrect = selected === currentQuestion.correctAnswer;
  
  // Calculate time-based score (5 points * percentage of time remaining)
  const totalTime = 10; // Full timer duration
  const timeUsed = totalTime - timer; // Time used to answer
  const timeRemaining = timer; // Time remaining when answered
  const timePercentage = timeRemaining / totalTime; // Percentage of time remaining
  
  // Calculate score: 5 points * percentage of time remaining
  const pointsEarned = isCorrect ? Math.round(5 * timePercentage * 100) / 100 : 0;
  
  // Get current score BEFORE submission for debugging
  const scoreBefore = gameState.triviaState?.scores?.[currentPlayer] || 0;
  
  console.log('🎯 SUBMITTING ANSWER WITH TIME-BASED SCORING:', {
    question: currentQ + 1,
    totalQuestions: questions.length,
    questionId: currentQuestion.id,
    selected,
    correct: currentQuestion.correctAnswer,
    isCorrect,
    timeUsed,
    timeRemaining,
    timePercentage: (timePercentage * 100).toFixed(1) + '%',
    pointsEarned,
    scoreBefore: scoreBefore,
    expectedNewScore: scoreBefore + pointsEarned
  });
  
  socket.emit('triviaAnswer', { 
    roomId, 
    playerId: currentPlayer, 
    qId: currentQuestion.id, 
    answer: selected,
    correct: currentQuestion.correctAnswer,
    isCorrect,
    pointsEarned, // Send the calculated points to backend
    timeRemaining // Send time data for verification
  });

  // Wait for server response before moving to next question
  setTimeout(() => {
    setShowAnswerResult(false);
    
    // Check if this was the last question
    if (currentQ + 1 >= questions.length) {
      // Last question - wait for all players to finish
      console.log('🎯 LAST QUESTION ANSWERED - COMPLETING GAME');
      
      // Get final score from gameState after server updates
      const finalScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
      
      console.log('🎯 SENDING COMPLETION:', {
        playerId: currentPlayer,
        finalScore: finalScore,
        totalQuestions: questions.length
      });
      
      // Notify server this player completed
      socket.emit('triviaComplete', { 
        roomId, 
        playerId: currentPlayer, 
        score: finalScore,
        total: questions.length 
      });
      
      // Show fireworks while waiting
      setShowFireworks(true);
    } else {
      // Not last question - move to next
      console.log(`🎯 MOVING TO QUESTION ${currentQ + 2} of ${questions.length}`);
      nextQuestion();
    }
  }, 2000);
};

// Add a useEffect to monitor score changes
useEffect(() => {
  console.log('🎯 SCORE UPDATED:', {
    player: currentPlayer,
    currentScore: gameState.triviaState?.scores?.[currentPlayer] || 0,
    allScores: gameState.triviaState?.scores
  });
}, [gameState.triviaState?.scores?.[currentPlayer]]);

// Update the leaderboard display to show more detailed information
const getLeaderboardData = () => {
  const scores = gameState.triviaState?.scores || {};
  
  console.log('🏆 BUILDING LEADERBOARD:', {
    scores: scores,
    players: gameState.players,
    gameOver: gameState.gameOver
  });
  
  // If no scores, create default scores from players
  if (Object.keys(scores).length === 0) {
    return gameState.players.map((player: any) => ({
      _id: player.id,
      score: player.score || 0,
      name: player.name || player.id
    })).sort((a:any, b:any) => b.score - a.score);
  }
  
  const leaderboard = Object.entries(scores)
    .map(([playerId, playerScore]) => {
      const playerInfo = gameState.players.find((p: any) => p.id === playerId);
      const correctAnswers = Math.floor((playerScore as number) / 5);
      
      console.log(`🏆 PLAYER SCORE: ${playerId} = ${playerScore} (${correctAnswers} correct)`);
      
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
  

  const nextQuestion = () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
      setTimer(10);
      setSelected(null);
      setHasAnswered(false);
      setShowAnswerResult(false);
    }
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


console.log('Current game state:', {
  gameOver: gameState.gameOver,
  scores: gameState.triviaState?.scores,
  completedPlayers: gameState.triviaState?.completedPlayers,
  totalPlayers: gameState.players.length
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
    {isCorrect ? (
      <>
        <div>✓ Correct!</div>
        <div className="text-lg mt-1">
          +{Math.round(5 * ((10 - timer) / 10) * 100) / 100} points
        </div>
        <div className="text-sm text-green-300 mt-1">
          (Answered in {10 - timer}s - {Math.round(((10 - timer) / 10) * 100)}% of time)
        </div>
      </>
    ) : (
      '✗ Incorrect!'
    )}
    <div className="text-sm mt-2 font-normal">
      {currentQ + 1 < questions.length ? 'Moving to next question...' : 'Waiting for other players...'}
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






