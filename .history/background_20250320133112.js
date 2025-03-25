// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward start/stop commands to the active tab
  if (message.command === "startRecording" || message.command === "stopRecording") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ status: "No active tab" });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, message, sendResponse);
    });
    return true; // Keep message channel open
  } else if (message.command === "download") {
    // Download command should include wavData from the content script
    if (!message.wavData) {
      sendResponse({ status: "No WAV data to download" });
      return;
    }
    const uint8Arr = new Uint8Array(message.wavData);
    const wavBlob = new Blob([uint8Arr], { type: "audio/wav" });
    const url = URL.createObjectURL(wavBlob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recording-${timestamp}.wav`;
    chrome.downloads.download({
      url,
      filename,
      saveAs: true,
    }, () => {
      sendResponse({ status: "Downloaded" });
    });
    return true;
  }
});
