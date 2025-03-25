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
  } else if (message.command === "stopRecording") {
    stopRecording(sendResponse);
    return true;
  } else if (message.command === "download") {
    downloadRecording(sendResponse);
    return true;
  } else if (message.command === "getRecordingState") {
    sendRecordingState(sendResponse);
    return true;
  } else if (message.command === "audioCaptured") {
    handleCapturedAudio(message.audioUrl, sendResponse);
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

  sendResponse({ status: "Recording stopped" });
}

// Download function
function downloadRecording(sendResponse) {
  if (audioChunks.length === 0) {
    console.error("No recorded audio found.");
    sendResponse({ status: "No audio to download" });
    return;
  }

  console.log("Encoding audio...");
  let wavBlob = encodeWAV(audioChunks, 44100); // Sample rate should match
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

// Handle captured audio from content script
function handleCapturedAudio(audioUrl, sendResponse) {
  // Store the captured audio URL or process the chunks for later use
  audioChunks.push(audioUrl);
  console.log("Captured audio:", audioUrl);
  sendResponse({ status: "Audio captured" });
}
