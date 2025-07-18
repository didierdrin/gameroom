import React, { useEffect, useState } from 'react';
import { SocketType } from '../../SocketContext';

interface KahootGameProps {
  socket: SocketType; // Socket
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



