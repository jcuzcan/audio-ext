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

  // Reset UI elements initially
  downloadButton.classList.add("hidden");
  redoButton.classList.add("hidden");

  try {
    // Request current recording state from background.js
    let response = await chrome.runtime.sendMessage({ command: "getRecordingState" });

    if (response?.isRecording) {
      recordButton.textContent = "Recording (click to stop)";
      downloadButton.classList.remove("hidden");
      redoButton.classList.remove("hidden");
    } else {
      recordButton.textContent = "Record";
    }
  } catch (error) {
    console.warn("Error checking recording state:", error);
    alert("Failed to check recording status. Please try again.");
  }

  // Handle record button click
  recordButton.addEventListener("click", async () => {
    try {
      if (recordButton.textContent === "Record") {
        // Start recording
        recordButton.textContent = "Recording (click to stop)";
        recordButton.disabled = true; // Prevent multiple clicks
        await chrome.runtime.sendMessage({ command: "startRecording" });

        // Hide download and redo buttons during recording
        downloadButton.classList.add("hidden");
        redoButton.classList.add("hidden");
      } else {
        // Stop recording
        recordButton.textContent = "Record";
        await chrome.runtime.sendMessage({ command: "stopRecording" });

        // Show download and redo buttons after stopping
        downloadButton.classList.remove("hidden");
        redoButton.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Recording error:", error);
      alert("An error occurred while recording. Please try again.");
    } finally {
      recordButton.disabled = false; // Re-enable button after request
    }
  });

  // Handle download button click
  downloadButton.addEventListener("click", async () => {
    try {
      await chrome.runtime.sendMessage({ command: "download" });
    } catch (error) {
      console.error("Error downloading recording:", error);
      alert("Failed to download the recording. Please try again.");
    }
  });

  // Handle redo button click (reload page to reset state)
  redoButton.addEventListener("click", () => {
    location.reload();
  });
});
