#!/bin/bash
# Download Supertonic 3 ONNX models (run once during setup)
# Requires: pip install huggingface_hub

echo "Downloading Supertonic 3 ONNX models..."

# Install huggingface_hub if huggingface-cli is not found
if ! command -v huggingface-cli &> /dev/null; then
    echo "huggingface-cli could not be found, installing via pip..."
    pip install huggingface_hub
fi

# Download to public directory for Web Workers
huggingface-cli download Supertone/supertonic \
  --local-dir public/models/supertonic \
  --include "*.onnx" "*.json" "preset/**"

# Copy the same models to server directory for Node.js usage
mkdir -p src/server/models/
cp -r public/models/supertonic src/server/models/

echo "Supertonic 3 ONNX models downloaded and copied successfully."
