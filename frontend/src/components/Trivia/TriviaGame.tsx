import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Define Trivia structures
interface Question { id: string; question: string; options: string[]; correct?: string; }

interface TriviaGameProps {
  socket: any;
  roomId: string;
  currentPlayer: string;
  gameState: any;
}

export const TriviaGame: React.FC<TriviaGameProps> = ({ socket, roomId, currentPlayer, gameState }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState<number>(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    async function fetchQuestions() {
      const resp = await axios.post(
        'https://gemini.googleapis.com/v1/generateTrivia',
        { count: 10 },
        { headers: { Authorization: `Bearer AIzaSyA8usl5r7fzAA3RQ92oWF9lJMBDEDcnzCc` } }
      );
      setQuestions(resp.data.questions);
    }
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else {
      submitAnswer();
    }
  }, [timer]);

  const submitAnswer = () => {
    const answer = selected;
    socket.emit('triviaAnswer', { roomId, playerId: currentPlayer, qId: questions[currentQ].id, answer });
    setSelected(null);
    nextQuestion();
  };

  const nextQuestion = () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
      setTimer(30);
    } else {
      socket.emit('triviaComplete', { roomId });
    }
  };

  if (!questions[currentQ]) return <div>Loading Trivia...</div>;
  const q = questions[currentQ];

  return (
    <div className="flex flex-col h-full">
      <div className="text-center my-4 text-purple-400">Question {currentQ + 1} of {questions.length}</div>
      <h2 className="text-2xl text-center">{q.question}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {q.options.map((opt) => (
          <button
            key={opt}
            className={`p-4 border rounded-lg ${selected === opt ? 'bg-purple-500 text-white' : 'bg-white'}`}
            disabled={!!selected}
            onClick={() => setSelected(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="text-center text-gray-500">Time left: {timer}s</div>
    </div>
  );
};
