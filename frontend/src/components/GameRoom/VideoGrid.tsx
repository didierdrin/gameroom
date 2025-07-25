import React from 'react';
import { MicOffIcon } from 'lucide-react';
export const VideoGrid = ({
  participants
}:any) => {
  const getGridCols = (count:any) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };
  return <div className={`grid ${getGridCols(participants.length)} gap-2 sm:gap-4 p-2 sm:p-4 h-full`}>
      {participants.map((participant:any) => <div key={participant.id} className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
          {participant.videoEnabled ? <video src={participant.videoStream} autoPlay muted={!participant.isLocal} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <img src={participant.avatar} alt={participant.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full" />
            </div>}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium truncate">
                {participant.name} {participant.isLocal && '(You)'}
              </span>
              {!participant.audioEnabled && <MicOffIcon size={14} className="text-red-400 flex-shrink-0" />}
            </div>
          </div>
        </div>)}
    </div>;
};