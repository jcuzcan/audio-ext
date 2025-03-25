let workletNode; // Declare globally for use in both start and stop

// Start recording function
async function startRecording() {
  console.log("Starting to record tab audio...");
  mediaElement = document.querySelector('audio, video');

  if (!mediaElement) {
    console.error("No media element found to capture audio.");
    return;
  }

  audioContext = new AudioContext();

  try {
    await audioContext.audioWorklet.addModule('audio-processor.js'); // Load the custom AudioWorklet

    const source = audioContext.createMediaElementSource(mediaElement);
    workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

    // Listen for messages from the processor
    workletNode.port.onmessage = (event) => {
      console.log("Received audio chunk:", event.data);

      if (!event.data.audioChunks || event.data.audioChunks.length === 0) {
        console.error("No audio chunks to send.");
        return;
      }

      // Send the audio chunks back to background.js when recording is complete
      chrome.runtime.sendMessage({ command: "recordingStopped", audioChunks: event.data.audioChunks });
    };

    source.connect(workletNode);
    workletNode.connect(audioContext.destination);

    console.log("Recording started...");
    chrome.runtime.sendMessage({ command: "recordingStarted", workletNodeAvailable: true });

  } catch (error) {
    console.error("Error starting recording:", error);
  }
}

// Stop recording function
function stopRecording() {
  console.log("Stopping recording...");

  if (workletNode) {
    workletNode.port.postMessage({ command: "stop" });

    // Listen for final chunks after stopping the recording
    workletNode.port.onmessage = (event) => {
      const { audioChunks } = event.data;
      console.log("Total chunks recorded:", audioChunks.length);

      // Send the recorded data back to background.js
      chrome.runtime.sendMessage({ command: "recordingStopped", audioChunks });
    };
  } else {
    console.error("WorkletNode not available.");
  }

  if (audioContext) {
    audioContext.close();
  }
}

// Message listener for background.js commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
  } else if (message.command === "stopRecording") {
    stopRecording();
  }
});
