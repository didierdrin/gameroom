import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SocketType } from '../../SocketContext';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: string;
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
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);

  // Fallback questions in case API fails
  const fallbackQuestions: Question[] = [
    {
      id: 'fallback-1',
      question: 'What is the chemical symbol for gold?',
      options: ['Go', 'Gd', 'Au', 'Ag'],
      correct: 'Au',
      difficulty: 'easy',
      category: 'Science'
    },
    {
      id: 'fallback-2',
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correct: 'Mars',
      difficulty: 'easy',
      category: 'Science'
    }
  ];

  useEffect(() => {
    if (gameState.triviaState?.questions) {
      setQuestions(gameState.triviaState.questions);
      setLoading(false);
    } else {
      console.log('Error in the question fetching');
      //fetchQuestions(); // Fallback to API call
    }
  }, [gameState]);

  // useEffect(() => {
  //   const fetchQuestions = async () => {
  //     try {
  //       setLoading(true);
  //       setError('');
        
  //       const response = await axios.post(
  //         'https://alu-globe-gameroom.onrender.com/trivia/generate', 
  //         { topic: 'science' },
  //         { timeout: 10000 }
  //       );

  //       if (!response.data?.questions) {
  //         throw new Error('Invalid response format');
  //       }

  //       setQuestions(response.data.questions);
        
  //     } catch (err) {
  //       console.error('Failed to fetch questions:', err);
  //       setError(`Couldn't load new questions. Using fallback set.`);
  //       setQuestions(fallbackQuestions);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchQuestions();
  // }, []);

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
      // No answer selected when time runs out
      socket.emit('triviaAnswer', { 
        roomId, 
        playerId: currentPlayer, 
        qId: questions[currentQ].id, 
        answer: null 
      });
    } else {
      // Check if answer is correct
      const isCorrect = selected === questions[currentQ].correct;
      if (isCorrect) {
        setScore(prev => prev + 1);
      }
      
      socket.emit('triviaAnswer', { 
        roomId, 
        playerId: currentPlayer, 
        qId: questions[currentQ].id, 
        answer: selected,
        correct: questions[currentQ].correct,
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
    } else {
      // Game over
      socket.emit('triviaComplete', { 
        roomId, 
        playerId: currentPlayer, 
        score,
        total: questions.length 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <p>Loading trivia questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
        <p>{error}</p>
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
    <div className="flex flex-col h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-purple-600 font-medium">
          Question {currentQ + 1} of {questions.length}
        </span>
        <span className="text-gray-600">
          Time left: <span className="font-bold">{timer}s</span>
        </span>
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

      <h2 className="text-xl font-medium mb-6">{currentQuestion.question}</h2>

      <div className="grid grid-cols-1 gap-3 mb-6">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            className={`p-3 text-left rounded-lg border transition-all
              ${selected === option 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white text-black hover:bg-gray-50 border-gray-200'}
              ${selected && option === currentQuestion.correct 
                ? '!bg-green-500 !text-white !border-green-500' 
                : ''}
              ${selected && selected !== currentQuestion.correct && selected === option 
                ? '!bg-red-500 !text-white !border-red-500' 
                : ''}`}
            onClick={() => !selected && setSelected(option)}
            disabled={!!selected}
          >
            {option}
          </button>
        ))}
      </div>

      {selected && (
        <button
          className="mt-auto p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          onClick={nextQuestion}
        >
          {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'}
        </button>
      )}
    </div>
  );
};



// import React, { useEffect, useState } from 'react';
// import axios from 'axios';

// interface Question { 
//     id: string; 
//     question: string; 
//     options: string[]; 
//     correct?: string; 
//   }
  
//   interface TriviaGameProps {
//     socket: any;
//     roomId: string;
//     currentPlayer: string;
//     gameState: any;
//   }
  

// export const TriviaGame: React.FC<TriviaGameProps> = ({ socket, roomId, currentPlayer, gameState }) => {
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [currentQ, setCurrentQ] = useState<number>(0);
//   const [selected, setSelected] = useState<string | null>(null);
//   const [timer, setTimer] = useState(30);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

// //   useEffect(() => {
// //     async function fetchQuestions() {
// //       try {
// //         setLoading(true);
// //         setError('');
// //         const resp = await axios.post('https://alu-globe-gameroom.onrender.com/trivia/generate', {
// //           topic: 'science'
// //         });
        
// //         if (!resp.data?.questions) {
// //           throw new Error('Invalid response format');
// //         }
        
// //         // Add IDs to questions
// //         const questionsWithIds = resp.data.questions.map((q: any, index: number) => ({
// //           ...q,
// //           id: `q-${index}`,
// //         }));
        
// //         setQuestions(questionsWithIds);
// //       } catch (err) {
// //         console.error('Failed to fetch questions:', err);
// //         setError('Failed to load trivia questions. Please try again.');
// //       } finally {
// //         setLoading(false);
// //       }
// //     }
    
// //     fetchQuestions();
// //   }, []);

// // Add this helper function at the top of your file
// // const validateQuestions = (data: any): Question[] => {
// //     if (!data?.questions || !Array.isArray(data.questions)) {
// //       throw new Error('Invalid response format: missing questions array');
// //     }
  
// //     return data.questions.map((q: any, index: number) => {
// //       if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
// //         throw new Error(`Invalid question format at index ${index}`);
// //       }
// //       return {
// //         id: q.id || `q-${index}`,
// //         question: q.question,
// //         options: q.options,
// //         correct: q.correct || q.options[0] // Default to first option if correct not specified
// //       };
// //     });
// //   };
  
// //   // Then modify your useEffect hook:
// //   useEffect(() => {
// //     async function fetchQuestions() {
// //       try {
// //         setLoading(true);
// //         setError('');
        
// //         const resp = await axios.post('https://alu-globe-gameroom.onrender.com/trivia/generate', {
// //           topic: 'science'
// //         });
  
// //         // Validate and transform the response
// //         const validatedQuestions = validateQuestions(resp.data);
// //         setQuestions(validatedQuestions);
        
// //       } catch (err) {
// //         console.error('Failed to fetch questions:', err);
// //         // setError(`Failed to load questions: ${err.message || 'Unknown error'}`);
        
// //         // Fallback questions if API fails
// //         setQuestions([
// //           {
// //             id: 'fallback-1',
// //             question: 'What is the chemical symbol for gold?',
// //             options: ['Go', 'Gd', 'Au', 'Ag'],
// //             correct: 'Au'
// //           },
// //           // Add more fallback questions...
// //         ]);
// //       } finally {
// //         setLoading(false);
// //       }
// //     }
    
// //     fetchQuestions();
// //   }, []);

// useEffect(() => {
//     async function fetchQuestions() {
//       try {
//         setLoading(true);
//         setError('');
        
//         const resp = await axios.post('https://alu-globe-gameroom.onrender.com/trivia/generate', {
//           topic: 'science'
//         }, {
//           timeout: 15000 // 15 second timeout
//         });
  
//         console.log('Full API response:', resp); // Debug log
  
//         if (!resp.data?.questions) {
//           throw new Error('API returned invalid format - missing questions array');
//         }
  
//         setQuestions(resp.data.questions);
        
//       } catch (err) {
//         console.error('Full error details:', {
//           error: err,
//         });
  
//         // Provide user-friendly error message
//         let errorMsg = 'Failed to load questions. ';
        
       
//         setError(errorMsg);
        
//         // Fallback questions
//         setQuestions([
//           {
//             id: 'fallback-1',
//             question: 'What is the chemical symbol for gold?',
//             options: ['Go', 'Gd', 'Au', 'Ag'],
//             correct: 'Au'
//           },
//           {
//             id: 'fallback-2',
//             question: 'Which planet is known as the Red Planet?',
//             options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
//             correct: 'Mars'
//           }
//         ]);
//       } finally {
//         setLoading(false);
//       }
//     }
    
//     fetchQuestions();
//   }, []);

//   useEffect(() => {
//     if (timer > 0) {
//       const t = setTimeout(() => setTimer(timer - 1), 1000);
//       return () => clearTimeout(t);
//     } else {
//       submitAnswer();
//     }
//   }, [timer]);

//   const submitAnswer = () => {
//     const answer = selected;
//     socket.emit('triviaAnswer', { roomId, playerId: currentPlayer, qId: questions[currentQ].id, answer });
//     setSelected(null);
//     nextQuestion();
//   };

//   const nextQuestion = () => {
//     if (currentQ + 1 < questions.length) {
//       setCurrentQ(currentQ + 1);
//       setTimer(30);
//     } else {
//       socket.emit('triviaComplete', { roomId });
//     }
//   };

//   if (loading) return <div className="text-center py-8">Loading Trivia Questions...</div>;
//   if (error) return <div className="text-center py-8 text-red-500">{error}</div>;
//   if (!questions.length) return <div className="text-center py-8">No questions available</div>;
//   if (!questions[currentQ]) return <div>Loading Question...</div>;

//   const q = questions[currentQ];

//   return (
//     <div className="flex flex-col h-full">
//       <div className="text-center my-4 text-purple-400">Question {currentQ + 1} of {questions.length}</div>
//       <h2 className="text-2xl text-center">{q.question}</h2>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
//         {q.options.map((opt) => (
//           <button
//             key={opt}
//             className={`p-4 border rounded-lg ${selected === opt ? 'bg-purple-500 text-white' : 'bg-white text-black'}`}
//             disabled={!!selected}
//             onClick={() => setSelected(opt)}
//           >
//             {opt}
//           </button>
//         ))}
//       </div>
//       <div className="text-center text-gray-500">Time left: {timer}s</div>
//     </div>
//   );
// };
