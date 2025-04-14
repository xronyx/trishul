#!/usr/bin/env python3
"""
Simple utility to copy sample Frida scripts to the frontend for easy access
"""

import os
import json
import shutil
from pathlib import Path

def main():
    print("[*] Copying sample scripts to frontend...")
    
    # Ensure the frontend/public/samples directory exists
    samples_dir = Path("frontend/public/samples")
    samples_dir.mkdir(parents=True, exist_ok=True)
    
    # List all scripts in the samples directory
    source_dir = Path("samples")
    sample_files = list(source_dir.glob("*.js"))
    
    # Copy each script to the frontend samples directory
    for script_file in sample_files:
        destination = samples_dir / script_file.name
        shutil.copy2(script_file, destination)
        print(f"[+] Copied {script_file.name}")
    
    # Create a manifest file with metadata about each script
    manifest = []
    for script_file in sample_files:
        with open(script_file, "r") as f:
            content = f.read()
            
            # Extract description from the script (first comment block)
            description = ""
            if "/**" in content and "*/" in content:
                description = content.split("/**", 1)[1].split("*/", 1)[0].strip()
                description = "\n".join(line.strip(" *") for line in description.split("\n"))
            
            manifest.append({
                "name": script_file.stem,
                "filename": script_file.name,
                "description": description
            })
    
    # Write the manifest file
    manifest_path = samples_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"[+] Created script manifest with {len(manifest)} entries")
    print("[*] Done!")

if __name__ == "__main__":
    main() 