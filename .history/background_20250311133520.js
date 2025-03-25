let isRecording = false;
let audioChunks = [];

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

// Listener for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message.command);

  if (message.command === "startRecording") {
    startRecording(sendResponse);
    return true; // Keeps the message channel open for async response
  }

  else if (message.command === "stopRecording") {
    stopRecording(sendResponse);
    return true;
  }

  else if (message.command === "download") {
    downloadRecording(sendResponse);
    return true;
  }

  else if (message.command === "getRecordingState") {
    sendRecordingState(sendResponse);
    return true;
  }
});

// Function to get the current recording state from storage
function sendRecordingState(sendResponse) {
  chrome.storage.local.get("isRecording", (state) => {
    isRecording = state.isRecording || false; // If no state is found, default to false
    sendResponse({ isRecording });
  });
}

// Start recording function
function startRecording(sendResponse) {
  if (isRecording) {
    sendResponse({ status: "Already recording" });
    return;
  }

  isRecording = true;
  chrome.storage.local.set({ isRecording: true });

  console.log("Starting tab audio recording...");

  // Grab the tab's audio context and media element
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let tabId = tabs[0].id;

    // We need to inject a script that can access the tab's audio element
    chrome.tabs.executeScript(tabId, { file: 'content.js' }, async () => {
      // Send a message to content script to start recording
      chrome.tabs.sendMessage(tabId, { command: "startRecording" });
    });

    sendResponse({ status: "Recording started" });
  });
}

// Stop recording function
function stopRecording(sendResponse) {
  if (!isRecording) {
    sendResponse({ status: "No recording in progress" });
    return;
  }

  isRecording = false;
  chrome.storage.local.set({ isRecording: false });

  console.log("Stopping recording...");

  // Send stop message to content script to stop recording
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let tabId = tabs[0].id;

    chrome.tabs.sendMessage(tabId, { command: "stopRecording" }, (response) => {
      console.log("Total chunks recorded:", response.audioChunks.length);
      audioChunks = response.audioChunks; // Collect audio chunks from content script
      sendResponse({ status: "Recording stopped", audioChunks: audioChunks.length });
    });
  });
}

// Download function
function downloadRecording(sendResponse) {
  if (audioChunks.length === 0) {
    console.error("No recorded audio found.");
    sendResponse({ status: "No audio to download" });
    return;
  }

  console.log("Encoding audio...");

  // Convert audio chunks to WAV
  let wavBlob = encodeWAV(audioChunks, 44100); // assuming sampleRate is 44100, adjust if needed
  let url = URL.createObjectURL(wavBlob);
  let timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  let filename = `recording-${timestamp}.wav`;

  console.log("Downloading file:", filename);
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });

  sendResponse({ status: "Downloaded" });
}

// Encode recorded PCM data to WAV format
function encodeWAV(audioChunks, sampleRate) {
  let bufferLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
  let view = new DataView(wavBuffer);
  
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + bufferLength * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, bufferLength * 2, true);

  let offset = 44;
  audioChunks.forEach(chunk => {
    for (let i = 0; i < chunk.length; i++, offset += 2) {
      let sample = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }
  });

  return new Blob([view], { type: "audio/wav" });
}
