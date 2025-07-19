import React, { useEffect, useRef } from 'react';
import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon, MonitorIcon, PhoneIcon, Volume2, VolumeX } from 'lucide-react';

interface MediaControlsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeaveCall: () => void;
  onToggleDeafen: () => void;
  isDeafened: boolean;
  inAudioCall: boolean;
  onToggleAudioCall: () => void;
  remoteParticipants: string[];
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeaveCall,
  onToggleDeafen,
  isDeafened,
  inAudioCall,
  onToggleAudioCall,
  remoteParticipants
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 sm:gap-2 bg-gray-800 p-1 sm:p-2 rounded-lg border border-gray-700 shadow-lg z-50">
      {/* Video Toggle */}
      <button
        onClick={onToggleVideo}
        className={`p-2 sm:p-3 rounded-lg transition-colors ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
        title={videoEnabled ? 'Turn off video' : 'Turn on video'}
      >
        {videoEnabled ? <VideoIcon size={18} className="sm:hidden" /> : <VideoOffIcon size={18} className="sm:hidden" />}
        {videoEnabled ? <VideoIcon size={20} className="hidden sm:block" /> : <VideoOffIcon size={20} className="hidden sm:block" />}
      </button>

      {/* Microphone Toggle */}
      <button
        onClick={onToggleAudio}
        className={`p-2 sm:p-3 rounded-lg transition-colors ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? <MicIcon size={18} className="sm:hidden" /> : <MicOffIcon size={18} className="sm:hidden" />}
        {audioEnabled ? <MicIcon size={20} className="hidden sm:block" /> : <MicOffIcon size={20} className="hidden sm:block" />}
      </button>

      {/* Audio Call Toggle */}
      <button
        onClick={onToggleAudioCall}
        className={`p-2 sm:p-3 rounded-lg transition-colors ${inAudioCall ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        title={inAudioCall ? 'Leave audio call' : 'Join audio call'}
      >
        <PhoneIcon size={18} className="sm:hidden" />
        <PhoneIcon size={20} className="hidden sm:block" />
      </button>

      {/* Deafen Toggle (only visible in audio call) */}
      {inAudioCall && (
        <button
          onClick={onToggleDeafen}
          className={`p-2 sm:p-3 rounded-lg transition-colors ${isDeafened ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX size={18} className="sm:hidden" /> : <Volume2 size={18} className="sm:hidden" />}
          {isDeafened ? <VolumeX size={20} className="hidden sm:block" /> : <Volume2 size={20} className="hidden sm:block" />}
        </button>
      )}

      {/* Screen Share Toggle */}
      {/* <button
        onClick={onToggleScreenShare}
        className={`hidden sm:block p-3 rounded-lg transition-colors ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
      >
        <MonitorIcon size={20} />
      </button> */}

<button
  onClick={onToggleScreenShare}
  className={`p-2 sm:p-3 rounded-lg transition-colors ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
  title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
>
  <MonitorIcon size={20} />
</button>

      {/* Leave Call Button */}
      <button
        onClick={onLeaveCall}
        className="p-2 sm:p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
        title="Leave room"
      >
        <PhoneIcon size={18} className="rotate-135 sm:hidden" />
        <PhoneIcon size={20} className="rotate-135 hidden sm:block" />
      </button>

      {/* Participant indicators */}
      {inAudioCall && remoteParticipants.length > 0 && (
        <div className="hidden sm:flex items-center space-x-1 ml-2">
          {remoteParticipants.map(participantId => (
            <div key={participantId} className="text-xs bg-gray-700 px-2 py-1 rounded">
              {participantId.slice(0, 4)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// import React from 'react';
// import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon, MonitorIcon, PhoneIcon } from 'lucide-react';
// export const MediaControls = ({
//   videoEnabled,
//   audioEnabled,
//   isScreenSharing,
//   onToggleVideo,
//   onToggleAudio,
//   onToggleScreenShare,
//   onLeaveCall
// }) => {
//   return <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 sm:gap-2 bg-gray-800 p-1 sm:p-2 rounded-lg border border-gray-700 shadow-lg z-50">
//       <button onClick={onToggleVideo} className={`p-2 sm:p-3 rounded-lg transition-colors ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
//         {videoEnabled ? <VideoIcon size={18} className="sm:hidden" /> : <VideoOffIcon size={18} className="sm:hidden" />}
//         {videoEnabled ? <VideoIcon size={20} className="hidden sm:block" /> : <VideoOffIcon size={20} className="hidden sm:block" />}
//       </button>
//       <button onClick={onToggleAudio} className={`p-2 sm:p-3 rounded-lg transition-colors ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
//         {audioEnabled ? <MicIcon size={18} className="sm:hidden" /> : <MicOffIcon size={18} className="sm:hidden" />}
//         {audioEnabled ? <MicIcon size={20} className="hidden sm:block" /> : <MicOffIcon size={20} className="hidden sm:block" />}
//       </button>
//       <button onClick={onToggleScreenShare} className={`hidden sm:block p-3 rounded-lg transition-colors ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
//         <MonitorIcon size={20} />
//       </button>
//       <button onClick={onLeaveCall} className="p-2 sm:p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors">
//         <PhoneIcon size={18} className="rotate-135 sm:hidden" />
//         <PhoneIcon size={20} className="rotate-135 hidden sm:block" />
//       </button>
//     </div>;
// };