import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { useSocket } from '../contexts/SocketContext';

const LogOutput = () => {
  const { messages, clearMessages } = useSocket();
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom when messages are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to format message timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Function to get appropriate color for message type
  const getMessageColor = (type) => {
    switch (type) {
      case 'error':
        return '#ff5252';
      case 'frida':
        return '#64b5f6';
      case 'status':
        return '#4caf50';
      default:
        return 'inherit';
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 1, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2">Log Output</Typography>
        <IconButton size="small" onClick={clearMessages}>
          <ClearIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        ref={logContainerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 1,
          bgcolor: '#1a1a1a',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No logs to display. Connect to a device and hook an app to see output here.
          </Typography>
        ) : (
          messages.map((message, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Box
                component="span"
                sx={{ 
                  color: '#aaa', 
                  mr: 1, 
                  fontSize: '0.8rem' 
                }}
              >
                [{formatTimestamp(message.timestamp)}]
              </Box>
              <Box 
                component="span" 
                sx={{ 
                  color: getMessageColor(message.type),
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word' 
                }}
              >
                {message.text}
              </Box>
              {message.deviceId && (
                <Box component="div" sx={{ pl: 4, fontSize: '0.8rem', color: '#888' }}>
                  Device: {message.deviceId}
                  {message.appId && ` | App: ${message.appId}`}
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default LogOutput; 