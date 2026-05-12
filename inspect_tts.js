const edgeTTS = require('@andresaya/edge-tts');
console.log(Object.keys(edgeTTS));
if (edgeTTS.EdgeTTS) {
    console.log(Object.keys(new edgeTTS.EdgeTTS()));
} else {
    console.log(Object.keys(edgeTTS));
}
