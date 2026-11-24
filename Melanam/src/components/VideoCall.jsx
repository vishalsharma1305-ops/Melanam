// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import socket from '../socket';

// const VideoCall = () => {
//   const myVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const peerRef = useRef(null);
//   const localStream = useRef(null);
//   const [roomId] = useState('call-room');

//   // ✅ FIX: useCallback for stable reference
//   const createPeer = useCallback((initiator) => {
//     peerRef.current = new RTCPeerConnection({
//       iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
//     });

//     localStream.current.getTracks().forEach((track) => {
//       peerRef.current.addTrack(track, localStream.current);
//     });

//     peerRef.current.ontrack = (event) => {
//       if (remoteVideoRef.current) {
//         remoteVideoRef.current.srcObject = event.streams[0];
//       }
//     };

//     peerRef.current.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.emit('ice-candidate', { roomId, candidate: event.candidate });
//       }
//     };

//     if (initiator) {
//       peerRef.current
//         .createOffer()
//         .then((offer) => peerRef.current.setLocalDescription(offer))
//         .then(() => {
//           socket.emit('offer', { roomId, offer: peerRef.current.localDescription });
//         });
//     }
//   }, [roomId]);

//   useEffect(() => {
//     const start = async () => {
//       localStream.current = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });

//       if (myVideoRef.current) {
//         myVideoRef.current.srcObject = localStream.current;
//       }

//       socket.emit('join-room', roomId);
//     };

//     start();
//   }, [roomId]);

//   useEffect(() => {
//     socket.on('user-joined', () => {
//       createPeer(true); // Caller
//     });

//     socket.on('offer', async ({ offer }) => {
//       createPeer(false); // Callee
//       await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
//       const answer = await peerRef.current.createAnswer();
//       await peerRef.current.setLocalDescription(answer);
//       socket.emit('answer', { roomId, answer });
//     });

//     socket.on('answer', async ({ answer }) => {
//       await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
//     });

//     socket.on('ice-candidate', async ({ candidate }) => {
//       try {
//         await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//       } catch (err) {
//         console.error('Error adding received ice candidate', err);
//       }
//     });

//     return () => {
//       socket.off('user-joined');
//       socket.off('offer');
//       socket.off('answer');
//       socket.off('ice-candidate');
//     };
//   }, [createPeer, roomId]); // ✅ Added createPeer to dependencies

//   return (
//     <div>
//       <h2>My Video</h2>
//       <video ref={myVideoRef} autoPlay muted playsInline width="400" />
//       <h2>Remote Video</h2>
//       <video ref={remoteVideoRef} autoPlay playsInline width="400" />
//     </div>
//   );
// };

// export default VideoCall;
