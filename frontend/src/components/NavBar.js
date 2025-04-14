import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Chip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { useSocket } from '../contexts/SocketContext';

const NavBar = () => {
  const { connected } = useSocket();

  return (
    <AppBar position="sticky">
      <Toolbar>
        <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
          <SecurityIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Trishul - Mobile App Security Framework
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            icon={<PhoneAndroidIcon />}
            label={connected ? "Server Connected" : "Server Disconnected"}
            color={connected ? "success" : "error"}
            variant="outlined"
            sx={{ marginRight: 2, color: 'white' }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar; 