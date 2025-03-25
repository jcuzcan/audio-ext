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
  } else if (message.command === "stopRecording") {
    stopRecording(sendResponse);
    return true;
  } else if (message.command === "download") {
    downloadRecording(sendResponse);
    return true;
  } else if (message.command === "getRecordingState") {
    sendRecordingState(sendResponse);
    return true;
  } else if (message.command === "recordingStopped") {
    handleRecordingStopped(message.audioChunks, sendResponse);
    return true;
  } else if (message.command === "recordingStarted") {
    chrome.storage.session.set({ workletNodeAvailable: message.workletNodeAvailable });
    sendResponse({ status: "Recording started" });
  }
});

// Function to handle when recording is stopped
function handleRecordingStopped(chunks, sendResponse) {
  if (!chunks || chunks.length === 0) {
    console.error("No audio chunks received.");
    sendResponse({ status: "No audio to save" });
    return;
  }

  console.log("Total chunks received:", chunks.length);
  audioChunks = chunks;
  sendResponse({ status: "Recording stopped", audioChunks: audioChunks.length });
}

// Function to get the current recording state from storage
function sendRecordingState(sendResponse) {
  chrome.storage.session.get(["isRecording"]).then((state) => {
    sendResponse({ isRecording: state.isRecording || false });
  });
}

// Start recording function
function startRecording(sendResponse) {
  chrome.storage.session.get(["isRecording"]).then((state) => {
    if (state.isRecording) {
      sendResponse({ status: "Already recording" });
      return;
    }

    chrome.storage.session.set({ isRecording: true });

    console.log("Starting tab audio recording...");
    audioChunks = []; // Clear previous audio chunks before starting

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let tabId = tabs[0]?.id;

      if (!tabId) {
        console.error("No active tab found.");
        sendResponse({ status: "No active tab" });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId },
          files: ["content.js"]
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error injecting content script:", chrome.runtime.lastError.message);
            sendResponse({ status: "Error injecting content script" });
            return;
          }
          chrome.tabs.sendMessage(tabId, { command: "startRecording" });
          sendResponse({ status: "Recording started" });
        }
      );
    });
  });
}

// Stop recording function
function stopRecording(sendResponse) {
  chrome.storage.session.get(["isRecording", "workletNodeAvailable"]).then((state) => {
    if (!state.isRecording) {
      sendResponse({ status: "No recording in progress" });
      return;
    }

    if (!state.workletNodeAvailable) {
      console.error("WorkletNode is not available.");
      sendResponse({ status: "WorkletNode not available" });
      return;
    }

    chrome.storage.session.set({ isRecording: false });

    console.log("Stopping recording...");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let tabId = tabs[0]?.id;

      if (!tabId) {
        console.error("No active tab found.");
        sendResponse({ status: "No active tab" });
        return;
      }

      chrome.tabs.sendMessage(tabId, { command: "stopRecording" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          console.error("Error stopping recording:", chrome.runtime.lastError?.message);
          sendResponse({ status: "Error stopping recording" });
          return;
        }

        console.log("Total chunks recorded:", response.audioChunks?.length || 0);
        if (!response.audioChunks) {
          console.error("No audio chunks received on stop.");
          sendResponse({ status: "No audio chunks received" });
          return;
        }

        audioChunks = response.audioChunks;
        sendResponse({ status: "Recording stopped", audioChunks: audioChunks.length });
      });
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
  let wavBlob = encodeWAV(audioChunks, 44100);
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
