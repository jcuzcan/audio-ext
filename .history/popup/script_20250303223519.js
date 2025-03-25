document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(content => content.classList.add("hidden"));

    button.classList.add("active");
    document.getElementById(button.dataset.tab).classList.remove("hidden");
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  let recordButton = document.getElementById("record");
  let downloadButton = document.getElementById("download");
  let redoButton = document.getElementById("redo");

  // Send message to background.js to get recording state
  browser.runtime.sendMessage({ command: "getRecordingState" })
    .then((response) => {
      if (response.isRecording) {
        // If recording is already in progress, update the UI accordingly
        recordButton.textContent = "Recording (click to stop)";
        downloadButton.classList.remove("hidden");
        redoButton.classList.remove("hidden");
      } else {
        recordButton.textContent = "Record";
      }
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });

  // Start/stop recording button
  recordButton.addEventListener("click", () => {
    if (recordButton.textContent === "Record") {
      // Start recording when clicked
      recordButton.textContent = "Recording (click to stop)";
      browser.runtime.sendMessage({ command: "startRecording" });
    } else {
      // Stop recording when clicked
      recordButton.textContent = "Record";
      browser.runtime.sendMessage({ command: "stopRecording" });
      downloadButton.classList.remove("hidden");
      redoButton.classList.remove("hidden");
    }
  });

  // Download the recorded audio
  downloadButton.addEventListener("click", () => {
    browser.runtime.sendMessage({ command: "download" });
  });

  // Redo button to reload the page and reset the state
  redoButton.addEventListener("click", () => {
    location.reload();
  });
});
