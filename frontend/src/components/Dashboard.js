import React from 'react';
import { Box, Grid, Container } from '@mui/material';
import DeviceManager from './DeviceManager';
import Terminal from './Terminal';
import ScriptEditor from './ScriptEditor';
import LogOutput from './LogOutput';

const Dashboard = () => {
  return (
    <Container maxWidth={false} sx={{ mt: 3, mb: 3 }}>
      <Grid container spacing={2} sx={{ height: 'calc(100vh - 130px)' }}>
        {/* Left Column - Device Manager */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <DeviceManager />
        </Grid>

        {/* Right Column - Script Editor, Terminal, and Logs */}
        <Grid item xs={12} md={9} sx={{ height: '100%' }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {/* Script Editor - Top */}
            <Grid item xs={12} sx={{ height: '40%' }}>
              <ScriptEditor />
            </Grid>

            {/* Bottom Row - Terminal and Logs */}
            <Grid item xs={12} sx={{ height: '60%' }}>
              <Grid container spacing={2} sx={{ height: '100%' }}>
                {/* Terminal - Bottom Left */}
                <Grid item xs={12} md={6} sx={{ height: '100%' }}>
                  <Terminal />
                </Grid>

                {/* Logs - Bottom Right */}
                <Grid item xs={12} md={6} sx={{ height: '100%' }}>
                  <LogOutput />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 