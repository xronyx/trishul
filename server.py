import os
import json
import subprocess
import threading
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
import frida
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
PORT = int(os.getenv('PORT', 5000))
HOST = os.getenv('HOST', '0.0.0.0')
DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'
ADB_PATH = os.getenv('ADB_PATH', 'adb')
FRIDA_SERVER_PATH = os.getenv('FRIDA_SERVER_PATH', '/data/local/tmp/frida-server')
LOGS_DIR = os.getenv('LOGS_DIR', './logs')
UPLOADS_DIR = os.getenv('UPLOADS_DIR', './uploads')
SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')

# Ensure directories exist
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = Flask(__name__, static_folder='frontend/build')
app.config['SECRET_KEY'] = SECRET_KEY
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Device management
connected_devices = {}  # device_id -> frida.core.Device
frida_sessions = {}     # {device_id: {app_id: session}} - nested dict for multiple apps per device
running_scripts = {}    # {device_id: {app_id: script}} - nested dict for multiple scripts per device
device_status = {}      # For tracking each device's status separately

# Routes for static frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Helper function to verify package exists and get the correct case
def verify_package_name(device_id, package_name):
    try:
        device = connected_devices.get(device_id)
        if not device:
            return None, "Device not connected"
        
        # Get a list of all installed apps from the device
        apps = device.enumerate_applications()
        
        # First check for exact match
        for app in apps:
            if app.identifier.lower() == package_name.lower():
                return app.identifier, None  # Return the correct case
        
        # If no exact match, check for partial matches
        partial_matches = []
        for app in apps:
            if package_name.lower() in app.identifier.lower():
                partial_matches.append({
                    'name': app.name,
                    'identifier': app.identifier
                })
        
        if partial_matches:
            return None, partial_matches
        
        return None, "Package not found"
    except Exception as e:
        return None, str(e)

