// src/socket.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000') || import.meta.env.VITE_BACKEND_URL; // use your backend URL in prod

export default socket;
