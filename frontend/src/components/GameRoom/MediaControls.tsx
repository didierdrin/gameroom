import React from 'react';
import { 
  VideoIcon, 
  VideoOffIcon, 
  MicIcon, 
  MicOffIcon, 
  MonitorIcon, 
  PhoneIcon, 
  Volume2, 
  VolumeX,
  Users
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MediaAvailability {
  audio: boolean;
  video: boolean;
}

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
  mediaAvailable: MediaAvailability;
  isInitializingMedia: boolean;
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
  remoteParticipants,
  mediaAvailable,
  isInitializingMedia
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    // <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 sm:gap-2 ... z-50">
    <div className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-2 rounded-lg border shadow-lg ${
      isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
    }`}>
      
     

{/* Join/Leave Call Button */}
<button
  onClick={onToggleAudioCall}
  disabled={isInitializingMedia || !mediaAvailable.audio}
  className={`p-2 sm:p-3 rounded-lg transition-colors font-medium ${
    isInitializingMedia || !mediaAvailable.audio
      ? isLight ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-gray-600 cursor-not-allowed text-gray-300'
      : inAudioCall
      ? 'bg-green-600 hover:bg-green-700 text-white'
      : isLight ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
  }`}
  title={
    !mediaAvailable.audio
      ? 'No microphone available'
      : isInitializingMedia
      ? 'Initializing...'
      : inAudioCall
      ? 'Leave call'
      : 'Join call'
  }
>
  <div className="flex items-center space-x-1">
    <PhoneIcon size={18} className="sm:hidden" />
    <PhoneIcon size={20} className="hidden sm:block" />
    <span className="hidden md:inline text-sm">
      {inAudioCall ? 'Leave' : 'Join'}
    </span>
  </div>
</button>



      {/* Call controls - only show when in call */}
      {inAudioCall && (
        <>
          {/* Microphone Toggle */}
          <button
            onClick={onToggleAudio}
            disabled={!mediaAvailable.audio || isInitializingMedia}
            className={`p-2 sm:p-3 rounded-lg transition-colors ${
              !mediaAvailable.audio || isInitializingMedia
                ? isLight ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-gray-600 cursor-not-allowed text-gray-300'
                : audioEnabled
                ? isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={
              !mediaAvailable.audio
                ? 'No audio device available'
                : isInitializingMedia
                ? 'Initializing media...'
                : audioEnabled
                ? 'Mute microphone'
                : 'Unmute microphone'
            }
          >
            {audioEnabled && mediaAvailable.audio ? (
              <>
                <MicIcon size={18} className="sm:hidden" />
                <MicIcon size={20} className="hidden sm:block" />
              </>
            ) : (
              <>
                <MicOffIcon size={18} className="sm:hidden" />
                <MicOffIcon size={20} className="hidden sm:block" />
              </>
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={onToggleVideo}
            disabled={!mediaAvailable.video || isInitializingMedia}
            className={`p-2 sm:p-3 rounded-lg transition-colors ${
              !mediaAvailable.video || isInitializingMedia
                ? isLight ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-gray-600 cursor-not-allowed text-gray-300'
                : videoEnabled
                ? isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={
              !mediaAvailable.video
                ? 'No video device available'
                : isInitializingMedia
                ? 'Initializing media...'
                : videoEnabled
                ? 'Turn off video'
                : 'Turn on video'
            }
          >
            {videoEnabled && mediaAvailable.video ? (
              <>
                <VideoIcon size={18} className="sm:hidden" />
                <VideoIcon size={20} className="hidden sm:block" />
              </>
            ) : (
              <>
                <VideoOffIcon size={18} className="sm:hidden" />
                <VideoOffIcon size={20} className="hidden sm:block" />
              </>
            )}
          </button>

          {/* Screen Share Toggle */}
          {/* <button
            onClick={onToggleScreenShare}
            disabled={!mediaAvailable.video || isInitializingMedia}
            className={`p-2 sm:p-3 rounded-lg transition-colors ${
              !mediaAvailable.video || isInitializingMedia
                ? 'bg-gray-600 cursor-not-allowed'
                : isScreenSharing
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={
              !mediaAvailable.video
                ? 'No video device available'
                : isInitializingMedia
                ? 'Initializing media...'
                : isScreenSharing
                ? 'Stop sharing screen'
                : 'Share screen'
            }
          >
            <MonitorIcon size={18} className="sm:hidden" />
            <MonitorIcon size={20} className="hidden sm:block" />
          </button> */}

          {/* Deafen Toggle */}
          <button
            onClick={onToggleDeafen}
            className={`p-2 sm:p-3 rounded-lg transition-colors ${
              isDeafened
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? (
              <>
                <VolumeX size={18} className="sm:hidden" />
                <VolumeX size={20} className="hidden sm:block" />
              </>
            ) : (
              <>
                <Volume2 size={18} className="sm:hidden" />
                <Volume2 size={20} className="hidden sm:block" />
              </>
            )}
          </button>
        </>
      )}

      {/* Leave Room Button */}
      <button
        onClick={onLeaveCall}
        className="p-2 sm:p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
        title="Leave room"
      >
        <PhoneIcon size={18} className="rotate-135 sm:hidden" />
        <PhoneIcon size={20} className="rotate-135 hidden sm:block" />
      </button>

      {/* Participant Count */}
      {inAudioCall && remoteParticipants.length > 0 && (
        <div className={`hidden sm:flex items-center space-x-2 ml-2 px-2 py-1 rounded-lg ${
          isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-700'
        }`}>
          <Users size={16} className={isLight ? 'text-gray-600' : 'text-gray-400'} />
          <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
            {remoteParticipants.length + 1}
          </span>
        </div>
      )}

      {/* Loading indicator */}
      {isInitializingMedia && (
        <div className="flex items-center ml-2">
          <div className={`animate-spin rounded-full h-4 w-4 border-2 border-t-transparent ${isLight ? 'border-[#8b5cf6]' : 'border-purple-500'}`}></div>
          <span className={`ml-2 text-xs hidden sm:inline ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Loading...
          </span>
        </div>
      )}
    </div>
  );
};
