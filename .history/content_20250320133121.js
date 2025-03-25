// content.js

let audioContext;
let source;
let processor;
let recordedSamples = [];
let isRecording = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "startRecording") {
    startRecording().then(() => {
      sendResponse({ status: "recordingStarted" });
    }).catch(err => {
      console.error(err);
      sendResponse({ status: "error", message: err.message });
    });
    return true;
  } else if (request.command === "stopRecording") {
    stopRecording().then((wavBlob) => {
      // Convert the Blob to an ArrayBuffer, then to an array of numbers for messaging.
      wavBlob.arrayBuffer().then((arrayBuf) => {
        const bufAsUint8 = new Uint8Array(arrayBuf);
        sendResponse({
          status: "recordingStopped",
          wavData: Array.from(bufAsUint8),
        });
      });
    }).catch(err => {
      console.error(err);
      sendResponse({ status: "error", message: err.message });
    });
    return true;
  }
});

async function startRecording() {
  if (isRecording) {
    throw new Error("Already recording");
  }
  isRecording = true;
  recordedSamples = [];
  
  // Capture the active tab's audio
  return new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ audio: true, video: false }, stream => {
      if (chrome.runtime.lastError || !stream) {
        reject(new Error(chrome.runtime.lastError?.message || "Failed to capture audio"));
        return;
      }
      
      audioContext = new AudioContext();
      source = audioContext.createMediaStreamSource(stream);
      // Use a buffer size such as 4096; 1 input channel and 1 output channel (mono)
      processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        // Copy samples so they won't be overwritten
        recordedSamples.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      // Connecting to destination keeps the processor alive
      processor.connect(audioContext.destination);
      resolve();
    });
  });
}

async function stopRecording() {
  if (!isRecording) {
    throw new Error("Not currently recording");
  }
  isRecording = false;
  
  // Disconnect audio nodes and close the AudioContext
  if (source && processor) {
    source.disconnect(processor);
    processor.disconnect();
  }
  if (audioContext) {
    await audioContext.close();
  }
  
  // Flatten the recorded samples
  let totalLength = recordedSamples.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedSamples = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of recordedSamples) {
    combinedSamples.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Encode the raw PCM samples to a 16-bit WAV Blob at 44100 Hz
  const wavBlob = encodeWAV(combinedSamples, 44100);
  return wavBlob;
}

// Encodes a Float32Array of samples to a 16-bit mono WAV file
function encodeWAV(samples, sampleRate) {
  const bufferLength = samples.length;
  const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
  const view = new DataView(wavBuffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + bufferLength * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);   // PCM format
  view.setUint16(22, 1, true);   // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, bufferLength * 2, true);

  let offsetView = 44;
  for (let i = 0; i < bufferLength; i++, offsetView += 2) {
    let sample = Math.max(-1, Math.min(1, samples[i]));
    // Scale float sample to 16-bit PCM
    view.setInt16(offsetView, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }
  
  return new Blob([view], { type: "audio/wav" });
}
