import { useEffect, useRef, forwardRef } from 'react';
const VideoPlayer = forwardRef(({ 
  stream, 
  isLocal = false, 
  username = '',
  isSpeaking = false,
  isMuted = false,
  className = '',
  ...props 
}, ref) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-gray-800 rounded-lg overflow-hidden aspect-video ${className}`}>
      <video
        ref={(node) => {
          videoRef.current = node;
          if (ref) {
            if (typeof ref === 'function') {
              ref(node);
            } else {
              ref.current = node;
            }
          }
        }}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
        {...props}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-2 bg-gradient-to-t from-black/70 to-transparent">
        {/* Top bar */}
        <div className={`flex items-center justify-between p-2 rounded-full ${isSpeaking ? 'bg-blue-500/30' : ''}`}>
          <div className="flex items-center">
            {isSpeaking && (
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
            )}
            <span className="text-sm font-medium truncate">
              {username}
              {isMuted && ' (Muted)'}
            </span>
          </div>
        </div>
        
        {/* Bottom bar */}
        {!stream?.active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Camera off</div>
          </div>
        )}
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;