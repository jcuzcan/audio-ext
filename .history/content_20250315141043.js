let audioContext;
let workletNode;
let mediaElement;

async function startRecording() {
  console.log("Starting to record tab audio...");

  mediaElement = document.querySelector('audio, video');

  if (!mediaElement) {
    console.error("No media element found to capture audio.");
    return;
  }

  audioContext = new AudioContext();

  await audioContext.audioWorklet.addModule('audio-processor.js'); // Load the custom AudioWorklet

  const source = audioContext.createMediaElementSource(mediaElement);

  workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

  // Listen for messages from the processor
  workletNode.port.onmessage = (event) => {
    console.log("Received audio chunk:", event.data);
  };

  source.connect(workletNode);
  workletNode.connect(audioContext.destination);

  console.log("Recording started...");
}

function stopRecording() {
  console.log("Stopping recording...");
  
  if (workletNode) {
    workletNode.port.postMessage({ command: "stop" });

    workletNode.port.onmessage = (event) => {
      const { audioChunks } = event.data;
      console.log("Total chunks recorded:", audioChunks.length);

      // Send the recorded data back to the background script
      chrome.runtime.sendMessage({ command: "recordingStopped", audioChunks });
    };
  }

  if (audioContext) {
    audioContext.close();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
  } else if (message.command === "stopRecording") {
    stopRecording();
  }
});
