export interface MediaAvailability {
    audio: boolean;
    video: boolean;
  }
  
  export const checkMediaDevices = async (): Promise<MediaAvailability> => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported');
        return { audio: false, video: false };
      }
  
      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
  
      return {
        audio: audioDevices.length > 0,
        video: videoDevices.length > 0
      };
    } catch (error) {
      console.error('Error checking media devices:', error);
      return { audio: false, video: false };
    }
  };
  
  export const requestMicrophonePermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      return stream;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Microphone is in use by another application. Please close other apps using the microphone.');
      } else {
        throw new Error(`Microphone error: ${error.message}`);
      }
    }
  };
  
  export const getMediaErrorMessage = (error: any): string => {
    if (error.name === 'NotAllowedError') {
      return 'Microphone access denied. Please allow microphone access in your browser settings.';
    } else if (error.name === 'NotFoundError') {
      return 'No microphone found. Please connect a microphone and try again.';
    } else if (error.name === 'NotReadableError') {
      return 'Microphone is in use by another application. Please close other apps using the microphone.';
    } else if (error.name === 'SecurityError') {
      return 'Microphone access blocked due to security restrictions. Please use HTTPS.';
    } else {
      return `Microphone error: ${error.message}`;
    }
  };