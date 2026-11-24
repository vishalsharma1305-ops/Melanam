
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import image1 from '../assets/5395173.jpg'
function HomePage() {
  const [roomId, setRoomId] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const joinRoom = () => {
    if (roomId.trim()) navigate(`/call/${roomId}`);
  };

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    navigate(`/call/${newRoomId}`);
  };

  return (
    <div className="min-h-screenbg-white flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Visual asset */}
        <div className={`hidden lg:block transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          <div className="relative">
            {/* Abstract shapes */}
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-teal-400/90 blur-xl"></div>
            <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-teal-700/70 blur-xl"></div>
            
            {/* Main illustration */}
            <div className="relative z-10">
              <img 
                src={image1}
                alt="Video call illustration"
                className="w-full h-auto rounded-full max-w-xl"
              />
              
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">Melanam</h1>
              <p className="text-blue-100">Simple, secure video calls</p>
            </div>

            {/* Form */}
            <div className="p-8">
              {/* Join Room */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Join a room</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter room ID"
                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                  />
                  <svg 
                    className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={joinRoom}
                  className="w-full mt-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Join Now
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="mx-4 text-gray-400 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Create Room */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Start new meeting</h2>
                <button
                  onClick={createRoom}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-blue-300 hover:to-indigo-400 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Create Room
                </button>
              </div>
            </div>

            {/* Footer */}
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;