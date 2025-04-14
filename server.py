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
connected_devices = {}
frida_sessions = {}
running_scripts = {}

# Routes for static frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

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
                    devices.append({
                        'id': device_id,
                        'status': status,
                        'connected': device_id in connected_devices
                    })
        
        return jsonify(devices)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/connect', methods=['POST'])
def connect_device():
    data = request.json
    device_id = data.get('deviceId')
    
    if not device_id:
        return jsonify({'error': 'Device ID is required'}), 400
    
    try:
        # Check if frida-server is running
        result = subprocess.run(
            [ADB_PATH, '-s', device_id, 'shell', 'ps | grep frida-server'],
            capture_output=True, text=True
        )
        
        if 'frida-server' not in result.stdout:
            # Start frida-server
            socketio.emit('status', {'message': f'Starting frida-server on {device_id}'})
            subprocess.run(
                [ADB_PATH, '-s', device_id, 'shell', f'su -c "{FRIDA_SERVER_PATH} &"'],
                capture_output=True, text=True
            )
            time.sleep(2)  # Wait for server to start
        
        # Connect to the device
        device = frida.get_device(device_id)
        connected_devices[device_id] = device
        socketio.emit('status', {'message': f'Connected to {device_id}'})
        
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
        if device_id in frida_sessions:
            frida_sessions[device_id].detach()
            del frida_sessions[device_id]
        
        if device_id in connected_devices:
            del connected_devices[device_id]
        
        return jsonify({'status': 'disconnected', 'deviceId': device_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        
        # Define message callback
        def on_message(message, data):
            if message['type'] == 'send':
                socketio.emit('frida_message', {
                    'deviceId': device_id,
                    'appId': app_id,
                    'payload': message['payload']
                })
            elif message['type'] == 'error':
                socketio.emit('frida_error', {
                    'deviceId': device_id,
                    'appId': app_id,
                    'error': message['description']
                })
        
        # Attach to the process
        session = device.attach(app_id)
        frida_sessions[device_id] = session
        
        # Create and load script
        script = session.create_script(script_content)
        script.on('message', on_message)
        script.load()
        running_scripts[f"{device_id}_{app_id}"] = script
        
        return jsonify({'status': 'hooked', 'deviceId': device_id, 'appId': app_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/unhook', methods=['POST'])
def unhook_app():
    data = request.json
    device_id = data.get('deviceId')
    app_id = data.get('appId')
    
    if not all([device_id, app_id]):
        return jsonify({'error': 'Device ID and App ID are required'}), 400
    
    script_key = f"{device_id}_{app_id}"
    if script_key in running_scripts:
        try:
            running_scripts[script_key].unload()
            del running_scripts[script_key]
            return jsonify({'status': 'unhooked', 'deviceId': device_id, 'appId': app_id})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'No hook found for this app'}), 404

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