# API routes
@app.route('/api/devices', methods=['GET'])
def get_devices():
    try:
        result = subprocess.run([ADB_PATH, 'devices'], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')[1:]
        devices = []
        
        for line in lines:
            if line.strip():
                parts = line.split('\t')
                if len(parts) >= 2:
                    device_id = parts[0].strip()
                    status = parts[1].strip()
                    
                    # Get additional device info for connected devices
                    device_info = {
                        'id': device_id,
                        'status': status,
                        'connected': device_id in connected_devices,
                        'apps': [],
                        'frida_server': False
                    }
                    
                    # If device is connected to our app, get more info
                    if device_id in connected_devices:
                        # Check how many apps are hooked
                        if device_id in frida_sessions:
                            device_info['apps'] = list(frida_sessions[device_id].keys())
                        
                        # Check if frida-server is running
                        try:
                            frida_check = subprocess.run(
                                [ADB_PATH, '-s', device_id, 'shell', 'ps | grep frida-server'],
                                capture_output=True, text=True
                            )
                            device_info['frida_server'] = 'frida-server' in frida_check.stdout
                        except:
                            pass
                        
                        # Add device status info if available
                        if device_id in device_status:
                            device_info.update(device_status[device_id])
                    
                    devices.append(device_info)
        
        return jsonify(devices)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search-apps', methods=['GET'])
def search_apps():
    device_id = request.args.get('deviceId')
    query = request.args.get('query', '').lower()
    
    if not device_id:
        return jsonify({'error': 'Device ID is required'}), 400
    
    if device_id not in connected_devices:
        return jsonify({'error': 'Device not connected'}), 400
    
    try:
        device = connected_devices[device_id]
        apps = device.enumerate_applications()
        
        if query:
            # Filter apps based on the search query
            filtered_apps = [
                {'name': app.name, 'identifier': app.identifier} 
                for app in apps 
                if query in app.name.lower() or query in app.identifier.lower()
            ]
        else:
            filtered_apps = [{'name': app.name, 'identifier': app.identifier} for app in apps]
        
        # Sort by relevance (exact matches first, then by name)
        filtered_apps.sort(key=lambda x: (
            0 if query == x['identifier'].lower() else 
            1 if query == x['name'].lower() else
            2 if query in x['identifier'].lower() else 
            3
        ))
        
        return jsonify(filtered_apps)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/connect', methods=['POST'])
def connect_device():
    data = request.json
    device_id = data.get('deviceId')
    
    if not device_id:
        return jsonify({'error': 'Device ID is required'}), 400
    
    try:
        # Check if frida-server exists on the device
        check_frida = subprocess.run(
            [ADB_PATH, '-s', device_id, 'shell', f'ls {FRIDA_SERVER_PATH}'],
            capture_output=True, text=True
        )
        
        frida_server_exists = 'No such file' not in check_frida.stderr and 'not found' not in check_frida.stderr
        
        if not frida_server_exists:
            socketio.emit('status', {'message': f'Frida server not found on device. Checking device architecture...'})
            
            # Get device architecture
            arch_result = subprocess.run(
                [ADB_PATH, '-s', device_id, 'shell', 'getprop ro.product.cpu.abi'],
                capture_output=True, text=True
            )
            
            device_arch = arch_result.stdout.strip()
            socketio.emit('status', {'message': f'Detected device architecture: {device_arch}'})
            
            # Map device architecture to frida-server binary
            arch_map = {
                'armeabi-v7a': 'frida-server-16.2.2-android-arm',
                'armeabi': 'frida-server-16.2.2-android-arm',
                'arm64-v8a': 'frida-server-16.2.2-android-arm64',
                'x86': 'frida-server-16.2.2-android-x86',
                'x86_64': 'frida-server-16.2.2-android-x86_64'
            }
            
            server_binary = arch_map.get(device_arch)
            
            if not server_binary:
                # Default to arm64 if architecture detection fails
                socketio.emit('status', {'message': f'Unknown architecture: {device_arch}, defaulting to arm64'})
                server_binary = 'frida-server-16.2.2-android-arm64'
            
            # Check if the binary exists in the bin directory
            binary_path = os.path.join('bin', server_binary)
            if os.path.exists(binary_path):
                socketio.emit('status', {'message': f'Found matching Frida server binary: {server_binary}'})
                
                # Push to device
                push_result = subprocess.run(
                    [ADB_PATH, '-s', device_id, 'push', binary_path, FRIDA_SERVER_PATH],
                    capture_output=True, text=True
                )
                
                if push_result.returncode == 0:
                    socketio.emit('status', {'message': f'Successfully pushed Frida server to device.'})
                    
                    # Set executable permissions - try different methods
                    chmod_result = subprocess.run(
                        [ADB_PATH, '-s', device_id, 'shell', f'su -c "chmod 755 {FRIDA_SERVER_PATH}"'],
                        capture_output=True, text=True
                    )
                    
                    # If standard su -c fails, try su 0 method
                    if "invalid" in chmod_result.stderr or "not found" in chmod_result.stderr:
                        socketio.emit('status', {'message': f'First chmod method failed, trying alternative...'})
                        chmod_result = subprocess.run(
                            [ADB_PATH, '-s', device_id, 'shell', f'su 0 chmod 755 {FRIDA_SERVER_PATH}'],
                            capture_output=True, text=True
                        )
                    
                    # If that also fails, try direct chmod (for pre-rooted emulators)
                    if "invalid" in chmod_result.stderr or "not found" in chmod_result.stderr:
                        socketio.emit('status', {'message': f'Second chmod method failed, trying direct chmod...'})
                        chmod_result = subprocess.run(
                            [ADB_PATH, '-s', device_id, 'shell', f'chmod 755 {FRIDA_SERVER_PATH}'],
                            capture_output=True, text=True
                        )
                    
                    if chmod_result.returncode == 0:
                        socketio.emit('status', {'message': f'Set executable permissions on Frida server.'})
                    else:
                        socketio.emit('status', {'message': f'Warning: Could not set executable permissions: {chmod_result.stderr}'})
                else:
                    socketio.emit('status', {'message': f'Warning: Failed to push Frida server: {push_result.stderr}'})
                    return jsonify({'error': 'Failed to push Frida server to device'}), 500
            else:
                socketio.emit('status', {'message': f'Error: Required Frida server binary not found: {binary_path}'})
                return jsonify({'error': f'Required Frida server binary not found: {binary_path}'}), 500
        
        # Check if frida-server is running
        result = subprocess.run(
            [ADB_PATH, '-s', device_id, 'shell', 'ps | grep frida-server'],
            capture_output=True, text=True
        )
        
        if 'frida-server' not in result.stdout:
            # Start frida-server
            socketio.emit('status', {'message': f'Starting frida-server on {device_id}'})
            
            # Try different methods to start frida-server based on root access type
            # First attempt - standard su -c method
            start_result = subprocess.run(
                [ADB_PATH, '-s', device_id, 'shell', f'su -c "{FRIDA_SERVER_PATH} &"'],
                capture_output=True, text=True
            )
            
            # If that fails, try su 0 method (used in some emulators and devices)
            if "invalid" in start_result.stderr or "not found" in start_result.stderr:
                socketio.emit('status', {'message': f'First method failed, trying alternative root method...'})
                start_result = subprocess.run(
                    [ADB_PATH, '-s', device_id, 'shell', f'su 0 {FRIDA_SERVER_PATH} &'],
                    capture_output=True, text=True
                )
            
            # If that also fails, try without su (for pre-rooted emulators)
            if "invalid" in start_result.stderr or "not found" in start_result.stderr:
                socketio.emit('status', {'message': f'Second method failed, trying direct execution...'})
                start_result = subprocess.run(
                    [ADB_PATH, '-s', device_id, 'shell', f'{FRIDA_SERVER_PATH} &'],
                    capture_output=True, text=True
                )
            
            # Wait for server to start
            time.sleep(3)
            
            # Verify frida-server is running
            verify_result = subprocess.run(
                [ADB_PATH, '-s', device_id, 'shell', 'ps | grep frida-server'],
                capture_output=True, text=True
            )
            
            if 'frida-server' in verify_result.stdout:
                socketio.emit('status', {'message': f'Frida server started successfully'})
            else:
                socketio.emit('status', {'message': f'Warning: Could not verify if frida-server is running'})
        
        # Connect to the device
        device = frida.get_device(device_id)
        connected_devices[device_id] = device
        
        # Initialize the nested dictionaries for this device
        frida_sessions[device_id] = {}
        running_scripts[device_id] = {}
        device_status[device_id] = {'status': 'connected', 'last_connected': time.time()}
        
        socketio.emit('status', {'message': f'Connected to {device_id}'})
        
        # Check frida-server version
        try:
            # First attempt with standard su -c
            version_result = subprocess.run(
                [ADB_PATH, '-s', device_id, 'shell', f'su -c "{FRIDA_SERVER_PATH} --version"'],
                capture_output=True, text=True
            )
            
            # If that fails, try su 0 method
            if "invalid" in version_result.stderr or "not found" in version_result.stderr:
                version_result = subprocess.run(
                    [ADB_PATH, '-s', device_id, 'shell', f'su 0 {FRIDA_SERVER_PATH} --version'],
                    capture_output=True, text=True
                )
            
            # If that also fails, try direct execution
            if "invalid" in version_result.stderr or "not found" in version_result.stderr:
                version_result = subprocess.run(
                    [ADB_PATH, '-s', device_id, 'shell', f'{FRIDA_SERVER_PATH} --version'],
                    capture_output=True, text=True
                )
            
            server_version = version_result.stdout.strip()
            
            if server_version:
                if "16.2.2" in server_version:
                    socketio.emit('status', {'message': f'Frida server {server_version} detected (compatible)'})
                else:
                    socketio.emit('status', {'message': f'Warning: Frida server {server_version} detected. This app is designed for version 16.2.2'})
            else:
                socketio.emit('status', {'message': f'Warning: Could not determine Frida server version'})
        except Exception as e:
            # Just log it, don't block the connection
            socketio.emit('status', {'message': f'Could not verify Frida server version: {str(e)}'})
        
        return jsonify({'status': 'connected', 'deviceId': device_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/disconnect', methods=['POST'])
def disconnect_device():
    data = request.json
    device_id = data.get('deviceId')
    
    if not device_id:
        return jsonify({'error': 'Device ID is required'}), 400
    
    try:
        # Clean up all frida sessions for this device
        if device_id in frida_sessions:
            for app_id, session in frida_sessions[device_id].items():
                try:
                    session.detach()
                except Exception as e:
                    socketio.emit('status', {'message': f'[Device: {device_id}] Error detaching session for {app_id}: {str(e)}'})
            del frida_sessions[device_id]
        
        # Clean up all running scripts for this device
        if device_id in running_scripts:
            for app_id, script in running_scripts[device_id].items():
                try:
                    script.unload()
                except Exception as e:
                    socketio.emit('status', {'message': f'[Device: {device_id}] Error unloading script for {app_id}: {str(e)}'})
            del running_scripts[device_id]
        
        # Remove the device from connected_devices
        if device_id in connected_devices:
            del connected_devices[device_id]
        
        # Clean up any device status
        if device_id in device_status:
            del device_status[device_id]
        
        socketio.emit('status', {'message': f'Disconnected from {device_id}'})
        return jsonify({'status': 'disconnected', 'deviceId': device_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices/restart-adb', methods=['POST'])
def restart_adb_server():
    try:
        # Kill the ADB server
        socketio.emit('status', {'message': 'Restarting ADB server...'})
        kill_result = subprocess.run([ADB_PATH, 'kill-server'], capture_output=True, text=True)
        
        # Wait briefly
        time.sleep(1)
        
        # Start the ADB server
        start_result = subprocess.run([ADB_PATH, 'start-server'], capture_output=True, text=True)
        
        # Give it a moment to detect devices
        time.sleep(2)
        
        # Check for devices
        devices_result = subprocess.run([ADB_PATH, 'devices'], capture_output=True, text=True)
        devices = devices_result.stdout.strip().split('\n')[1:]
        device_count = sum(1 for line in devices if line.strip())
        
        socketio.emit('status', {
            'message': f'ADB server restarted. {device_count} device(s) detected.'
        })
        
        return jsonify({
            'success': True,
            'message': f'ADB server restarted. {device_count} device(s) detected.',
            'details': {
                'kill_output': kill_result.stdout if kill_result.stdout else kill_result.stderr,
                'start_output': start_result.stdout if start_result.stdout else start_result.stderr,
                'devices': devices_result.stdout
            }
        })
    except Exception as e:
        error_message = f'Error restarting ADB server: {str(e)}'
        socketio.emit('status', {'message': error_message, 'type': 'error'})
        return jsonify({'success': False, 'message': error_message}), 500

@app.route('/api/apps', methods=['GET'])
def get_apps():
    device_id = request.args.get('deviceId')
    
    if not device_id:
        return jsonify({'error': 'Device ID is required'}), 400
    
    if device_id not in connected_devices:
        return jsonify({'error': 'Device not connected'}), 400
    
    try:
        device = connected_devices[device_id]
        apps = device.enumerate_applications()
        app_list = [{'name': app.name, 'identifier': app.identifier} for app in apps]
        return jsonify(app_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/hook', methods=['POST'])
def hook_app():
    data = request.json
    device_id = data.get('deviceId')
    app_id = data.get('appId')
    script_content = data.get('script')
    
    if not all([device_id, app_id, script_content]):
        return jsonify({'error': 'Device ID, App ID, and script are required'}), 400
    
    if device_id not in connected_devices:
        return jsonify({'error': 'Device not connected'}), 400
    
    try:
        device = connected_devices[device_id]
        
        # Verify the package name and get the correct case if needed
        correct_app_id, result = verify_package_name(device_id, app_id)
        
        if not correct_app_id:
            if isinstance(result, list):
                # We found similar package names
                suggestions = [f"{app['name']} ({app['identifier']})" for app in result[:5]]
                return jsonify({
                    'error': f"Could not find exact package name '{app_id}'. Did you mean one of these?",
                    'suggestions': suggestions
                }), 400
            else:
                # No package found with that name
                return jsonify({'error': f"Package verification failed: {result}"}), 400
        
        # Use the correct case for the app_id
        app_id = correct_app_id
        
        # Modify the script to intercept console.log calls
        # This wrapper captures console.log, console.error, console.warn and sends them back as messages
        console_log_wrapper = """
// Intercept console.log and other console methods
(function() {
    const origConsole = {};
    ['log', 'warn', 'error', 'info', 'debug'].forEach(function(method) {
        origConsole[method] = console[method];
        console[method] = function() {
            // Convert arguments to array and stringify them
            const args = Array.prototype.slice.call(arguments).map(function(arg) {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            });
            
            // Join arguments with space
            const message = args.join(' ');
            
            // Send to our host
            send({
                type: 'console.' + method,
                message: message
            });
            
            // Call original method
            return origConsole[method].apply(console, arguments);
        };
    });
})();

// Log that script was successfully loaded
console.log('Frida script injected and console.log interceptor initialized');

// Original user script begins here
"""
        
        # Combine the wrapper with the original script
        enhanced_script = console_log_wrapper + script_content
        
        # Define message callback
        def on_message(message, data):
            if message['type'] == 'send':
                payload = message['payload']
                
                # Check if this is a console log message
                if isinstance(payload, dict) and 'type' in payload and payload['type'].startswith('console.'):
                    # Special handling for console messages
                    log_type = payload['type'].split('.')[1]  # 'log', 'error', etc.
                    message_text = payload['message']
                    
                    # Format message for the UI
                    socketio.emit('frida_console', {
                        'deviceId': device_id,
                        'appId': app_id,
                        'logType': log_type,
                        'message': message_text
                    })
                else:
                    # Regular Frida message
                    socketio.emit('frida_message', {
                        'deviceId': device_id,
                        'appId': app_id,
                        'payload': payload
                    })
            elif message['type'] == 'error':
                socketio.emit('frida_error', {
                    'deviceId': device_id,
                    'appId': app_id,
                    'error': message['description']
                })
        
        # Check if the application is running
        is_running = False
        try:
            # Try to get the process by name
            processes = device.enumerate_processes()
            for process in processes:
                if process.name == app_id:
                    is_running = True
                    break
        except Exception as e:
            socketio.emit('status', {'message': f'[Device: {device_id}] Error checking if app is running: {str(e)}'})
        
        # If not running, try to spawn it
        pid = None
        if not is_running:
            try:
                socketio.emit('status', {'message': f'[Device: {device_id}] App {app_id} is not running. Attempting to launch it...'})
                pid = device.spawn([app_id])
                socketio.emit('status', {'message': f'[Device: {device_id}] App launched with PID: {pid}'})
                time.sleep(1)  # Give it a moment to start up
            except Exception as e:
                socketio.emit('status', {'message': f'[Device: {device_id}] Failed to launch app: {str(e)}'})
                # Even if spawn fails, we'll still try to attach directly
        
        # Initialize nested dictionaries if they don't exist
        if device_id not in frida_sessions:
            frida_sessions[device_id] = {}
            
        if device_id not in running_scripts:
            running_scripts[device_id] = {}
            
        # Detach existing session if there's one for this app
        if app_id in frida_sessions[device_id]:
            try:
                frida_sessions[device_id][app_id].detach()
            except Exception as e:
                socketio.emit('status', {'message': f'[Device: {device_id}] Error detaching previous session: {str(e)}'})
        
        # Unload existing script if there's one for this app
        if app_id in running_scripts[device_id]:
            try:
                running_scripts[device_id][app_id].unload()
            except Exception as e:
                socketio.emit('status', {'message': f'[Device: {device_id}] Error unloading previous script: {str(e)}'})
        
        # Attach to the process
        try:
            if pid:
                # If we spawned it, attach to the PID
                session = device.attach(pid)
                device.resume(pid)  # Resume the process after attaching
            else:
                # Try to attach by name if we didn't spawn it
                session = device.attach(app_id)
            
            frida_sessions[device_id][app_id] = session
        except Exception as e:
            error_msg = str(e)
            if "unable to find process with name" in error_msg:
                # Try attaching by searching for a partial package name match or by PID
                found = False
                processes = device.enumerate_processes()
                
                # First try exact match on process name
                for process in processes:
                    if process.name == app_id:
                        socketio.emit('status', {'message': f'[Device: {device_id}] Found process: {process.name} (PID: {process.pid})'})
                        session = device.attach(process.pid)
                        frida_sessions[device_id][app_id] = session
                        found = True
                        break
                
                # If not found, try partial match
                if not found:
                    for process in processes:
                        if app_id in process.name:
                            socketio.emit('status', {'message': f'[Device: {device_id}] Found similar process: {process.name} (PID: {process.pid})'})
                            session = device.attach(process.pid)
                            frida_sessions[device_id][app_id] = session
                            found = True
                            break
                
                # If still not found, run an adb shell command to try to start the app and get its PID
                if not found:
                    try:
                        socketio.emit('status', {'message': f'[Device: {device_id}] Trying to start app via activity manager...'})
                        # Try to start the app using activity manager
                        cmd = f'monkey -p {app_id} -c android.intent.category.LAUNCHER 1'
                        adb_result = subprocess.run(
                            [ADB_PATH, '-s', device_id, 'shell', cmd],
                            capture_output=True, text=True
                        )
                        time.sleep(2)  # Wait for app to start
                        
                        # Get the PID after trying to start the app
                        pid_cmd = f'pidof {app_id}'
                        pid_result = subprocess.run(
                            [ADB_PATH, '-s', device_id, 'shell', pid_cmd],
                            capture_output=True, text=True
                        )
                        
                        if pid_result.stdout.strip():
                            try:
                                app_pid = int(pid_result.stdout.strip())
                                socketio.emit('status', {'message': f'[Device: {device_id}] App started with PID: {app_pid}'})
                                session = device.attach(app_pid)
                                frida_sessions[device_id][app_id] = session
                                found = True
                            except ValueError:
                                socketio.emit('status', {'message': f'[Device: {device_id}] Invalid PID: {pid_result.stdout.strip()}'})
                    except Exception as start_error:
                        socketio.emit('status', {'message': f'[Device: {device_id}] Error trying to start app: {str(start_error)}'})
                
                if not found:
                    return jsonify({
                        'error': f"Could not find process with name '{app_id}' on device '{device_id}'. Make sure the app is installed and the package name is correct. Try launching the app manually first."
                    }), 500
            else:
                return jsonify({'error': f"[Device: {device_id}] {error_msg}"}), 500
        
        # Create and load the script
        script = frida_sessions[device_id][app_id].create_script(enhanced_script)
        script.on('message', on_message)
        script.load()
        
        # Store the script
        running_scripts[device_id][app_id] = script
        
        socketio.emit('status', {'message': f'[Device: {device_id}] Successfully hooked into {app_id}'})
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': f"[Device: {device_id}] {str(e)}"}), 500

@app.route('/api/unhook', methods=['POST'])
def unhook_app():
    data = request.json
    device_id = data.get('deviceId')
    app_id = data.get('appId')
    
    if not all([device_id, app_id]):
        return jsonify({'error': 'Device ID and App ID are required'}), 400
    
    try:
        # Initialize dictionaries if they don't exist
        if device_id not in running_scripts:
            running_scripts[device_id] = {}
            
        if device_id not in frida_sessions:
            frida_sessions[device_id] = {}
            
        # Unload script if it exists
        if app_id in running_scripts[device_id]:
            try:
                running_scripts[device_id][app_id].unload()
                del running_scripts[device_id][app_id]
                socketio.emit('status', {'message': f'[Device: {device_id}] Script unloaded from {app_id}'})
            except Exception as e:
                socketio.emit('status', {'message': f'[Device: {device_id}] Error unloading script: {str(e)}'})
        
        # Detach session if it exists
        if app_id in frida_sessions[device_id]:
            try:
                frida_sessions[device_id][app_id].detach()
                del frida_sessions[device_id][app_id]
                socketio.emit('status', {'message': f'[Device: {device_id}] Detached from {app_id}'})
            except Exception as e:
                socketio.emit('status', {'message': f'[Device: {device_id}] Error detaching session: {str(e)}'})
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': f'[Device: {device_id}] {str(e)}'}), 500

@app.route('/api/execute', methods=['POST'])
def execute_command():
    data = request.json
    device_id = data.get('deviceId')
    command = data.get('command')
    
    if not all([device_id, command]):
        return jsonify({'error': 'Device ID and command are required'}), 400
    
    try:
        result = subprocess.run(
            [ADB_PATH, '-s', device_id, 'shell', command],
            capture_output=True, text=True
        )
        return jsonify({
            'stdout': result.stdout,
            'stderr': result.stderr,
            'exitCode': result.returncode
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload-frida', methods=['POST'])
def upload_frida_server():
    device_id = request.form.get('deviceId')
    
    if not device_id:
        return jsonify({'error': 'Device ID is required'}), 400
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        temp_path = os.path.join(UPLOADS_DIR, file.filename)
        file.save(temp_path)
        
        # Push to device
        subprocess.run(
            [ADB_PATH, '-s', device_id, 'push', temp_path, FRIDA_SERVER_PATH],
            check=True
        )
        
        # Set executable permissions
        subprocess.run(
            [ADB_PATH, '-s', device_id, 'shell', f'su -c "chmod 755 {FRIDA_SERVER_PATH}"'],
            check=True
        )
        
        os.remove(temp_path)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# WebSocket events
@socketio.on('connect')
def handle_connect():
    socketio.emit('status', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    pass

# Check for ADB
def check_prerequisites():
    try:
        subprocess.run([ADB_PATH, 'version'], capture_output=True, check=True)
        print(f"ADB is installed at {ADB_PATH}")
    except:
        print(f"ERROR: ADB is not installed or not found at {ADB_PATH}")
        print("Please install Android Debug Bridge (ADB) tools")

if __name__ == '__main__':
    check_prerequisites()
    print(f"Starting server on {HOST}:{PORT} (Debug: {DEBUG})")
    socketio.run(app, host=HOST, port=PORT, debug=DEBUG) 