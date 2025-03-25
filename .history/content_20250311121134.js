let audioContext;
let processor;
let audioChunks = [];
let mediaElement;

function startRecording() {
  console.log("Starting to record tab audio...");
  mediaElement = document.querySelector('audio, video');

  if (!mediaElement) {
    console.error("No media element found to capture audio.");
    return;
  }

  audioContext = new AudioContext();

  try {
    let stream = mediaElement.captureStream();
    let source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(16384, 1, 1);

    processor.onaudioprocess = (event) => {
      let inputData = event.inputBuffer.getChannelData(0);
      if (inputData.length > 0) {
        audioChunks.push(new Float32Array(inputData));
        console.log("Captured audio chunk:", inputData.length);
      }
    };

    source.connect(processor);
    source.connect(audioContext.destination);
    processor.connect(audioContext.destination);

    console.log("Recording started...");
  } catch (error) {
    console.error("Failed to capture stream:", error);
  }
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
    sendResponse({ status: "Recording started" });
  }
});
