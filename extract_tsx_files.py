#!/usr/bin/env python3
"""
Script to extract all .tsx files from the src directory and combine them into a single text file.
Each file's content is prefixed with its full file path for easy reference.
"""

import os
import glob
from pathlib import Path

def extract_tsx_files():
    """Extract all .tsx files from src directory and write to combined file."""
    
    # Get the current directory (should be the frontendV4 folder)
    current_dir = Path.cwd()
    src_dir = current_dir / "src"
    
    # Check if src directory exists
    if not src_dir.exists():
        print(f"Error: src directory not found at {src_dir}")
        print(f"Current directory: {current_dir}")
        print("Make sure you're running this script from the frontendV4 folder.")
        return
    
    # Find all .tsx files recursively in src directory
    tsx_files = list(src_dir.glob("**/*.tsx"))
    
    if not tsx_files:
        print("No .tsx files found in src directory.")
        return
    
    print(f"Found {len(tsx_files)} .tsx files")
    
    # Output file
    output_file = current_dir / "all_tsx_files.txt"
    
    try:
        with open(output_file, 'w', encoding='utf-8') as outfile:
            outfile.write("=== EXTRACTED TSX FILES ===\n")
            outfile.write(f"Generated from: {current_dir}\n")
            outfile.write(f"Total files: {len(tsx_files)}\n")
            outfile.write("=" * 50 + "\n\n")
            
            for tsx_file in sorted(tsx_files):
                # Write file path as header
                relative_path = tsx_file.relative_to(current_dir)
                outfile.write(f"{'='*20} FILE: {relative_path} {'='*20}\n")
                
                try:
                    # Read and write file content
                    with open(tsx_file, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        outfile.write(content)
                        
                    # Add separator between files
                    outfile.write(f"\n\n{'='*60}\n\n")
                    
                    print(f"✓ Processed: {relative_path}")
                    
                except UnicodeDecodeError:
                    error_msg = f"Warning: Could not read {relative_path} (encoding issue)"
                    print(error_msg)
                    outfile.write(f"ERROR: {error_msg}\n\n")
                    
                except Exception as e:
                    error_msg = f"Warning: Error reading {relative_path}: {str(e)}"
                    print(error_msg)
                    outfile.write(f"ERROR: {error_msg}\n\n")
        
        print(f"\n✅ Successfully created: {output_file}")
        print(f"📄 Combined {len(tsx_files)} .tsx files into a single text file")
        print(f"📊 File size: {output_file.stat().st_size / 1024:.1f} KB")
        
    except Exception as e:
        print(f"❌ Error writing output file: {e}")

if __name__ == "__main__":
    print("🔍 Extracting all .tsx files from src directory...")
    extract_tsx_files()