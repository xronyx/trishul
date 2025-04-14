import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, IconButton } from '@mui/material';
import MonacoEditor from 'react-monaco-editor';
import '../setupMonaco'; // Import Monaco configuration with proper syntax highlighting
import { useDevice } from '../contexts/DeviceContext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import MenuIcon from '@mui/icons-material/Menu';
import { TemplateMenu, SampleScriptsDialog, ANDROID_BASIC_TEMPLATE } from './ScriptTemplates';

const ScriptEditor = () => {
  const [script, setScript] = useState(ANDROID_BASIC_TEMPLATE);
  const [isHooked, setIsHooked] = useState(false);
  const { selectedDevice, selectedApp, hookApp, unhookApp } = useDevice();
  const [editorMounted, setEditorMounted] = useState(false);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSamplesDialog, setShowSamplesDialog] = useState(false);
  
  const menuButtonRef = useRef(null);

  // Effect to ensure Monaco JavaScript language is registered
  useEffect(() => {
    // Clean up function
    return () => {
      setEditorMounted(false);
    };
  }, []);

  const handleEditorDidMount = (editor, monacoInstance) => {
    setEditorMounted(true);
    
    // Force refresh editor to ensure syntax highlighting appears
    setTimeout(() => {
      editor.layout();
      editor.focus();
      
      // Manually trigger syntax highlighting refresh
      const model = editor.getModel();
      if (model) {
        const value = model.getValue();
        model.setValue('');
        model.setValue(value);
      }
    }, 100);
  };

  const handleEditorChange = (value) => {
    setScript(value);
  };

  const handleRunScript = async () => {
    if (!selectedDevice || !selectedApp) {
      alert('Please select a device and an app first');
      return;
    }

    try {
      const result = await hookApp(selectedDevice, selectedApp, script);
      
      if (result && result.status === 'hooked') {
        setIsHooked(true);
      }
    } catch (error) {
      console.error('Error hooking app:', error);
      alert(`Error hooking app: ${error.message}`);
    }
  };

  const handleStopScript = async () => {
    if (!selectedDevice || !selectedApp) {
      return;
    }

    try {
      const result = await unhookApp(selectedDevice, selectedApp);
      
      if (result && result.status === 'unhooked') {
        setIsHooked(false);
      }
    } catch (error) {
      console.error('Error unhooking app:', error);
      alert(`Error unhooking app: ${error.message}`);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
  };

  const handleSaveScript = () => {
    const blob = new Blob([script], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frida-script.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadScript = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setScript(event.target.result);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  
  // Template menu handlers
  const handleOpenTemplateMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
    setShowTemplateMenu(true);
  };
  
  const handleCloseTemplateMenu = () => {
    setShowTemplateMenu(false);
  };
  
  const handleSelectTemplate = (templateCode) => {
    setScript(templateCode);
    handleCloseTemplateMenu();
  };
  
  const handleViewSamples = () => {
    setShowTemplateMenu(false);
    setShowSamplesDialog(true);
  };
  
  const handleCloseSamplesDialog = () => {
    setShowSamplesDialog(false);
  };
  
  const handleSelectSample = (sampleCode) => {
    setScript(sampleCode);
  };

  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: isHooked, // Make read-only when the script is running
    cursorStyle: 'line',
    automaticLayout: true,
    theme: 'vs-dark',
    minimap: {
      enabled: true
    },
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    scrollBeyondLastLine: false,
    formatOnType: true,
    formatOnPaste: true,
    codeLens: true,
    lineNumbersMinChars: 3,
    renderControlCharacters: true,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
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
      <Box sx={{ p: 1, borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2">Frida Script Editor</Typography>
          <IconButton 
            size="small" 
            onClick={handleOpenTemplateMenu}
            ref={menuButtonRef}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="contained" 
            size="small" 
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyScript}
          >
            Copy
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            startIcon={<SaveIcon />}
            onClick={handleSaveScript}
          >
            Save
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            startIcon={<FileOpenIcon />}
            onClick={handleLoadScript}
          >
            Load
          </Button>
          {isHooked ? (
            <Button 
              variant="contained" 
              color="error" 
              size="small" 
              startIcon={<StopIcon />}
              onClick={handleStopScript}
            >
              Unhook
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="success" 
              size="small" 
              startIcon={<PlayArrowIcon />}
              onClick={handleRunScript}
              disabled={!selectedDevice || !selectedApp}
            >
              Hook
            </Button>
          )}
        </Stack>
      </Box>
      <Box sx={{ 
        flex: 1, 
        overflow: 'hidden',
        position: 'relative',
        '& .monaco-editor': {
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      }}>
        <MonacoEditor
          width="100%"
          height="100%"
          language="javascript"
          theme="vs-dark"
          value={script}
          options={editorOptions}
          onChange={handleEditorChange}
          editorDidMount={handleEditorDidMount}
        />
      </Box>
      
      {/* Template Menu */}
      <TemplateMenu 
        anchorEl={menuAnchorEl}
        open={showTemplateMenu}
        onClose={handleCloseTemplateMenu}
        onSelectTemplate={handleSelectTemplate}
        onViewSamples={handleViewSamples}
      />
      
      {/* Sample Scripts Dialog */}
      <SampleScriptsDialog
        open={showSamplesDialog}
        onClose={handleCloseSamplesDialog}
        onSelectSample={handleSelectSample}
      />
    </Paper>
  );
};

export default ScriptEditor; 