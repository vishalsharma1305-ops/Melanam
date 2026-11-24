

import { useEffect, useRef, useState } from 'react';
import { FaComment, FaPaperPlane, FaTimes } from 'react-icons/fa';

function ChatBox({ roomId, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef();

  useEffect(() => {
    const handleChatMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    socket?.on('chat-message', handleChatMessage);

    return () => {
      socket?.off('chat-message', handleChatMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() && socket) {
      socket.emit('chat-message', { roomId, message: input }, (response) => {
        if (response?.success) {
          setInput('');
        }
      });
    }
  };

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '45px',
          backgroundColor: '#0d9488',
          color: 'white',
          padding: '16px',
          borderRadius: '50%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        aria-label="Open chat"
      >
        <FaComment size={24} />
        {messages.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '50%',
            height: '24px',
            width: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {messages.length}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 30,
            transition: 'opacity 0.3s ease',
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat sidebar */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100%',
          width: '100%',
          maxWidth: '28rem',
          backgroundColor: '#115e59',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Chat header */}
        <div style={{
          backgroundColor: '#0d9488',
          color: 'white',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Chat Room</h3>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              color: 'white',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a5f3fc')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
            aria-label="Close chat"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Messages container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          background: 'linear-gradient(to bottom, #134e4a, #115e59)',
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#5eead4',
            }}>
              <FaComment size={48} style={{ marginBottom: '16px' }} />
              <p>No messages yet</p>
              <p style={{ fontSize: '14px' }}>Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '16px',
                  animation: 'fadeInUp 0.3s ease-out forwards',
                }}
              >
                {!msg.isSystem && (
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: msg.sender === socket?.id ? '#a5f3fc' : '#86efac',
                  }}>
                    {msg.sender === socket?.id ? 'You' : msg.senderName || 'User'}
                  </div>
                )}
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    maxWidth: '20rem',
                    transition: 'transform 0.2s ease',
                    backgroundColor: msg.sender === socket?.id ? '#0d9488' : '#115e59',
                    color: 'white',
                    borderBottomRightRadius: msg.sender === socket?.id ? 0 : '12px',
                    borderBottomLeftRadius: msg.sender === socket?.id ? '12px' : 0,
                    marginTop: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {msg.message}
                </div>
                {!msg.isSystem && (
                  <div style={{
                    fontSize: '12px',
                    color: '#5eead4',
                    marginTop: '4px',
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '16px',
          backgroundColor: '#0d9488',
          borderTop: '1px solid #0f766e',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              style={{
                flex: 1,
                backgroundColor: '#0d9488',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '9999px',
                outline: 'none',
                border: 'none',
                fontSize: '16px',
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
            />
            <button
              onClick={sendMessage}
              style={{
                backgroundColor: '#0d9488',
                color: 'white',
                padding: '12px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: input.trim() ? 1 : 0.5,
              }}
              onMouseEnter={(e) => input.trim() && (e.currentTarget.style.backgroundColor = '#0f766e')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0d9488')}
              onMouseDown={(e) => input.trim() && (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              disabled={!input.trim()}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

export default ChatBox;