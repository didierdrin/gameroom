import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Question { 
    id: string; 
    question: string; 
    options: string[]; 
    correct?: string; 
  }
  
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

//   useEffect(() => {
//     async function fetchQuestions() {
//       try {
//         setLoading(true);
//         setError('');
//         const resp = await axios.post('https://alu-globe-gameroom.onrender.com/trivia/generate', {
//           topic: 'science'
//         });
        
//         if (!resp.data?.questions) {
//           throw new Error('Invalid response format');
//         }
        
//         // Add IDs to questions
//         const questionsWithIds = resp.data.questions.map((q: any, index: number) => ({
//           ...q,
//           id: `q-${index}`,
//         }));
        
//         setQuestions(questionsWithIds);
//       } catch (err) {
//         console.error('Failed to fetch questions:', err);
//         setError('Failed to load trivia questions. Please try again.');
//       } finally {
//         setLoading(false);
//       }
//     }
    
//     fetchQuestions();
//   }, []);

// Add this helper function at the top of your file
const validateQuestions = (data: any): Question[] => {
    if (!data?.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }
  
    return data.questions.map((q: any, index: number) => {
      if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Invalid question format at index ${index}`);
      }
      return {
        id: q.id || `q-${index}`,
        question: q.question,
        options: q.options,
        correct: q.correct || q.options[0] // Default to first option if correct not specified
      };
    });
  };
  
  // Then modify your useEffect hook:
  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        setError('');
        
        const resp = await axios.post('https://alu-globe-gameroom.onrender.com/trivia/generate', {
          topic: 'science'
        });
  
        // Validate and transform the response
        const validatedQuestions = validateQuestions(resp.data);
        setQuestions(validatedQuestions);
        
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        // setError(`Failed to load questions: ${err.message || 'Unknown error'}`);
        
        // Fallback questions if API fails
        setQuestions([
          {
            id: 'fallback-1',
            question: 'What is the chemical symbol for gold?',
            options: ['Go', 'Gd', 'Au', 'Ag'],
            correct: 'Au'
          },
          // Add more fallback questions...
        ]);
      } finally {
        setLoading(false);
      }
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

  if (loading) return <div className="text-center py-8">Loading Trivia Questions...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;
  if (!questions.length) return <div className="text-center py-8">No questions available</div>;
  if (!questions[currentQ]) return <div>Loading Question...</div>;

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
