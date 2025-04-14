import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import axios from 'axios';

// Basic template for Android
const ANDROID_BASIC_TEMPLATE = `/**
 * Basic Android Frida Script Template
 */
Java.perform(function() {
  console.log("[+] Script loaded successfully");
  
  // Example: Hook an Android class method
  /*
  var MainActivity = Java.use("com.example.app.MainActivity");
  
  MainActivity.onCreate.overload("android.os.Bundle").implementation = function(bundle) {
    console.log("[+] MainActivity.onCreate() called");
    
    // Call original implementation
    this.onCreate(bundle);
    
    console.log("[+] MainActivity.onCreate() completed");
  };
  */
});
`;

// Basic template for iOS
const IOS_BASIC_TEMPLATE = `/**
 * Basic iOS Frida Script Template
 */
if (ObjC.available) {
  console.log("[+] Script loaded successfully");
  
  // Example: Hook an iOS method
  /*
  var UIViewController = ObjC.classes.UIViewController;
  
  Interceptor.attach(UIViewController["- viewDidLoad"].implementation, {
    onEnter: function(args) {
      var self = ObjC.Object(args[0]);
      console.log("[+] UIViewController viewDidLoad called: " + self.$className);
    },
    onLeave: function(retval) {
      console.log("[+] UIViewController viewDidLoad completed");
    }
  });
  */
} else {
  console.log("[-] Objective-C Runtime is not available!");
}
`;

// Template for tracing function calls
const FUNCTION_TRACER_TEMPLATE = `/**
 * Function Call Tracer Template
 */
function traceMethod(targetClass, targetMethod) {
  var hook = Java.use(targetClass);
  
  // Check if method exists
  if (!hook[targetMethod]) {
    console.log("[-] Method " + targetMethod + " not found in class " + targetClass);
    return;
  }
  
  // Get method overloads
  var overloadCount = hook[targetMethod].overloads.length;
  console.log("[+] Found " + overloadCount + " overloads for " + targetClass + "." + targetMethod);
  
  // Hook each overload
  for (var i = 0; i < overloadCount; i++) {
    hook[targetMethod].overloads[i].implementation = function() {
      console.log("[+] " + targetClass + "." + targetMethod + " called");
      
      // Log arguments
      if (arguments.length > 0) {
        for (var j = 0; j < arguments.length; j++) {
          console.log("\\tArg[" + j + "]: " + arguments[j]);
        }
      }
      
      // Call original implementation and log result
      var retval = this[targetMethod].apply(this, arguments);
      console.log("[+] " + targetClass + "." + targetMethod + " returned: " + retval);
      return retval;
    };
  }
  
  console.log("[+] Tracing enabled for " + targetClass + "." + targetMethod);
}

Java.perform(function() {
  // Example usage
  // traceMethod("com.example.app.MainActivity", "onCreate");
});
`;

const TemplateMenu = ({ anchorEl, open, onClose, onSelectTemplate, onViewSamples }) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <MenuItem onClick={() => onSelectTemplate(ANDROID_BASIC_TEMPLATE)}>
        Android Basic Template
      </MenuItem>
      <MenuItem onClick={() => onSelectTemplate(IOS_BASIC_TEMPLATE)}>
        iOS Basic Template
      </MenuItem>
      <MenuItem onClick={() => onSelectTemplate(FUNCTION_TRACER_TEMPLATE)}>
        Function Tracer Template
      </MenuItem>
      <Divider />
      <MenuItem onClick={onViewSamples}>
        Browse Sample Scripts
      </MenuItem>
    </Menu>
  );
};

const SampleScriptsDialog = ({ open, onClose, onSelectSample }) => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  
  useEffect(() => {
    if (open) {
      fetchSamples();
    }
  }, [open]);
  
  const fetchSamples = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/samples/manifest.json');
      setSamples(response.data);
    } catch (err) {
      console.error('Error fetching samples:', err);
      setError('Failed to load sample scripts. Please check if they are properly installed.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectSample = async (sample) => {
    try {
      setSelectedSample(sample);
      const response = await axios.get(`/samples/${sample.filename}`);
      onSelectSample(response.data);
      onClose();
    } catch (err) {
      console.error('Error loading sample script:', err);
      setError(`Failed to load sample script: ${sample.filename}`);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Sample Frida Scripts</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography>Loading sample scripts...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <List>
            {samples.map((sample, index) => (
              <React.Fragment key={sample.name}>
                {index > 0 && <Divider />}
                <ListItem button onClick={() => handleSelectSample(sample)}>
                  <ListItemText
                    primary={sample.name}
                    secondary={
                      <Box component="span" sx={{ display: 'block', maxHeight: '60px', overflow: 'hidden' }}>
                        {sample.description}
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
            {samples.length === 0 && (
              <Typography>No sample scripts found.</Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export { TemplateMenu, SampleScriptsDialog, ANDROID_BASIC_TEMPLATE }; 