#!/bin/bash
pip install onnxruntime optimum

python -c '
from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import QuantizationConfig

quantizer = ORTQuantizer.from_pretrained("Supertone/supertonic-3", export=True)
quantizer.quantize(save_dir="./public/models/supertonic/quantized", quantization_config=QuantizationConfig(is_static=False, format="int8"))
print("✅ Quantized to INT8")
'

echo "✅ Supertonic models downloaded. Consider using the quantized models for mobile devices."
