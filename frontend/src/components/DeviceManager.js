import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UsbIcon from '@mui/icons-material/Usb';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import AppsIcon from '@mui/icons-material/Apps';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useDevice } from '../contexts/DeviceContext';

const DeviceManager = () => {
  const {
    devices,
    selectedDevice,
    apps,
    selectedApp,
    loading,
    isLoading,
    error,
    fetchDevices,
    connectDevice,
    disconnectDevice,
    fetchApps,
    setSelectedDevice,
    setSelectedApp,
    uploadFridaServer,
    restartAdbServer,
  } = useDevice();

  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    // Fetch devices on component mount
    fetchDevices();
  }, []);

  const handleDeviceSelect = async (deviceId) => {
    if (selectedDevice === deviceId) {
      // If already selected, disconnect
      await disconnectDevice(deviceId);
    } else {
      // Connect to the device
      const result = await connectDevice(deviceId);
      
      if (result && result.status === 'connected') {
        // Fetch apps for the connected device
        fetchApps(deviceId);
      }
    }
  };

  const handleRefreshDevices = () => {
    fetchDevices();
  };

  const handleAppSelect = (appId) => {
    setSelectedApp(appId);
  };

  const handleOpenUploadDialog = () => {
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    setSelectedFile(null);
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUploadFridaServer = async () => {
    if (!selectedDevice || !selectedFile) {
      return;
    }

    try {
      await uploadFridaServer(selectedDevice, selectedFile);
      handleCloseUploadDialog();
    } catch (error) {
      console.error('Error uploading frida-server:', error);
    }
  };

  const handleRestartAdb = async () => {
    try {
      setSnackbar({
        open: true,
        message: 'Restarting ADB server to detect USB devices...',
        severity: 'info'
      });
      
      const result = await restartAdbServer();
      
      if (result && result.success) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'success'
        });
        
        // Refresh the device list after restarting ADB
        fetchDevices();
      } else {
        setSnackbar({
          open: true,
          message: result?.message || 'Failed to restart ADB server',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error restarting ADB server:', error);
      setSnackbar({
        open: true,
        message: `Error restarting ADB server: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
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
        <Typography variant="subtitle2">Device Manager</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Upload Frida Server to device">
            <span>
              <Button
                variant="contained"
                size="small"
                onClick={handleOpenUploadDialog}
                disabled={!selectedDevice}
              >
                Upload Frida Server
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Refresh device list">
            <IconButton onClick={handleRefreshDevices} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2">
            Devices
          </Typography>
          <Tooltip title="Restart ADB server to detect USB devices and prompt for debugging permissions">
            <Button
              variant="outlined"
              size="small"
              startIcon={<UsbIcon />}
              onClick={handleRestartAdb}
              disabled={isLoading}
            >
              USB Debug Permission
            </Button>
          </Tooltip>
        </Box>
        
        {(loading || isLoading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {error && (
          <Typography color="error" variant="body2">
            Error: {error}
          </Typography>
        )}
        
        <List dense sx={{ bgcolor: 'background.paper' }}>
          {devices.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="No devices found" 
                secondary="Connect a device via USB and ensure USB debugging is enabled"
              />
            </ListItem>
          ) : (
            devices.map((device) => (
              <ListItem key={device.id} disablePadding>
                <ListItemButton
                  selected={selectedDevice === device.id}
                  onClick={() => handleDeviceSelect(device.id)}
                >
                  <ListItemIcon>
                    <PhoneAndroidIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={device.id} 
                    secondary={device.status} 
                  />
                  {device.connected && (
                    <Chip 
                      label="Connected" 
                      size="small" 
                      color="success" 
                      variant="outlined" 
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" gutterBottom>
          Applications
        </Typography>

        {selectedDevice ? (
          apps.length > 0 ? (
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Select an App</InputLabel>
              <Select
                value={selectedApp || ''}
                onChange={(e) => handleAppSelect(e.target.value)}
                label="Select an App"
              >
                {apps.map((app) => (
                  <MenuItem key={app.identifier} value={app.identifier}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AppsIcon fontSize="small" />
                      <Typography variant="body2">{app.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({app.identifier})
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No applications found or device not properly connected
            </Typography>
          )
        ) : (
          <Typography variant="body2" color="text.secondary">
            Connect to a device to view applications
          </Typography>
        )}
      </Box>

      {/* Upload Frida Server Dialog */}
      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog}>
        <DialogTitle>Upload Frida Server</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Upload the Frida server binary (version 16.2.2) compatible with your device. The server
            will be installed to /data/local/tmp/ and given executable permissions.
          </DialogContentText>
          <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1, mb: 2 }}>
            Note: This application requires Frida server version 16.2.2 specifically
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<FolderOpenIcon />}
            >
              Select Frida Server Binary
              <input
                type="file"
                hidden
                onChange={handleFileSelect}
              />
            </Button>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {selectedFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
          <Button
            onClick={handleUploadFridaServer}
            disabled={!selectedFile}
            variant="contained"
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default DeviceManager; 