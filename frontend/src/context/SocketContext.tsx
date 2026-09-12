import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { useAuth } from './AuthContext';

const rawWsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
const WS_URL = rawWsUrl.replace(/\/+$/, '');

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket] Disconnected');
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
