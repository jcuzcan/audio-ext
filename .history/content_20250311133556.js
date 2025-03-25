let audioContext;
let workletNode;
let mediaElement;

async function startRecording() {
  console.log("Starting to record tab audio...");

  // Find the first audio or video element in the tab
  mediaElement = document.querySelector('audio, video');

  if (!mediaElement) {
    console.error("No media element found to capture audio.");
    return;
  }

  // Create a new audio context and load the AudioWorkletProcessor
  audioContext = new AudioContext();

  await audioContext.audioWorklet.addModule('audio-processor.js'); // Load the custom AudioWorklet

  // Create a MediaElementSourceNode to connect the media element to the audio context
  const source = audioContext.createMediaElementSource(mediaElement);

  // Create the AudioWorkletNode
  workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

  // Connect the source node to the worklet node and the worklet node to the destination
  source.connect(workletNode);
  workletNode.connect(audioContext.destination);

  console.log("Recording started...");
}

// Stop recording and process the audio chunks
function stopRecording() {
  console.log("Stopping recording...");
  
  if (workletNode) {
    // Get the audio chunks from the worklet node processor
    const audioChunks = workletNode.processor.getAudioChunks();
    console.log("Total chunks recorded:", audioChunks.length);

    // You can process the audio chunks here, e.g., encode them into a file
  }

  if (audioContext) {
    audioContext.close();
  }
}

// Listen for start/stop recording commands from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
  } else if (message.command === "stopRecording") {
    stopRecording();
  }
});
