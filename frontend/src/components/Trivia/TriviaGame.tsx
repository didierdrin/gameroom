// /components/TriviaGame.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SocketType } from '../../SocketContext';
import { Fireworks } from '../UI/Fireworks';
import { useUserData } from '../../hooks/useUserData';
import { useTheme } from '../../context/ThemeContext';
import { Check, X, Trophy, RotateCcw } from 'lucide-react';

interface ClientTriviaQuestion {
  id: string;
  text: string;
  options: string[];
  difficulty?: string;
  category?: string;
}

interface TriviaQuestionEvent {
  roomId: string;
  questionIndex: number;
  totalQuestions: number;
  question: ClientTriviaQuestion;
  endsAt: number;
  limitSec: number;
}

interface TriviaGameProps {
  socket: SocketType;
  roomId: string;
  currentPlayer: string;
  gameState: any;
  onPlayAgain?: () => void;
  onReturnHome?: () => void;
}

const INCORRECT_PENALTY = 0;

const OPTION_COLORS = [
  { bg: 'bg-emerald-500', border: 'border-emerald-500', letter: 'text-emerald-600' },
  { bg: 'bg-orange-500', border: 'border-orange-500', letter: 'text-orange-600' },
  { bg: 'bg-blue-500', border: 'border-blue-500', letter: 'text-blue-600' },
  { bg: 'bg-rose-500', border: 'border-rose-500', letter: 'text-rose-600' },
];

const PlayerDisplay: React.FC<{ playerId: string; showScore?: boolean; score?: number; compact?: boolean }> = ({
  playerId,
  showScore,
  score,
  compact,
}) => {
  const { username, avatar } = useUserData(playerId);

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : ''}`}>
      <img
        src={avatar}
        alt={username}
        className={`rounded-full border flex-shrink-0 ${
          compact ? 'w-8 h-8 border-gray-500' : 'w-10 h-10 border-gray-600'
        }`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
        }}
      />
      <div className={compact ? 'min-w-0' : 'ml-3'}>
        <div className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>{username || playerId}</div>
        {showScore && score !== undefined && (
          <div className="text-sm opacity-90">{score.toLocaleString()} pts</div>
        )}
      </div>
    </div>
  );
};

const LeaderboardRow: React.FC<{
  player: { _id: string; score: number; name: string };
  index: number;
  isCurrentUser: boolean;
  isLight: boolean;
  cardBorder: string;
  textPrimary: string;
}> = ({ player, index, isCurrentUser, isLight, cardBorder, textPrimary }) => {
  useUserData(player._id);
  const rowBg =
    index === 0 ? (isLight ? 'bg-emerald-50' : 'bg-emerald-900/30') :
    index === 1 ? (isLight ? 'bg-amber-50' : 'bg-amber-900/20') :
    index === 2 ? (isLight ? 'bg-rose-50' : 'bg-rose-900/20') :
    isCurrentUser ? (isLight ? 'bg-sky-50' : 'bg-sky-900/20') :
    isLight ? 'bg-gray-50' : 'bg-gray-700/30';
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${rowBg} ${cardBorder} border`}>
      <div className="flex items-center gap-3">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
          index === 0 ? 'bg-emerald-500 text-white' :
          index === 1 ? 'bg-amber-500 text-white' :
          index === 2 ? 'bg-rose-500 text-white' :
          isLight ? 'bg-gray-200 text-gray-700' : 'bg-gray-600 text-gray-200'
        }`}>
          {index + 1}
        </span>
        <PlayerDisplay playerId={player._id} compact />
        {isCurrentUser && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-400/80 text-gray-900">YOU</span>
        )}
        {index === 0 && <span className={`text-xs font-semibold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>WINNER</span>}
      </div>
      <span className={`font-bold ${textPrimary}`}>{player.score.toLocaleString()}</span>
    </div>
  );
};

const LiveStandingRow: React.FC<{
  player: { _id: string; score: number; name: string };
  isCurrentUser: boolean;
  isLight: boolean;
  textPrimary: string;
}> = ({ player, isCurrentUser, isLight, textPrimary }) => {
  const { username, avatar } = useUserData(player._id);
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${isLight ? 'bg-gray-50' : 'bg-gray-700/30'}`}>
      <div className="flex items-center gap-2">
        <img
          src={avatar}
          alt=""
          className="w-8 h-8 rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player._id}`;
          }}
        />
        <span className={`font-medium truncate ${textPrimary}`}>{username || player.name}</span>
        {isCurrentUser && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-400/80 text-gray-900">YOU</span>
        )}
      </div>
      <span className={`font-bold ${textPrimary}`}>{player.score.toLocaleString()} pts</span>
    </div>
  );
};

