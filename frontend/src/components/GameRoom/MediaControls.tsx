import React from 'react';
import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon, MonitorIcon, PhoneIcon } from 'lucide-react';
export const MediaControls = ({
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeaveCall
}) => {
  return <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 sm:gap-2 bg-gray-800 p-1 sm:p-2 rounded-lg border border-gray-700 shadow-lg z-50">
      <button onClick={onToggleVideo} className={`p-2 sm:p-3 rounded-lg transition-colors ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
        {videoEnabled ? <VideoIcon size={18} className="sm:hidden" /> : <VideoOffIcon size={18} className="sm:hidden" />}
        {videoEnabled ? <VideoIcon size={20} className="hidden sm:block" /> : <VideoOffIcon size={20} className="hidden sm:block" />}
      </button>
      <button onClick={onToggleAudio} className={`p-2 sm:p-3 rounded-lg transition-colors ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
        {audioEnabled ? <MicIcon size={18} className="sm:hidden" /> : <MicOffIcon size={18} className="sm:hidden" />}
        {audioEnabled ? <MicIcon size={20} className="hidden sm:block" /> : <MicOffIcon size={20} className="hidden sm:block" />}
      </button>
      <button onClick={onToggleScreenShare} className={`hidden sm:block p-3 rounded-lg transition-colors ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
        <MonitorIcon size={20} />
      </button>
      <button onClick={onLeaveCall} className="p-2 sm:p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors">
        <PhoneIcon size={18} className="rotate-135 sm:hidden" />
        <PhoneIcon size={20} className="rotate-135 hidden sm:block" />
      </button>
    </div>;
};