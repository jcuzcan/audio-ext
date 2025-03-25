let mediaStream;
let recorder;
let audioChunks = [];

// Listen for a message from the background script to start recording
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "startRecording") {
    startRecording();
  } else if (message.command === "stopRecording") {
    stopRecording();
  }
});

function startRecording() {
  console.log("Content script: Starting recording...");
  
  // Access the active tab's audio media element (like a <video> or <audio>)
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    mediaStream = stream;
    recorder = new MediaRecorder(mediaStream);

    recorder.ondataavailable = function (event) {
      audioChunks.push(event.data);
    };

    recorder.onstop = function () {
      let audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      let audioUrl = URL.createObjectURL(audioBlob);
      
      // Send the audio URL back to the background script
      chrome.runtime.sendMessage({ command: "audioCaptured", audioUrl: audioUrl });
    };

    recorder.start();
  }).catch((error) => {
    console.error("Error accessing audio:", error);
  });
}

function stopRecording() {
  if (recorder && recorder.state === "recording") {
    console.log("Content script: Stopping recording...");
    recorder.stop();
    mediaStream.getTracks().forEach(track => track.stop()); // Stop the media tracks
  }
}