const WinnerBlock: React.FC<{ playerId: string; score: number; name: string; textPrimary: string; textSecondary: string }> = ({
  playerId,
  score,
  name,
  textPrimary,
  textSecondary,
}) => {
  const { username, avatar } = useUserData(playerId);
  return (
    <>
      <div className="relative">
        <img
          src={avatar}
          alt="Winner"
          className="w-20 h-20 rounded-full border-4 border-emerald-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`;
          }}
        />
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded">
          WINNER
        </span>
      </div>
      <p className={`font-bold mt-2 ${textPrimary}`}>{username || name}</p>
      <p className={`text-sm ${textSecondary}`}>Score: {score.toLocaleString()} pts</p>
    </>
  );
};

type TriviaPhase = 'question' | 'answer_feedback' | 'question_results';

export const TriviaGame: React.FC<TriviaGameProps> = ({
  socket,
  roomId,
  currentPlayer,
  gameState,
  onPlayAgain,
  onReturnHome,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeQuestion, setActiveQuestion] = useState<ClientTriviaQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [timer, setTimer] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [playersAnswered, setPlayersAnswered] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [phase, setPhase] = useState<TriviaPhase>('question');
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(0);

  const isProcessingRef = useRef(false);
  const [localScore, setLocalScore] = useState(0);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [feedbackCorrect, setFeedbackCorrect] = useState<string | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const backendScore = gameState.triviaState?.scores?.[currentPlayer] || 0;
    setLocalScore(backendScore);
  }, [gameState.triviaState?.scores, currentPlayer]);

  useEffect(() => {
    if (gameState.gameOver) {
      setShowFireworks(true);
    }
  }, [gameState.gameOver]);

  useEffect(() => {
    if (gameState.triviaState?.answers) {
      const answeredCount = Object.values(gameState.triviaState.answers).filter(
        (a: any) => typeof a?.isCorrect === 'boolean',
      ).length;
      setPlayersAnswered(answeredCount);
      setTotalPlayers(gameState.players?.length || 0);
    }
  }, [gameState.triviaState?.answers, gameState.players]);

  const applyTriviaQuestionPayload = useCallback((payload: TriviaQuestionEvent) => {
    setActiveQuestion(payload.question);
    setQuestionIndex(payload.questionIndex);
    setTotalQuestions(payload.totalQuestions);
    setEndsAt(payload.endsAt);
    setHasAnswered(false);
    setSelected(null);
    setWaitingForOthers(false);
    setPhase('question');
    setNextQuestionCountdown(0);
    setFeedbackCorrect(null);
    isProcessingRef.current = false;
    const sec = Math.max(0, Math.ceil((payload.endsAt - Date.now()) / 1000));
    setTimer(sec > 0 ? sec : payload.limitSec);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onTriviaQuestion = (payload: TriviaQuestionEvent) => {
      if (payload.roomId !== roomId) return;
      applyTriviaQuestionPayload(payload);
    };

    const onTriviaAnswer = (result: any) => {
      if (result.playerId !== currentPlayer) return;
      setLastPointsEarned(result.pointsEarned ?? 0);
      setLastAnswerCorrect(!!result.isCorrect);
      setFeedbackCorrect(result.correct ?? null);
      setPhase('answer_feedback');
      setWaitingForOthers(false);
    };

    const onAllAnswered = () => {
      setPhase('question_results');
    };

    socket.on('triviaQuestion', onTriviaQuestion);
    socket.on('triviaAnswer', onTriviaAnswer);
    socket.on('triviaAllPlayersAnswered', onAllAnswered);
    return () => {
      socket.off('triviaQuestion', onTriviaQuestion);
      socket.off('triviaAnswer', onTriviaAnswer);
      socket.off('triviaAllPlayersAnswered', onAllAnswered);
    };
  }, [socket, roomId, currentPlayer, applyTriviaQuestionPayload]);

  useEffect(() => {
    if (!endsAt || gameState.gameOver || !gameState.gameStarted) return;
    const tick = () => {
      const sec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimer(sec);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt, gameState.gameOver, gameState.gameStarted]);

  const handleOptionClick = useCallback(
    (option: string | null) => {
      if (isProcessingRef.current || hasAnswered || !activeQuestion) return;

      isProcessingRef.current = true;
      setHasAnswered(true);
      setSelected(option);
      setWaitingForOthers(true);

      socket.emit('triviaAnswer', {
        roomId,
        playerId: currentPlayer,
        qId: activeQuestion.id,
        answer: option,
      });
    },
    [hasAnswered, activeQuestion, roomId, currentPlayer, socket],
  );

  useEffect(() => {
    if (timer !== 0 || hasAnswered || !activeQuestion || !gameState.gameStarted || gameState.gameOver) return;
    if (isProcessingRef.current) return;
    handleOptionClick(null);
  }, [timer, hasAnswered, activeQuestion, gameState.gameStarted, gameState.gameOver, handleOptionClick]);

  useEffect(() => {
    if (phase !== 'question_results') return;
    setNextQuestionCountdown(5);
    const id = setInterval(() => {
      setNextQuestionCountdown((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, questionIndex]);

  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      setShowFireworks(false);
      setPhase('question');
      setNextQuestionCountdown(0);
      setFeedbackCorrect(null);
      isProcessingRef.current = false;
    }
  }, [gameState.gameStarted, gameState.gameOver]);

  const getLeaderboardData = () => {
    const scores = gameState.triviaState?.scores || {};
    if (Object.keys(scores).length === 0) {
      return (gameState.players || []).map((p: any) => ({
        _id: p.id,
        score: p.score || 0,
        name: p.name || p.id,
      })).sort((a: any, b: any) => b.score - a.score);
    }
    return Object.entries(scores)
      .map(([playerId, playerScore]) => {
        const playerInfo = gameState.players?.find((p: any) => p.id === playerId);
        return {
          _id: playerId,
          score: playerScore as number,
          name: playerInfo?.name || playerId,
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  const getQuestionResultsStats = () => {
    const answers = gameState.triviaState?.answers || {};
    let correct = 0;
    let incorrect = 0;
    Object.values(answers).forEach((a: any) => {
      if (typeof a?.isCorrect !== 'boolean') return;
      if (a.isCorrect) correct++;
      else incorrect++;
    });
    return { playersCorrect: correct, playersIncorrect: incorrect };
  };

  const leaderboardData = gameState.gameOver ? getLeaderboardData() : [];
  const liveStandings = getLeaderboardData();
  const { playersCorrect, playersIncorrect } = getQuestionResultsStats();
  const currentPlayerScore = localScore;
  const rivalPlayer = gameState.players?.find((p: any) => p.id !== currentPlayer);
  const rivalScore = rivalPlayer ? (gameState.triviaState?.scores?.[rivalPlayer.id] ?? 0) : 0;
  const isWinner = leaderboardData.length > 0 && leaderboardData[0]._id === currentPlayer;

  const inPlay = gameState.gameStarted && !gameState.gameOver;
  if (inPlay && loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[280px] ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isLight ? 'border-[#8b5cf6]' : 'border-purple-500'} mb-4`} />
        <p>Loading trivia questions...</p>
      </div>
    );
  }

  if (inPlay && !activeQuestion) {
    return (
      <div className={`p-4 rounded-lg ${isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-900/20 border-amber-500/50 text-amber-200'} border`}>
        <p>Waiting for the next question from the server…</p>
      </div>
    );
  }

  const cardBg = isLight ? 'bg-white' : 'bg-gray-800/80';
  const cardBorder = isLight ? 'border-gray-200' : 'border-gray-700';
  const textPrimary = isLight ? 'text-gray-900' : 'text-white';
  const textSecondary = isLight ? 'text-gray-600' : 'text-gray-300';
  const surface = isLight ? 'bg-gray-100' : 'bg-gray-900';

  const displayQuestion = activeQuestion;
  const countdownTotal = 5;

  return (
    <div className={`flex flex-col min-h-full ${surface} ${textPrimary}`}>
      <Fireworks show={showFireworks} onComplete={() => setShowFireworks(false)} />

      {gameState.gameOver ? (
        <div className="p-4 sm:p-6 max-w-lg mx-auto w-full">
          <div className={`rounded-2xl overflow-hidden shadow-lg ${cardBg} ${cardBorder} border p-6`}>
            <h2 className={`text-2xl sm:text-3xl font-bold text-center mb-2 ${isWinner ? 'text-emerald-600' : isLight ? 'text-gray-800' : 'text-white'}`}>
              {isWinner ? 'VICTORY!' : 'Game Over'}
            </h2>
            <p className={`text-center text-sm ${textSecondary} mb-6`}>
              Trivia Battle #{roomId.slice(-6).toUpperCase()}
            </p>

            {leaderboardData.length > 0 && (
              <>
                <div className="flex flex-col items-center mb-6">
                  <WinnerBlock playerId={leaderboardData[0]._id} score={leaderboardData[0].score} name={leaderboardData[0].name} textPrimary={textPrimary} textSecondary={textSecondary} />
                </div>

                <div className={`rounded-xl p-4 mb-6 ${isLight ? 'bg-sky-50 border border-sky-200' : 'bg-sky-900/20 border border-sky-700/50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isLight ? 'text-sky-600' : 'text-sky-400'} mb-1`}>Your Result</p>
                  <p className={`font-bold ${textPrimary}`}>
                    You placed {leaderboardData.findIndex((p: any) => p._id === currentPlayer) + 1}!
                  </p>
                  <p className={`text-sm ${textSecondary}`}>
                    {currentPlayerScore.toLocaleString()} pts
                  </p>
                </div>

                <h3 className={`font-bold text-lg mb-3 flex items-center gap-2 ${textPrimary}`}>
                  <Trophy className="w-5 h-5" /> Final Leaderboard
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {leaderboardData.slice(0, 10).map((player: any, index: number) => (
                    <LeaderboardRow
                      key={player._id}
                      player={player}
                      index={index}
                      isCurrentUser={player._id === currentPlayer}
                      isLight={isLight}
                      cardBorder={cardBorder}
                      textPrimary={textPrimary}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {onPlayAgain && (
                <button
                  onClick={onPlayAgain}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  <RotateCcw size={18} /> Play Again
                </button>
              )}
              {(onReturnHome || !onPlayAgain) && (
                onReturnHome ? (
                  <button onClick={onReturnHome} className={`text-sm ${textSecondary} hover:underline`}>
                    Return to Home
                  </button>
                ) : (
                  <Link to="/" className={`text-sm ${textSecondary} hover:underline text-center`}>
                    Return to Home
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      ) : phase === 'answer_feedback' ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl ${cardBg} ${cardBorder} border shadow-xl p-6`}>
            {lastAnswerCorrect ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                </div>
                <p className={`text-center text-2xl font-bold uppercase ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Correct!</p>
                <p className={`text-center text-lg mt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>+{lastPointsEarned} points</p>
                <hr className={`my-4 ${isLight ? 'border-gray-200' : 'border-gray-600'}`} />
                <p className={`text-xs uppercase ${textSecondary} mb-1`}>Answer</p>
                <p className={`font-semibold ${textPrimary}`}>{feedbackCorrect ?? '—'}</p>
                <p className={`text-xs uppercase ${textSecondary} mt-4 mb-1`}>Round results</p>
                <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-gray-600'}`}>
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: '66%' }} />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                    <X className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                </div>
                <p className={`text-center text-2xl font-bold uppercase ${isLight ? 'text-red-600' : 'text-red-400'}`}>Incorrect!</p>
                <p className={`text-center text-lg mt-1 ${isLight ? 'text-red-600' : 'text-red-400'}`}>{INCORRECT_PENALTY > 0 ? `-${INCORRECT_PENALTY} points` : '0 points'}</p>
                <div className={`mt-4 p-4 rounded-xl border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-900/20 border-emerald-700'}`}>
                  <p className={`text-xs uppercase ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>The correct answer was</p>
                  <p className={`font-bold ${textPrimary}`}>{feedbackCorrect ?? '—'}</p>
                </div>
                <p className={`text-xs uppercase ${textSecondary} mt-4 mb-1`}>Round results</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-500 flex items-center justify-center text-sm font-bold text-orange-500">
                    {nextQuestionCountdown || countdownTotal}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : phase === 'question_results' ? (
        <div className={`flex-1 overflow-y-auto p-4 ${surface} ${textPrimary}`}>
          <div className={`max-w-lg mx-auto rounded-2xl ${cardBg} ${cardBorder} border shadow-lg overflow-hidden`}>
            <div className={`p-4 border-b flex items-center justify-center gap-2 ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
              <Trophy className="w-5 h-5 text-amber-500" />
              <span className={`font-semibold ${textPrimary}`}>Round {questionIndex + 1} of {totalQuestions || '?'}</span>
            </div>
            <div className="p-4">
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Question Results</h3>
              <p className={`text-sm ${textSecondary} mb-4`}>{displayQuestion?.text}</p>
              <div className={`rounded-xl p-4 mb-4 flex items-center justify-between ${isLight ? 'bg-emerald-50 border border-emerald-200' : 'bg-emerald-900/20 border border-emerald-700/50'}`}>
                <div>
                  <p className={`text-xs uppercase mb-1 ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>Correct answer</p>
                  <p className={`font-bold text-lg ${textPrimary}`}>{feedbackCorrect ?? '—'}</p>
                </div>
                <Check className="w-10 h-10 text-emerald-500 flex-shrink-0" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className={`rounded-xl p-3 flex items-center gap-2 ${isLight ? 'bg-emerald-50' : 'bg-emerald-900/20'}`}>
                  <Check className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className={`text-xs uppercase ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>Players correct</p>
                    <p className={`font-bold text-lg ${textPrimary}`}>{playersCorrect}</p>
                  </div>
                </div>
                <div className={`rounded-xl p-3 flex items-center gap-2 ${isLight ? 'bg-red-50' : 'bg-red-900/20'}`}>
                  <X className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div>
                    <p className={`text-xs uppercase ${isLight ? 'text-red-700' : 'text-red-300'}`}>Players incorrect</p>
                    <p className={`font-bold text-lg ${textPrimary}`}>{playersIncorrect}</p>
                  </div>
                </div>
              </div>
              <h3 className={`font-bold mb-3 ${textPrimary}`}>Live Standings</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {liveStandings.map((player: any) => (
                  <LiveStandingRow
                    key={player._id}
                    player={player}
                    isCurrentUser={player._id === currentPlayer}
                    isLight={isLight}
                    textPrimary={textPrimary}
                  />
                ))}
              </div>
            </div>
            <div className={`p-4 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
              <p className={`text-sm font-medium mb-2 ${textSecondary}`}>Next question</p>
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-gray-600'}`}>
                  <div
                    className={`h-full rounded-full ${isLight ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${((countdownTotal - (nextQuestionCountdown || 0)) / countdownTotal) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-mono font-bold ${textPrimary}`}>0:{(nextQuestionCountdown || 0).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 sm:p-4">
            <div className={`flex items-center justify-between rounded-xl ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-800/50 border border-gray-700'} p-3 mb-4`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${isLight ? 'bg-red-100 text-red-700' : 'bg-red-900/40 text-red-300'}`}>
                  <Trophy size={12} /> Round {questionIndex + 1}/{totalQuestions || '?'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <PlayerDisplay playerId={currentPlayer} showScore score={currentPlayerScore} compact />
                  <p className={`text-xs font-semibold uppercase ${textSecondary}`}>You</p>
                </div>
                <span className={`font-bold text-lg ${textSecondary}`}>VS</span>
                <div className="text-center">
                  {rivalPlayer ? (
                    <>
                      <PlayerDisplay playerId={rivalPlayer.id} showScore score={rivalScore} compact />
                      <p className={`text-xs font-semibold uppercase ${textSecondary}`}>Rival</p>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className={`w-8 h-8 rounded-full ${isLight ? 'bg-gray-400' : 'bg-gray-600'}`} />
                      <p className={`text-xs ${textSecondary}`}>—</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`rounded-2xl overflow-hidden ${isLight ? 'bg-blue-600' : 'bg-blue-700'} p-4 sm:p-5 mb-4 relative`}>
              <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                {timer}
              </div>
              {displayQuestion?.category && (
                <div className={`inline-block text-xs font-semibold px-2 py-1 rounded mb-3 ${isLight ? 'bg-emerald-500/90' : 'bg-emerald-600'} text-white uppercase`}>
                  {displayQuestion.category}
                </div>
              )}
              <p className="text-white text-lg sm:text-xl font-medium pr-12">{displayQuestion?.text}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(displayQuestion?.options || []).map((option, index) => {
                const letter = String.fromCharCode(65 + index);
                const colors = OPTION_COLORS[index % 4];
                const isSelected = selected === option;
                const correctStr = feedbackCorrect;
                const isCorrectOption = correctStr != null && option === correctStr;
                const showCorrect = hasAnswered && isCorrectOption;
                const showWrong = hasAnswered && isSelected && correctStr != null && !isCorrectOption;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={hasAnswered}
                    onClick={() => handleOptionClick(option)}
                    className={`relative rounded-xl p-4 text-left transition-all border-2 ${colors.bg} text-white border ${colors.border} ${
                      showCorrect ? `ring-2 ring-emerald-400 ring-offset-2 ${isLight ? 'ring-offset-gray-100' : 'ring-offset-gray-900'}` : ''
                    } ${showWrong ? 'opacity-80' : ''} disabled:pointer-events-none`}
                  >
                    <span className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${isLight ? 'bg-white/90 text-gray-800' : 'bg-white/20'} ${colors.letter}`}>
                      {letter}
                    </span>
                    {showCorrect && (
                      <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </span>
                    )}
                    <span className="block pt-6 font-medium">{option}</span>
                  </button>
                );
              })}
            </div>

            {waitingForOthers && phase === 'question' && (
              <div className={`mt-4 rounded-xl p-3 text-center text-sm ${isLight ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-sky-900/20 text-sky-300 border border-sky-700/50'}`}>
                Waiting for others… {playersAnswered}/{totalPlayers} answered
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
