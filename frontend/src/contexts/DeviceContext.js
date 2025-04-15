import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const DeviceContext = createContext();

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/devices');
      setDevices(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      setError('Failed to fetch devices');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const connectDevice = async (deviceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/connect', { deviceId });
      
      if (response.data.status === 'connected') {
        const updatedDevices = devices.map(device => 
          device.id === deviceId ? { ...device, connected: true } : device
        );
        setDevices(updatedDevices);
        setSelectedDevice(deviceId);
      }
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const disconnectDevice = async (deviceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/disconnect', { deviceId });
      
      if (response.data.status === 'disconnected') {
        const updatedDevices = devices.map(device => 
          device.id === deviceId ? { ...device, connected: false } : device
        );
        setDevices(updatedDevices);
        
        if (selectedDevice === deviceId) {
          setSelectedDevice(null);
          setApps([]);
          setSelectedApp(null);
        }
      }
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async (deviceId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/apps?deviceId=${deviceId}`);
      setApps(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const hookApp = async (deviceId, appId, script) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/hook', { deviceId, appId, script });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const unhookApp = async (deviceId, appId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/unhook', { deviceId, appId });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async (deviceId, command) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/execute', { deviceId, command });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadFridaServer = async (deviceId, file) => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('deviceId', deviceId);
      formData.append('file', file);
      
      const response = await axios.post('/api/upload-frida', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const restartAdbServer = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/devices/restart-adb');
      
      if (response.data.success) {
        // Fetch devices again after restarting ADB
        await fetchDevices();
        return { success: true, message: response.data.message || 'ADB server restarted successfully' };
      } else {
        setError(response.data.message || 'Failed to restart ADB server');
        return { success: false, message: response.data.message || 'Failed to restart ADB server' };
      }
    } catch (error) {
      console.error('Error restarting ADB server:', error);
      setError('Failed to restart ADB server');
      return { success: false, message: 'Failed to restart ADB server' };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DeviceContext.Provider
      value={{
        devices,
        selectedDevice,
        apps,
        selectedApp,
        loading,
        error,
        isLoading,
        fetchDevices,
        connectDevice,
        disconnectDevice,
        fetchApps,
        hookApp,
        unhookApp,
        executeCommand,
        uploadFridaServer,
        setSelectedDevice,
        setSelectedApp,
        restartAdbServer
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}; 