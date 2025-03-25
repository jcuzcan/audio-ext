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
    let response = await browser.runtime.sendMessage({ command: "getRecordingState" });

    if (response.isRecording) {
      // Update UI if already recording
      recordButton.textContent = "Recording (click to stop)";
      downloadButton.classList.remove("hidden");
      redoButton.classList.remove("hidden");
    } else {
      recordButton.textContent = "Record";
    }
  } catch (error) {
    console.error("Error checking recording state:", error);
    alert("Failed to check recording status. Please try again.");
  }

  // Handle record button click
  recordButton.addEventListener("click", () => {
    if (recordButton.textContent === "Record") {
      // Start recording if not currently recording
      recordButton.textContent = "Recording (click to stop)";
      browser.runtime.sendMessage({ command: "startRecording" })
        .then(() => {
          // Hide download and redo buttons until recording stops
          downloadButton.classList.add("hidden");
          redoButton.classList.add("hidden");
        })
        .catch((error) => {
          console.error("Error starting recording:", error);
          alert("Failed to start recording. Please try again.");
        });
    } else {
      // Stop recording if already recording
      recordButton.textContent = "Record";
      browser.runtime.sendMessage({ command: "stopRecording" })
        .then(() => {
          // Show download and redo buttons once recording stops
          downloadButton.classList.remove("hidden");
          redoButton.classList.remove("hidden");
        })
        .catch((error) => {
          console.error("Error stopping recording:", error);
          alert("Failed to stop recording. Please try again.");
        });
    }
  });

  // Handle download button click
  downloadButton.addEventListener("click", () => {
    browser.runtime.sendMessage({ command: "download" })
      .catch((error) => {
        console.error("Error downloading recording:", error);
        alert("Failed to download the recording. Please try again.");
      });
  });

  // Handle redo button click (reload page to reset state)
  redoButton.addEventListener("click", () => {
    location.reload();
  });
});
