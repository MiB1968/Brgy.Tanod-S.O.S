#!/bin/bash
set -e

echo "=== Supertonic Model Download + Quantization ==="

mkdir -p public/models/supertonic/quantized
cd public/models/supertonic

# Download official ONNX models
BASE_URL="https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX/resolve/main/onnx"

echo "Downloading models..."
for model in text_encoder duration_predictor vector_estimator vocoder; do
  wget -q --show-progress -O "${model}.onnx" "${BASE_URL}/${model}.onnx"
done

wget -q --show-progress -O tts.json "https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX/resolve/main/tts.json"
wget -q --show-progress -O unicode_indexer.json "https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX/resolve/main/unicode_indexer.json"

echo "Models downloaded. Starting quantization..."

# Quantization (requires Python + optimum)
python3 - <<EOF
from onnxruntime.quantization import quantize_dynamic, QuantType
import os

models = ["text_encoder", "duration_predictor", "vector_estimator", "vocoder"]
for m in models:
    input_path = f"{m}.onnx"
    output_path = f"quantized/{m}.onnx"
    if os.path.exists(input_path):
        print(f"Quantizing {m}...")
        quantize_dynamic(
            model_input=input_path,
            model_output=output_path,
            weight_type=QuantType.QInt8,
            optimize_model=True,
            per_channel=True
        )
        print(f"✅ {m} quantized successfully")
    else:
        print(f"⚠️ {m} not found")
print("Quantization finished!")
EOF

echo "Setup complete! Models ready in /models/supertonic/ and /quantized/"
