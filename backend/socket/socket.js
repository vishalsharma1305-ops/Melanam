const activeRooms = new Map(); // roomId -> { users: Set, settings: { isLocked, isMuted, creator } }

export default function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log('🟢 User connected:', socket.id);

    // Helper function to get room by socket ID
    const getRoomBySocketId = (socketId) => {
      for (const [roomId, room] of activeRooms.entries()) {
        if (room.users.has(socketId)) {
          return roomId;
        }
      }
      return null;
    };

    // Join Room
    socket.on('join-room', (roomId, callback) => {
      try {
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, {
            users: new Set(),
            settings: {
              isLocked: false,
              isMuted: false,
              creator: socket.id
            }
          });
        }

        const room = activeRooms.get(roomId);
        
        // Check if room is locked
        if (room.settings.isLocked && !room.users.has(socket.id)) {
          return callback({ error: 'Room is locked' });
        }

        // Check if user is already in another room
        const currentRoom = getRoomBySocketId(socket.id);
        if (currentRoom && currentRoom !== roomId) {
          return callback({ error: 'You are already in another room' });
        }

        room.users.add(socket.id);
        socket.join(roomId);

        console.log(`User ${socket.id} joined room ${roomId}`);

        // Send room info to the joining user
        callback({
          success: true,
          roomSettings: room.settings,
          isCreator: socket.id === room.settings.creator,
          roomUsers: Array.from(room.users).filter(id => id !== socket.id),
        });

        // Inform others in room about the new user
        socket.to(roomId).emit('user-joined', {
          userId: socket.id,
          roomUsers: Array.from(room.users),
        });

      } catch (error) {
        console.error('Error joining room:', error);
        callback({ error: 'Failed to join room' });
      }
    });

    // WebRTC Signaling - Modified to handle cases where ack isn't provided
    socket.on('offer', ({ to, offer }, ack) => {
      try {
        socket.to(to).emit('offer', { sender: socket.id, offer });
        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        console.error('Error sending offer:', error);
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Failed to send offer' });
        }
      }
    });

    socket.on('answer', ({ to, answer }, ack) => {
      try {
        socket.to(to).emit('answer', { sender: socket.id, answer });
        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        console.error('Error sending answer:', error);
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Failed to send answer' });
        }
      }
    });

    socket.on('ice-candidate', ({ to, candidate }, ack) => {
      try {
        socket.to(to).emit('ice-candidate', { sender: socket.id, candidate });
        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        console.error('Error sending ICE candidate:', error);
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Failed to send ICE candidate' });
        }
      }
    });

    // Room Management
    socket.on('update-room-settings', ({ roomId, settings }, ack) => {
      try {
        if (!activeRooms.has(roomId)) {
          if (typeof ack === 'function') {
            return ack({ success: false, error: 'Room not found' });
          }
          return;
        }

        const room = activeRooms.get(roomId);
        if (room.settings.creator !== socket.id) {
          if (typeof ack === 'function') {
            return ack({ success: false, error: 'Only room creator can change settings' });
          }
          return;
        }

        room.settings = { ...room.settings, ...settings };
        io.to(roomId).emit('room-settings-updated', room.settings);
        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        console.error('Error updating room settings:', error);
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Failed to update settings' });
        }
      }
    });

    socket.on('close-room', (roomId, ack) => {
      try {
        if (!activeRooms.has(roomId)) {
          if (typeof ack === 'function') {
            return ack({ success: false, error: 'Room not found' });
          }
          return;
        }

        const room = activeRooms.get(roomId);
        if (room.settings.creator !== socket.id) {
          if (typeof ack === 'function') {
            return ack({ success: false, error: 'Only room creator can close the room' });
          }
          return;
        }

        io.to(roomId).emit('room-closed', { message: 'Host ended the meeting' });
        activeRooms.delete(roomId);
        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        console.error('Error closing room:', error);
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Failed to close room' });
        }
      }
    });

    // Chat messaging
    socket.on('chat-message', ({ roomId, message }, ack) => {
      try {
        if (!activeRooms.has(roomId) || !activeRooms.get(roomId).users.has(socket.id)) {
          if (typeof ack === 'function') {
            return ack({ success: false, error: 'Not in room' });
          }
          return;
        }

        const timestamp = new Date().toISOString();
        io.to(roomId).emit('chat-message', {
          message,
          sender: socket.id,
          senderName: `User ${socket.id.slice(0, 5)}`,
          timestamp,
          isSystem: false
        });
        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        console.error('Error sending chat message:', error);
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Failed to send message' });
        }
      }
    });

    // Disconnection handling
    socket.on('disconnect', () => {
      console.log('🔴 User disconnected:', socket.id);

      for (const [roomId, room] of activeRooms.entries()) {
        if (room.users.delete(socket.id)) {
          // Notify remaining users
          socket.to(roomId).emit('user-left', {
            userId: socket.id,
            roomUsers: Array.from(room.users),
          });

          // Handle room creator leaving
          if (room.settings.creator === socket.id && room.users.size > 0) {
            // Assign new creator
            const newCreator = Array.from(room.users)[0];
            room.settings.creator = newCreator;
            
            io.to(roomId).emit('chat-message', {
              message: 'Room ownership transferred to another participant',
              sender: 'system',
              timestamp: new Date().toISOString(),
              isSystem: true
            });
            
            io.to(newCreator).emit('promoted-to-creator');
          }

          if (room.users.size === 0) {
            activeRooms.delete(roomId);
            console.log(`Room ${roomId} closed (no users)`);
          }
        }
      }
    });

    // Health check
    socket.on('ping', (callback) => {
      callback('pong');
    });
  });
}