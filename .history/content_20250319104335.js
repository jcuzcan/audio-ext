let workletNode;
let audioContext;

// Start recording function
async function startRecording() {
    console.log("Starting OperaGX tab audio recording...");

    let mediaElement = document.querySelector('audio, video');
    if (!mediaElement) {
        console.error("No media element found to capture audio.");
        return;
    }

    try {
        audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule('audio-processor.js');

        const source = audioContext.createMediaElementSource(mediaElement);
        workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');

        workletNode.port.onmessage = (event) => {
            if (event.data.audioChunks?.length) {
                console.log("Received final audio chunks:", event.data.audioChunks.length);
                chrome.runtime.sendMessage({ command: "recordingStopped", audioChunks: event.data.audioChunks });
            }
        };

        source.connect(workletNode);
        workletNode.connect(audioContext.destination);

        console.log("Recording started...");
        chrome.runtime.sendMessage({ command: "recordingStarted", status: "success" });

    } catch (error) {
        console.error("Error starting recording:", error);
        chrome.runtime.sendMessage({ command: "recordingError", error: error.message });
    }
}

// Stop recording function
function stopRecording() {
    console.log("Stopping recording...");

    if (workletNode) {
        workletNode.port.postMessage({ command: "stop" });
    } else {
        console.error("WorkletNode is not initialized.");
    }

    if (audioContext) {
        audioContext.close().then(() => {
            console.log("Audio context closed.");
        }).catch(error => {
            console.error("Error closing audio context:", error);
        });
    }
}

// Handle messages from background.js
chrome.runtime.onMessage.addListener((message) => {
    if (message.command === "startRecording") {
        startRecording();
    } else if (message.command === "stopRecording") {
        stopRecording();
    }
});
