import React, { useEffect, useState } from 'react';
import { SocketType } from '../../SocketContext';

interface KahootGameProps {
  socket: SocketType;
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
        setAnswered(gameState.kahootState.answers[currentPlayer] !== undefined && 
                   gameState.kahootState.answers[currentPlayer] !== null);
      }
    }

    const handleGameState = (newGameState: any) => {
      if (newGameState.kahootState) {
        const { currentQuestionIndex, questions, scores, questionTimer, answers } = newGameState.kahootState;
        if (questions && questions[currentQuestionIndex]) {
          setCurrentQuestion(questions[currentQuestionIndex]);
          setTimer(questionTimer);
          setScores(scores);
          setAnswered(answers[currentPlayer] !== undefined && answers[currentPlayer] !== null);
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

  const getOptionSymbol = (index: number) => {
    switch(index) {
      case 0: return '▲';
      case 1: return '■';
      case 2: return '●';
      case 3: return '✦';
      default: return '';
    }
  };

  const getOptionColor = (index: number) => {
    switch(index) {
      case 0: return 'red';
      case 1: return 'blue';
      case 2: return 'yellow';
      case 3: return 'green';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {gameState.gameOver ? (
        <div className="text-center p-6">
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
        <>
          <div className="bg-purple-900 p-6 text-center">
            <h2 className="text-2xl font-bold">{currentQuestion.text}</h2>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {currentQuestion.options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={answered}
                className={`bg-${getOptionColor(index)}-600 hover:bg-${getOptionColor(index)}-700 transition-colors p-6 rounded-lg flex items-center ${
                  answered
                    ? index === currentQuestion.correctAnswer
                      ? 'bg-green-600'
                      : selectedAnswer === index
                      ? 'bg-red-600'
                      : `bg-${getOptionColor(index)}-600 opacity-50`
                    : `bg-${getOptionColor(index)}-600`
                }`}
              >
                <div className={`w-8 h-8 rounded-md bg-${getOptionColor(index)}-800 mr-3 flex items-center justify-center`}>
                  {getOptionSymbol(index)}
                </div>
                <span className="text-xl">{option}</span>
              </button>
            ))}
          </div>
          <div className="p-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
              {timer}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p>Loading question...</p>
        </div>
      )}
    </div>
  );
};

export default KahootGame;
