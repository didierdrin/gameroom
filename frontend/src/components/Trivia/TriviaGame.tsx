import React, { useEffect, useState } from 'react';
import { SocketType } from '../../SocketContext';
import { Fireworks } from '../UI/Fireworks';

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

export const TriviaGame: React.FC<TriviaGameProps> = ({ 
  socket, 
  roomId, 
  currentPlayer, 
  gameState 
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    if (gameState.triviaState?.questions) {
      setQuestions(gameState.triviaState.questions);
      setLoading(false);
    }
  }, [gameState]);

  useEffect(() => {
    if (timer > 0 && !loading && questions.length > 0) {
      const timeout = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(timeout);
    } else if (timer === 0) {
      submitAnswer();
    }
  }, [timer, loading, questions]);

  const submitAnswer = () => {
    if (!selected) {
      socket.emit('triviaAnswer', { 
        roomId, 
        playerId: currentPlayer, 
        qId: questions[currentQ].id, 
        answer: null 
      });
    } else {
      const isCorrect = selected === questions[currentQ].correctAnswer;
      if (isCorrect) {
        setScore(prev => prev + 1);
      }
      
      socket.emit('triviaAnswer', { 
        roomId, 
        playerId: currentPlayer, 
        qId: questions[currentQ].id, 
        answer: selected,
        correct: questions[currentQ].correctAnswer,
        isCorrect
      });
    }
    
    setSelected(null);
    nextQuestion();
  };

  const nextQuestion = () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
      setTimer(30);
      setSelected(null); // Reset selection for next question
    } else {
      // Show fireworks when game ends (after 5 questions)
      setShowFireworks(true);
      socket.emit('triviaComplete', { 
        roomId, 
        playerId: currentPlayer, 
        score,
        total: questions.length 
      });
    }
  };

  const handleNextQuestion = () => {
    // Only move to next question, don't submit answer
    nextQuestion();
  };

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

  return (
    <div className="flex flex-col h-full">
      <Fireworks 
        show={showFireworks} 
        onComplete={() => setShowFireworks(false)} 
      />
      {gameState.gameOver ? (
        <div className="text-center p-6">
          <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
          {/* <p className="text-xl">Your score: {score}/{questions.length}</p> */}
          {/* <div className="mt-4">
            <h3 className="text-2xl">Final Scores:</h3>
            {Object.entries(gameState.triviaState?.scores || {}).map(([playerId, playerScore]) => (
              <p key={playerId}>{playerId}: {!playerScore}</p>
            ))}
          </div> */}
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="mb-4 text-purple-400 text-lg">
              Question {currentQ + 1} of {questions.length}
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
                    selected && option === currentQuestion.correctAnswer 
                      ? '!bg-green-500 !text-white !border-green-500' 
                      : ''
                  } ${
                    selected && selected !== currentQuestion.correctAnswer && selected === option 
                      ? '!bg-red-500 !text-white !border-red-500' 
                      : ''
                  }`}
                  onClick={() => !selected && setSelected(option)}
                  disabled={!!selected}
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
          {selected && (
            <div className="p-4">
              <button
                className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                onClick={handleNextQuestion}
              >
                {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};



