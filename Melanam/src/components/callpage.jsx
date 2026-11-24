
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import VideoPlayer from './videoplayer';
import ChatBox from './chatbot';
import Controls from './controlls';
import RoomControls from './newcontrol';
import ConnectionStatus from './connectionStatus';

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const mediaConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

export default function CallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [roomSettings, setRoomSettings] = useState({
    isLocked: false,
    isMuted: false
  });
  const [isCreator, setIsCreator] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [focusedVideo, setFocusedVideo] = useState(null);
  const [emojiReactions, setEmojiReactions] = useState({});
  const peerConnections = useRef({});
  const screenStreamRef = useRef(null);
  const retryCount = useRef(0);
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});
  const animationFrameRef = useRef(null);

  // Initialize audio context and analysers
  const initAudioAnalyser = (stream, userId) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 32;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analysersRef.current[userId] = analyser;
    } catch (error) {
      console.error('Error initializing audio analyser:', error);
    }
  };

  // Check speaking status
  const checkSpeakingStatus = () => {
    try {
      const dataArray = new Uint8Array(32);
      let loudestUserId = null;
      let maxVolume = -Infinity;

      Object.entries(analysersRef.current).forEach(([userId, analyser]) => {
        analyser.getByteFrequencyData(dataArray);
        const volume = Math.max(...dataArray);
        
        if (volume > maxVolume && volume > 50) {
          maxVolume = volume;
          loudestUserId = userId;
        }
      });

      setActiveSpeaker(loudestUserId);
      animationFrameRef.current = requestAnimationFrame(checkSpeakingStatus);
    } catch (error) {
      console.error('Error checking speaking status:', error);
    }
  };

  const getUserMedia = async (constraints = mediaConstraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (stream.getAudioTracks().length > 0) {
        initAudioAnalyser(stream, socket.id);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setConnectionStatus('media-error');
      return null;
    }
  };

  const createPeerConnection = (userId) => {
    try {
      const pc = new RTCPeerConnection(iceServers);
      peerConnections.current[userId] = pc;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit('ice-candidate', {
            to: userId,
            candidate: e.candidate,
          });
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0];
        setRemoteStreams((prev) => ({
          ...prev,
          [userId]: stream,
        }));

        if (stream.getAudioTracks().length > 0) {
          initAudioAnalyser(stream, userId);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log(`${userId} ICE state: ${state}`);
        
        if (state === 'connected') {
          setConnectionStatus('connected');
          retryCount.current = 0;
        } else if (state === 'disconnected' || state === 'failed') {
          if (retryCount.current < 3) {
            retryCount.current += 1;
            reconnectPeer(userId);
          } else {
            handleUserLeft({ userId });
          }
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { to: userId, offer });
        } catch (err) {
          console.error('Negotiation error:', err);
        }
      };

      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      return null;
    }
  };

  const reconnectPeer = (userId) => {
    const pc = peerConnections.current[userId];
    if (!pc) return;
    
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      console.log(`Attempting to reconnect to ${userId}`);
      handleUserJoined({ userId });
    }
  };

  const handleUserJoined = async ({ userId }) => {
    if (peerConnections.current[userId] || userId === socket?.id) return;
    
    const pc = createPeerConnection(userId);
    if (!pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: userId, offer });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async ({ sender, offer }) => {
    if (roomSettings.isLocked && !participants.includes(sender)) {
      console.log('Room is locked, rejecting connection from', sender);
      return;
    }

    let pc = peerConnections.current[sender];
    if (!pc) {
      pc = createPeerConnection(sender);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: sender, answer });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async ({ sender, answer }) => {
    const pc = peerConnections.current[sender];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  };

  const handleIceCandidate = async ({ sender, candidate }) => {
    const pc = peerConnections.current[sender];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  const handleUserLeft = ({ userId }) => {
    const pc = peerConnections.current[userId];
    if (pc) {
      pc.close();
      delete peerConnections.current[userId];
    }
    
    delete analysersRef.current[userId];
    
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
    
    setParticipants(prev => prev.filter(id => id !== userId));
    
    if (activeSpeaker === userId) {
      setActiveSpeaker(null);
    }
    
    if (focusedVideo === userId) {
      setFocusedVideo(null);
    }
  };

  const handleEmojiReaction = ({ userId, emoji }) => {
    setEmojiReactions(prev => ({
      ...prev,
      [userId]: emoji
    }));
    
    setTimeout(() => {
      setEmojiReactions(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }, 2000);
  };

  const shareScreen = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing and revert to camera
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        
        // Get the camera stream again
        const stream = await getUserMedia();
        if (!stream) return;
        
        // Replace tracks in all peer connections
        Object.keys(peerConnections.current).forEach(userId => {
          const pc = peerConnections.current[userId];
          const senders = pc.getSenders();
          
          senders.forEach(sender => {
            if (sender.track?.kind === 'video') {
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                sender.replaceTrack(videoTrack)
                  .catch(err => console.error('Error replacing track:', err));
              }
            }
          });
        });
        
        // Update local video display
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        return;
      }

      // Start screen sharing
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      // Replace video tracks in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      Object.keys(peerConnections.current).forEach(userId => {
        const pc = peerConnections.current[userId];
        const senders = pc.getSenders();
        
        senders.forEach(sender => {
          if (sender.track?.kind === 'video') {
            sender.replaceTrack(videoTrack)
              .catch(err => console.error('Error replacing track:', err));
          }
        });
      });

      // Update local video display to show screen share preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([videoTrack]);
      }

      // Handle when screen sharing is stopped by browser UI
      videoTrack.onended = () => {
        shareScreen();
      };
    } catch (error) {
      console.error('Error sharing screen:', error);
      setIsScreenSharing(false);
    }
  };

  const updateRoomSettings = (newSettings) => {
    if (!isCreator) return;
    
    const updatedSettings = { ...roomSettings, ...newSettings };
    setRoomSettings(updatedSettings);
    socket.emit('update-room-settings', { 
      roomId, 
      settings: updatedSettings 
    });
  };

  const endCallForAll = () => {
    if (!isCreator) return;
    socket.emit('close-room', roomId);
    navigate('/');
  };

  const toggleFocusVideo = (userId) => {
    setFocusedVideo(focusedVideo === userId ? null : userId);
  };

  const sendEmoji = (emoji) => {
    if (socket && roomId) {
      socket.emit('send-emoji', { roomId, emoji });
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    analysersRef.current = {};
    
    if (socket) {
      socket.emit('leave-room', roomId);
    }
  };

  useEffect(() => {
    const init = async () => {
      const stream = await getUserMedia();
      if (!stream) return;

      socket.emit('join-room', roomId, (response) => {
        if (response?.error) {
          alert(response.error);
          navigate('/');
          return;
        }
        
        setIsCreator(response.isCreator);
        if (response.roomSettings) {
          setRoomSettings(response.roomSettings);
        }
        setConnectionStatus('connected');
        
        checkSpeakingStatus();
      });
    };

    init();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!socket || !localStream) return;

    const eventHandlers = {
      'existing-users': ({ roomUsers, roomSettings }) => {
        setParticipants(roomUsers);
        if (roomSettings) {
          setRoomSettings(roomSettings);
        }
        roomUsers.forEach(userId => {
          if (userId !== socket.id && !peerConnections.current[userId]) {
            handleUserJoined({ userId });
          }
        });
      },
      'user-joined': ({ userId, roomUsers }) => {
        setParticipants(prev => {
          const newParticipants = roomUsers || [...prev, userId];
          return Array.from(new Set(newParticipants));
        });
        handleUserJoined({ userId });
      },
      'offer': handleOffer,
      'answer': handleAnswer,
      'ice-candidate': handleIceCandidate,
      'user-left': handleUserLeft,
      'room-settings-updated': (settings) => {
        setRoomSettings(settings);
      },
      'room-closed': () => {
        alert('The host has closed the room');
        navigate('/');
      },
      'promoted-to-creator': () => {
        setIsCreator(true);
        alert('You are now the room creator');
      },
      'receive-emoji': handleEmojiReaction
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.keys(eventHandlers).forEach(event => {
        socket.off(event, eventHandlers[event]);
      });
    };
  }, [socket, localStream, roomId, participants]);

  const getVideoClasses = (userId) => {
    if (!focusedVideo) return 'w-full h-full';
    return userId === focusedVideo 
      ? 'w-full h-full row-span-2 col-span-2 z-10' 
      : 'w-48 h-36';
  };

  return (
    <div className="flex h-screen w-screen bg-white text-gray-800 overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-teal-200 w-screen flex justify-between items-center bg-teal-600 text-white">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Room: {roomId}</h2>
            <ConnectionStatus status={connectionStatus} />
          </div>
          <RoomControls 
            isCreator={isCreator}
            isLocked={roomSettings.isLocked}
            onToggleLock={() => updateRoomSettings({ isLocked: !roomSettings.isLocked })}
            onEndCall={endCallForAll}
          />
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 overflow-y-auto bg-white">
          <div 
            className={`${getVideoClasses(socket.id)} transition-all duration-300`}
            onClick={() => toggleFocusVideo(socket.id)}
          >
            <VideoPlayer
              stream={localStream} 
              isLocal 
              ref={localVideoRef} 
              username="You"
              isSpeaking={activeSpeaker === socket.id}
              isMuted={roomSettings.isMuted}
              isFocused={focusedVideo === socket.id}
              emoji={emojiReactions[socket.id]}
            />
          </div>
          
          {Object.entries(remoteStreams).map(([id, stream]) => (
            <div 
              key={id} 
              className={`${getVideoClasses(id)} transition-all duration-300`}
              onClick={() => toggleFocusVideo(id)}
            >
              <VideoPlayer 
                stream={stream} 
                username={`User ${id.slice(0, 5)}`}
                isSpeaking={activeSpeaker === id}
                isFocused={focusedVideo === id}
                emoji={emojiReactions[id]}
              />
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-teal-50 border-t border-teal-200">
          <Controls 
            localStream={localStream} 
            onScreenShare={shareScreen}
            isScreenSharing={isScreenSharing}
            isMuted={roomSettings.isMuted}
            onToggleMute={() => updateRoomSettings({ isMuted: !roomSettings.isMuted })}
            onResetFocus={() => setFocusedVideo(null)}
            hasFocusedVideo={!!focusedVideo}
            socket={socket}
            roomId={roomId}
            sendEmoji={sendEmoji}
          />
        </div>
      </div>
      
     
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatBox roomId={roomId} socket={socket} />
        </div>
      </div>
    
  );
}