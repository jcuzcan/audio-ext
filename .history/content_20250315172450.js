let audioContext;
let workletNode;
let mediaElement;
let audioChunks = [];

// Start recording function
async function startRecording() {
  console.log("Starting to record tab audio...");

  mediaElement = document.querySelector('audio, video');

  if (!mediaElement) {
    console.error("No media element found to capture audio.");
    chrome.runtime.sendMessage({ command: "recordingError", message: "No media element found" });
    return;
  }

  audioContext = new AudioContext();

  try {
    await audioContext.audioWorklet.addModule('audio-processor.js'); // Load the custom AudioWorklet

    const source = audioContext.createMediaElementSource(mediaElement);

    workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

    // Listen for audio chunks from the processor
    workletNode.port.onmessage = (event) => {
      if (event.data && event.data.audioChunk) {
        audioChunks.push(event.data.audioChunk); // Add audio chunks to the array
        console.log("Received audio chunk:", event.data);
      }
    };

    source.connect(workletNode);
    workletNode.connect(audioContext.destination);

    console.log("Recording started...");
  } catch (error) {
    console.error("Error starting recording:", error);
    chrome.runtime.sendMessage({ command: "recordingError", message: "Error starting recording" });
  }
}

// Stop recording function
function stopRecording() {
  console.log("Stopping recording...");

  if (workletNode) {
    workletNode.port.postMessage({ command: "stop" });
  }

  if (audioContext) {
    audioContext.close();
  }

  // Send the recorded audio chunks back to the background script after stopping
  chrome.runtime.sendMessage({ command: "recordingStopped", audioChunks: audioChunks });
  console.log("Total chunks recorded:", audioChunks.length);
}

// Message listener for background.js commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
  } else if (message.command === "stopRecording") {
    stopRecording();
  }
});
