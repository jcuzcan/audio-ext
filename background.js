// background.js

let audioContext = null;
let source = null;
let processor = null;
let recordedSamples = [];
let isRecording = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording()
      .then(() => {
        console.log("Recording started (background)");
        sendResponse({ status: "recordingStarted" });
      })
      .catch((err) => {
        console.error("Error starting recording:", err);
        sendResponse({ status: "error", message: err.message });
      });
    return true; // Keep message channel open for async response
  }

  else if (message.command === "stopRecording") {
    stopRecording()
      .then((wavData) => {
        // wavData is a Uint8Array of the WAV file bytes
        sendResponse({
          status: "recordingStopped",
          wavData: Array.from(wavData), // Convert to plain array for messaging
        });
      })
      .catch((err) => {
        console.error("Error stopping recording:", err);
        sendResponse({ status: "error", message: err.message });
      });
    return true; // Keep channel open
  }

  else if (message.command === "download") {
    // If the WAV data is sent from elsewhere (content script/popup),
    // we can download it here.
    if (!message.wavData) {
      sendResponse({ status: "error", message: "No WAV data to download" });
      return true;
    }
    const uint8Arr = new Uint8Array(message.wavData);
    const wavBlob = new Blob([uint8Arr], { type: "audio/wav" });
    const url = URL.createObjectURL(wavBlob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recording-${timestamp}.wav`;

    chrome.downloads.download({ url, filename, saveAs: true }, () => {
      sendResponse({ status: "Downloaded" });
    });
    return true;
  }
});

// ------------------------------------------------------------------
// Below are the helper functions for recording/encoding audio in WAV
// ------------------------------------------------------------------

function startRecording() {
  if (isRecording) {
    return Promise.reject(new Error("Already recording"));
  }
  isRecording = true;
  recordedSamples = [];

  return new Promise((resolve, reject) => {
    // Capture audio from the current active tab
    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (chrome.runtime.lastError || !stream) {
        reject(
          new Error(chrome.runtime.lastError?.message || "Failed to capture audio")
        );
        return;
      }

      audioContext = new AudioContext();
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        // Grab PCM data from the audio buffer (mono channel)
        const inputData = event.inputBuffer.getChannelData(0);
        // Store a copy so it won’t be overwritten
        recordedSamples.push(new Float32Array(inputData));
      };

      // Connect the nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      resolve();
    });
  });
}

function stopRecording() {
  if (!isRecording) {
    return Promise.reject(new Error("Not currently recording"));
  }
  isRecording = false;

  return new Promise(async (resolve, reject) => {
    try {
      // Disconnect and close the audio context
      if (source && processor) {
        source.disconnect(processor);
        processor.disconnect();
      }
      if (audioContext) {
        await audioContext.close();
      }

      // Flatten all recorded chunks into one Float32Array
      const totalLength = recordedSamples.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of recordedSamples) {
        combinedSamples.set(chunk, offset);
        offset += chunk.length;
      }

      // Encode raw samples to a 16-bit WAV file at 44100 Hz
      const wavBlob = encodeWAV(combinedSamples, 44100);

      // Convert Blob -> ArrayBuffer -> Uint8Array so we can send it back
      wavBlob.arrayBuffer().then((arrayBuf) => {
        resolve(new Uint8Array(arrayBuf));
      });
    } catch (err) {
      reject(err);
    }
  });
}

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
  view.setUint32(16, 16, true); // SubChunk1Size for PCM
  view.setUint16(20, 1, true);  // Audio format (1 = PCM)
  view.setUint16(22, 1, true);  // Channels = 1 (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate: sampleRate * channels * 16 bits/8
  view.setUint16(32, 2, true);  // Block align = channels * 16 bits/8
  view.setUint16(34, 16, true); // Bits per sample = 16
  writeString(view, 36, "data");
  view.setUint32(40, bufferLength * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < bufferLength; i++, offset += 2) {
    let sample = Math.max(-1, Math.min(1, samples[i]));
    // Convert float to 16-bit PCM
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }

  return new Blob([view], { type: "audio/wav" });
}
