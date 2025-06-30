import React from 'react';
import { XIcon } from 'lucide-react';
export const TournamentRegistrationModal = ({
  tournament,
  onClose,
  onRegister
}) => {
  const handleSubmit = e => {
    e.preventDefault();
    onRegister();
  };
  return <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold">Tournament Registration</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
            <XIcon size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="mb-6">
            <h4 className="font-medium mb-2">{tournament.name}</h4>
            <div className="flex flex-wrap gap-2 text-sm text-gray-400">
              <span className="px-2 py-1 bg-gray-700 rounded">
                {tournament.gameType}
              </span>
              <span className="px-2 py-1 bg-gray-700 rounded">
                {tournament.startDate} - {tournament.endDate}
              </span>
              <span className="px-2 py-1 bg-gray-700 rounded">
                {tournament.participants}/{tournament.maxParticipants} Players
              </span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Team Name (Optional)
              </label>
              <input type="text" className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Enter your team name" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Preferred Game Time
              </label>
              <select className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="any">No Preference</option>
                <option value="morning">Morning (8 AM - 12 PM)</option>
                <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                <option value="evening">Evening (5 PM - 10 PM)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox text-purple-500" />
                <span className="text-sm text-gray-400">
                  I agree to the tournament rules and guidelines
                </span>
              </label>
            </div>
            <div className="pt-4">
              <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                Confirm Registration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>;
};