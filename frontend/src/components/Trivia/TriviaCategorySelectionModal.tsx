import React, { useState, useEffect } from 'react';
import { XIcon, SettingsIcon, RotateCcw } from 'lucide-react';

interface TriviaSettings {
  questionCount: number;
  difficulty: string;
  category: string;
}

interface TriviaCategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: TriviaSettings) => void;
  currentSettings?: TriviaSettings;
  isLoading?: boolean;
}

const TRIVIA_CATEGORIES = [
  { value: 'general', label: 'General Knowledge', icon: '🌍' },
  { value: 'science', label: 'Science & Nature', icon: '🔬' },
  { value: 'history', label: 'History', icon: '📜' },
  { value: 'geography', label: 'Geography', icon: '🗺️' },
  { value: 'entertainment', label: 'Entertainment: Film', icon: '🎬' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'technology', label: 'Computers & Technology', icon: '💻' },
  { value: 'literature', label: 'Books & Literature', icon: '📚' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'politics', label: 'Politics', icon: '🏛️' },
  { value: 'nature', label: 'Nature & Animals', icon: '🌿' },
  { value: 'movies', label: 'Movies & TV', icon: '🎭' },
  { value: 'mythology', label: 'Mythology', icon: '🐉' },
  { value: 'food', label: 'Food & Cooking', icon: '🍳' },
];

export const TriviaCategorySelectionModal: React.FC<TriviaCategorySelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentSettings,
  isLoading = false
}) => {
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [category, setCategory] = useState('general');

  // Initialize with current settings when modal opens
  useEffect(() => {
    if (isOpen && currentSettings) {
      setQuestionCount(currentSettings.questionCount);
      setDifficulty(currentSettings.difficulty);
      setCategory(currentSettings.category);
    }
  }, [isOpen, currentSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      questionCount,
      difficulty,
      category
    });
  };

  const handleClose = () => {
    // Reset to current settings when closing
    if (currentSettings) {
      setQuestionCount(currentSettings.questionCount);
      setDifficulty(currentSettings.difficulty);
      setCategory(currentSettings.category);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <SettingsIcon size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Trivia Settings</h3>
              <p className="text-sm text-gray-400">Configure your trivia game</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Count */}
          <div>
            <label className="flex items-center justify-between text-gray-300 mb-3 text-sm font-medium">
              <span>Number of Questions</span>
              <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                {questionCount} questions
              </span>
            </label>
            <div className="relative flex items-center">
              <input 
                type="range" 
                min="5" 
                max="30" 
                step="5"
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                value={questionCount} 
                onChange={e => setQuestionCount(parseInt(e.target.value))}
                disabled={isLoading}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>30</span>
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-gray-300 mb-3 text-sm font-medium">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDifficulty('easy')}
                disabled={isLoading}
                className={`p-3 rounded-lg font-medium transition-all ${
                  difficulty === 'easy'
                    ? 'bg-green-600 text-white border-2 border-green-500'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Easy
              </button>
              <button
                type="button"
                onClick={() => setDifficulty('medium')}
                disabled={isLoading}
                className={`p-3 rounded-lg font-medium transition-all ${
                  difficulty === 'medium'
                    ? 'bg-yellow-600 text-white border-2 border-yellow-500'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setDifficulty('hard')}
                disabled={isLoading}
                className={`p-3 rounded-lg font-medium transition-all ${
                  difficulty === 'hard'
                    ? 'bg-red-600 text-white border-2 border-red-500'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Hard
              </button>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-gray-300 mb-3 text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white disabled:opacity-50"
            >
              {TRIVIA_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current Settings Display */}
          {currentSettings && (
            <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Current Settings</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Category: {TRIVIA_CATEGORIES.find(c => c.value === currentSettings.category)?.label}</div>
                <div>Difficulty: {currentSettings.difficulty}</div>
                <div>Questions: {currentSettings.questionCount}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  <span>Restart with New Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};