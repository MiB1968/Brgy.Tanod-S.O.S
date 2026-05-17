#!/bin/bash
set -e
mkdir -p public/models/supertonic

echo "Downloading Supertonic models..."
BASE="https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX/resolve/main"

wget -q --show-progress -O public/models/supertonic/duration_predictor.onnx "${BASE}/onnx/duration_predictor.onnx"
wget -q --show-progress -O public/models/supertonic/text_encoder.onnx "${BASE}/onnx/text_encoder.onnx"
wget -q --show-progress -O public/models/supertonic/vector_estimator.onnx "${BASE}/onnx/vector_estimator.onnx"
wget -q --show-progress -O public/models/supertonic/vocoder.onnx "${BASE}/onnx/vocoder.onnx"
wget -q --show-progress -O public/models/supertonic/tts.json "${BASE}/tts.json"
wget -q --show-progress -O public/models/supertonic/unicode_indexer.json "${BASE}/unicode_indexer.json"

echo "✅ Models downloaded. Now quantizing (optional but recommended for mobile)..."

# Quantization (requires Python)
if command -v python &> /dev/null; then
  python -c '
from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import QuantizationConfig
import os

models = ["duration_predictor", "text_encoder", "vector_estimator", "vocoder"]
for m in models:
    quantizer = ORTQuantizer.from_pretrained("onnx-community/Supertonic-TTS-2-ONNX", subfolder="onnx", file_name=f"{m}.onnx")
    qconfig = QuantizationConfig(quantization_approach="dynamic", operators_to_quantize=["MatMul", "Add"])
    quantizer.quantize(save_dir="public/models/supertonic/quantized", quantization_config=qconfig)
print("Quantized models ready!")
'
fi

echo "Setup complete! Use /models/supertonic or /quantized folder."
