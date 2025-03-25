// content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "startRecording") {
    // Forward to background
    chrome.runtime.sendMessage({ command: "startRecording" }, (response) => {
      console.log("startRecording response:", response);
      sendResponse(response);
    });
    return true; // Keep channel open
  }

  else if (request.command === "stopRecording") {
    // Forward to background
    chrome.runtime.sendMessage({ command: "stopRecording" }, (response) => {
      console.log("stopRecording response:", response);

      // If you want to download immediately from content script:
      if (response.status === "recordingStopped" && response.wavData) {
        // Send "download" command + WAV data to background
        chrome.runtime.sendMessage(
          { command: "download", wavData: response.wavData },
          (dlResponse) => {
            console.log("Download response:", dlResponse);
            sendResponse(dlResponse);
          }
        );
      } else {
        sendResponse(response);
      }
    });
    return true; // Keep channel open
  }
});
