let audioContext;
let processor;
let audioChunks = [];
let mediaElement;

function startRecording() {
  console.log("Starting to record tab audio...");

  // Find the first audio or video element in the tab
  mediaElement = document.querySelector('audio, video');

  if (!mediaElement) {
    console.error("No media element found to capture audio.");
    return;
  }

  // Set up the Web Audio API to process the audio stream
  audioContext = new AudioContext();
  
  let source = audioContext.createMediaElementSource(mediaElement);
  processor = audioContext.createScriptProcessor(16384, 1, 1); // Higher buffer size for better capture

  processor.onaudioprocess = (event) => {
    let inputData = event.inputBuffer.getChannelData(0);
    if (inputData.length > 0) {
      audioChunks.push(new Float32Array(inputData));
      console.log("Captured audio chunk:", inputData.length);
    }
  };

  // Connect the audio source to the processor and the destination (for output to speakers)
  source.connect(processor);
  processor.connect(audioContext.destination);

  console.log("Recording started...");
}

// Stop recording and process the audio chunks
function stopRecording() {
  console.log("Stopping recording...");
  console.log("Total chunks recorded:", audioChunks.length);

  if (processor) processor.disconnect();
  if (audioContext) audioContext.close();

  // You can handle the audio data here, e.g., encode it into a file or send to the background
  if (audioChunks.length > 0) {
    let audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    let audioUrl = URL.createObjectURL(audioBlob);
    chrome.runtime.sendMessage({ command: "audioCaptured", audioUrl: audioUrl });
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
