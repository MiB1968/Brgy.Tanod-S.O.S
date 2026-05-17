import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('node_modules/onnxruntime-web/dist');
const destDir = path.resolve('public/onnx');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

fs.readdirSync(srcDir).forEach(file => {
    if (file.endsWith('.wasm')) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        console.log(`Copied ${file} to public/onnx/`);
    }
});
