
import { Routes, Route } from 'react-router-dom';

import CallPage from './components/callpage';
import { SocketProvider } from './context/SocketContext';
import HomePage from './components/HomePage';

function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<HomePage/>} />
        <Route path="/call/:roomId" element={<CallPage />} />
      </Routes>
    </SocketProvider>
  );
}

export default App;
