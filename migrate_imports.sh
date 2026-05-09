#!/bin/bash

# Find all .ts and .tsx files in src
files=$(find src -name "*.ts" -o -name "*.tsx")

for file in $files; do
  # Check if file has firebase/firestore or firebase/auth imports
  if grep -q "from 'firebase/" "$file"; then
    echo "Processing $file ..."
    
    # Calculate relative path to src/lib/firebase
    depth=$(echo "$file" | tr -cd '/' | wc -c)
    replacement="../lib/firebase"
    if [ "$depth" -eq 1 ]; then replacement="./lib/firebase"; fi
    if [ "$depth" -eq 3 ]; then replacement="../../lib/firebase"; fi
    if [ "$depth" -eq 4 ]; then replacement="../../../lib/firebase"; fi

    # 1. Check if the file already imports from our custom lib
    if grep -q "from '$replacement'" "$file"; then
      # Complex case: both exist. We need to merge them.
      # A simple way is to delete the firebase imports and add them to the custom lib import.
      # But that's very hard with regex. 
      # Instead, we will just rename the firebase ones to something else and let it fail if we must, 
      # OR we just remove the custom lib line and convert firebase to custom lib.
      
      # Let's remove the line that imports db from the custom lib first
      sed -i "/from '$replacement'/d" "$file"
      # Then convert the firebase ones
      sed -i "s|from 'firebase/firestore'|from '$replacement'|g" "$file"
      sed -i "s|from 'firebase/auth'|from '$replacement'|g" "$file"
      sed -i "s|from 'firebase/storage'|from '$replacement'|g" "$file"
    else
      # Simple case: only firebase imports exist
      sed -i "s|from 'firebase/firestore'|from '$replacement'|g" "$file"
      sed -i "s|from 'firebase/auth'|from '$replacement'|g" "$file"
      sed -i "s|from 'firebase/storage'|from '$replacement'|g" "$file"
    fi
  fi
done
