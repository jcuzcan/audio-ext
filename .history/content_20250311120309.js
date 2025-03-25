let audioContext;
let processor;
let audioChunks = [];
let mediaStream;

async function startRecording() {
  console.log("Starting to record tab audio...");

  try {
    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          echoCancellation: false
        }
      },
      video: false
    });

    let audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error("No audio track found.");
      return;
    }

    audioContext = new AudioContext();
    let source = audioContext.createMediaStreamSource(mediaStream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      let inputData = event.inputBuffer.getChannelData(0);
      audioChunks.push(new Float32Array(inputData));
      console.log("Captured audio chunk:", inputData.length);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    console.log("Recording started...");
  } catch (error) {
    console.error("Error starting recording:", error);
  }
}

function stopRecording() {
  if (!mediaStream) {
    console.error("No active recording found.");
    return;
  }

  mediaStream.getTracks().forEach(track => track.stop());
  processor.disconnect();
  audioContext.close();

  console.log("Recording stopped.");
}

// Listen for messages from `background.js`
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
    sendResponse({ status: "Recording started" });
  } else if (message.command === "stopRecording") {
    stopRecording();
    sendResponse({ status: "Recording stopped" });
  }
});
