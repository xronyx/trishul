import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(window.location.origin, {
      transports: ['websocket'],
    });

    // Set up event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('status', (data) => {
      addMessage({
        type: 'status',
        text: data.message,
        timestamp: new Date().toISOString(),
      });
    });

    newSocket.on('frida_message', (data) => {
      addMessage({
        type: 'frida',
        text: JSON.stringify(data.payload, null, 2),
        deviceId: data.deviceId,
        appId: data.appId,
        timestamp: new Date().toISOString(),
      });
    });
    
    // New handler for console.log messages from Frida
    newSocket.on('frida_console', (data) => {
      const logType = data.logType || 'log';
      const icon = getLogTypeIcon(logType);
      
      addMessage({
        type: 'console',
        subtype: logType,
        text: `${icon} ${data.message}`,
        raw: data.message,
        deviceId: data.deviceId,
        appId: data.appId,
        timestamp: new Date().toISOString(),
      });
    });

    newSocket.on('frida_error', (data) => {
      addMessage({
        type: 'error',
        text: data.error,
        deviceId: data.deviceId,
        appId: data.appId,
        timestamp: new Date().toISOString(),
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Helper function to get appropriate icon for log type
  const getLogTypeIcon = (logType) => {
    switch(logType) {
      case 'error':
        return '🔴';
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'debug':
        return '🔍';
      default:
        return '📋';
    }
  };

  const addMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        messages,
        clearMessages,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}; 