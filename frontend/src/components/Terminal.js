import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { useDevice } from '../contexts/DeviceContext';

const Terminal = () => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [command, setCommand] = useState('');
  const { selectedDevice, executeCommand } = useDevice();

  useEffect(() => {
    // Initialize terminal
    if (terminalRef.current && !xtermRef.current) {
      // Create terminal instance
      xtermRef.current = new XTerm({
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#f0f0f0',
          cursor: '#f0f0f0',
          cursorAccent: '#1e1e1e',
          selection: 'rgba(255, 255, 255, 0.3)',
        },
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      });

      // Create fit addon
      fitAddonRef.current = new FitAddon();
      xtermRef.current.loadAddon(fitAddonRef.current);
      
      // Create web links addon
      const webLinksAddon = new WebLinksAddon();
      xtermRef.current.loadAddon(webLinksAddon);

      // Open terminal
      xtermRef.current.open(terminalRef.current);
      fitAddonRef.current.fit();

      // Set up prompt
      xtermRef.current.writeln('Mobile App Security Framework Terminal');
      xtermRef.current.writeln('-------------------------------------------');
      xtermRef.current.writeln('Type commands to execute on connected device.');
      xtermRef.current.writeln('');
      writePrompt();

      // Handle user input
      xtermRef.current.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        if (domEvent.keyCode === 13) { // Enter key
          xtermRef.current.writeln('');
          
          if (command.trim()) {
            handleCommand(command);
          } else {
            writePrompt();
          }
          
          setCommand('');
        } else if (domEvent.keyCode === 8) { // Backspace key
          if (command.length > 0) {
            xtermRef.current.write('\b \b');
            setCommand(command.substring(0, command.length - 1));
          }
        } else if (printable) {
          xtermRef.current.write(key);
          setCommand(command + key);
        }
      });

      // Handle resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (xtermRef.current) {
          xtermRef.current.dispose();
        }
      };
    }
  }, []);

  // Write command prompt
  const writePrompt = () => {
    const devicePrompt = selectedDevice ? selectedDevice : 'no-device';
    xtermRef.current.write(`masf@${devicePrompt}$ `);
  };

  // Handle command execution
  const handleCommand = async (cmd) => {
    if (!selectedDevice) {
      xtermRef.current.writeln('No device connected. Please connect a device first.');
      writePrompt();
      return;
    }

    try {
      // Execute command on device
      const result = await executeCommand(selectedDevice, cmd);
      
      if (result.stdout) {
        xtermRef.current.writeln(result.stdout);
      }
      
      if (result.stderr) {
        xtermRef.current.writeln(`\x1b[31m${result.stderr}\x1b[0m`);
      }
      
      if (result.exitCode !== 0) {
        xtermRef.current.writeln(`\x1b[31mCommand exited with code ${result.exitCode}\x1b[0m`);
      }
    } catch (error) {
      xtermRef.current.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
    }
    
    writePrompt();
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      <Box sx={{ p: 1, borderBottom: '1px solid #444' }}>
        <Typography variant="subtitle2">Terminal</Typography>
      </Box>
      <Box 
        ref={terminalRef} 
        className="terminal-container" 
        sx={{ 
          flex: 1,
          p: 1,
          backgroundColor: '#1e1e1e' 
        }} 
      />
    </Paper>
  );
};

export default Terminal; 