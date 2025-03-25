let audioContext;
let processor;
let audioChunks = [];
let mediaElement;

function startRecording() {
  console.log("Starting to record tab audio...");
  // Get the first audio or video element in the tab
  mediaElement = document.querySelector('audio, video');

  if (!mediaElement) {
    console.error("No media element found to capture audio.");
    return;
  }

  // Set up Web Audio API to process the audio stream
  audioContext = new AudioContext();
  let source = audioContext.createMediaElementSource(mediaElement);
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    let inputData = event.inputBuffer.getChannelData(0);
    audioChunks.push(new Float32Array(inputData));
    console.log("Captured audio chunk:", inputData.length);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  console.log("Recording started...");
}

// Listen for messages from background.js to start/stop recording
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
    sendResponse({ status: "Recording started" });
  }
});
