import React, { useEffect, useRef, useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  ToggleButtonGroup, 
  ToggleButton,
  Tooltip,
  Chip
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CodeIcon from '@mui/icons-material/Code';
import TerminalIcon from '@mui/icons-material/Terminal';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useSocket } from '../contexts/SocketContext';

const LogOutput = () => {
  const { messages, clearMessages } = useSocket();
  const logContainerRef = useRef(null);
  const [filters, setFilters] = useState(['status', 'frida', 'error', 'console']);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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
  const getMessageColor = (message) => {
    if (message.type === 'error') {
      return '#ff5252';
    }
    
    if (message.type === 'console') {
      switch (message.subtype) {
        case 'error':
          return '#ff5252';
        case 'warn':
          return '#ffb74d';
        case 'debug':
          return '#9e9e9e';
        case 'info':
          return '#4fc3f7';
        default:
          return '#b2ff59'; // Regular log
      }
    }
    
    if (message.type === 'frida') {
      return '#64b5f6';
    }
    
    if (message.type === 'status') {
      return '#4caf50';
    }
    
    return 'inherit';
  };

  // Function to get icon for message type
  const getMessageIcon = (message) => {
    if (message.type === 'error') {
      return <ErrorIcon fontSize="small" sx={{ color: '#ff5252', mr: 1 }} />;
    }
    
    if (message.type === 'console') {
      return <TerminalIcon fontSize="small" sx={{ color: getMessageColor(message), mr: 1 }} />;
    }
    
    if (message.type === 'frida') {
      return <CodeIcon fontSize="small" sx={{ color: '#64b5f6', mr: 1 }} />;
    }
    
    if (message.type === 'status') {
      return <InfoIcon fontSize="small" sx={{ color: '#4caf50', mr: 1 }} />;
    }
    
    return null;
  };

  // Function to handle filter changes
  const handleFilterChange = (event, newFilters) => {
    // Don't allow empty filters
    if (newFilters.length) {
      setFilters(newFilters);
    }
  };
  
  // Function to format JSON or code blocks better
  const formatCodeBlock = (text) => {
    if (!text) return '';
    
    // If it looks like JSON with proper indentation, display it in a code block
    if (text.includes('{\n') || text.includes('[\n')) {
      return (
        <Box
          component="pre"
          sx={{
            margin: 0,
            padding: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 1,
            overflowX: 'auto',
            whiteSpace: 'pre',
            fontSize: '0.85rem',
          }}
        >
          {text}
        </Box>
      );
    }
    
    // Otherwise just return the text with pre-wrap styling
    return (
      <Box
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {text}
      </Box>
    );
  };

  // Filter messages based on selected filters
  const filteredMessages = messages.filter(message => 
    filters.includes(message.type)
  );

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
        <Typography variant="subtitle2">
          Log Output
          {messages.length > 0 && (
            <Chip 
              size="small" 
              label={messages.length} 
              sx={{ ml: 1, fontSize: '0.7rem', height: 20 }} 
            />
          )}
        </Typography>
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Filter logs">
            <IconButton size="small" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={clearMessages}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      
      {/* Filter options */}
      {showFilterMenu && (
        <Box sx={{ p: 1, borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ToggleButtonGroup
            size="small"
            value={filters}
            onChange={handleFilterChange}
            aria-label="log filters"
            sx={{ '& .MuiToggleButton-root': { padding: '2px 8px', fontSize: '0.7rem' } }}
          >
            <ToggleButton value="console" aria-label="console logs">
              <TerminalIcon fontSize="small" sx={{ mr: 0.5 }} />
              Console
            </ToggleButton>
            <ToggleButton value="frida" aria-label="frida messages">
              <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
              Frida
            </ToggleButton>
            <ToggleButton value="status" aria-label="status messages">
              <InfoIcon fontSize="small" sx={{ mr: 0.5 }} />
              Status
            </ToggleButton>
            <ToggleButton value="error" aria-label="error messages">
              <ErrorIcon fontSize="small" sx={{ mr: 0.5 }} />
              Errors
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      
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
        {filteredMessages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No logs to display. Connect to a device and hook an app to see output here.
          </Typography>
        ) : (
          filteredMessages.map((message, index) => (
            <Box 
              key={index} 
              sx={{ 
                mb: 1, 
                pb: 1,
                borderBottom: index < filteredMessages.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                {getMessageIcon(message)}
                <Box sx={{ flex: 1 }}>
                  <Box
                    component="span"
                    sx={{ 
                      color: '#aaa', 
                      mr: 1, 
                      fontSize: '0.75rem',
                      fontStyle: 'italic'
                    }}
                  >
                    [{formatTimestamp(message.timestamp)}]
                    {message.type === 'console' && (
                      <Typography 
                        component="span" 
                        variant="caption" 
                        sx={{ 
                          ml: 1,
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          color: getMessageColor(message)
                        }}
                      >
                        console.{message.subtype}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box
                    component="div"
                    sx={{
                      mt: 0.5,
                      color: getMessageColor(message)
                    }}
                  >
                    {formatCodeBlock(message.text)}
                  </Box>
                  
                  {message.deviceId && (
                    <Box 
                      component="div" 
                      sx={{ 
                        mt: 0.5,
                        fontSize: '0.75rem', 
                        color: '#888',
                        fontStyle: 'italic' 
                      }}
                    >
                      Device: {message.deviceId}
                      {message.appId && ` | App: ${message.appId}`}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default LogOutput; 