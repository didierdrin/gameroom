import React from 'react';
import { Users2Icon } from 'lucide-react';
export const TournamentBracket = ({
  matches
}) => {
  return <div className="overflow-x-auto">
      <div className="min-w-[768px] p-4">
        <div className="flex justify-between">
          {/* Round columns */}
          {['Round 1', 'Quarter Finals', 'Semi Finals', 'Finals'].map((round, i) => <div key={round} className="flex-1 px-2">
                <h4 className="text-sm font-medium text-gray-400 mb-4">
                  {round}
                </h4>
                <div className="space-y-4">
                  {Array(Math.pow(2, 3 - i)).fill(0).map((_, index) => <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=player1" alt="Player 1" className="w-6 h-6 rounded-full" />
                          <span className="text-sm">
                            Player {index * 2 + 1}
                          </span>
                          <span className="text-sm text-gray-400 ml-auto">
                            0
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=player2" alt="Player 2" className="w-6 h-6 rounded-full" />
                          <span className="text-sm">
                            Player {index * 2 + 2}
                          </span>
                          <span className="text-sm text-gray-400 ml-auto">
                            0
                          </span>
                        </div>
                      </div>)}
                </div>
              </div>)}
        </div>
      </div>
    </div>;
};