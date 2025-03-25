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

  // Reset UI on load
  downloadButton.classList.add("hidden");
  redoButton.classList.add("hidden");

  try {
    // Send message to background.js to get recording state
    let response = await browser.runtime.sendMessage({ command: "getRecordingState" });

    if (response.isRecording) {
      // If recording is already in progress, update the UI accordingly
      recordButton.textContent = "Recording (click to stop)";
      downloadButton.classList.remove("hidden");
      redoButton.classList.remove("hidden");
    } else {
      recordButton.textContent = "Record";
    }
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Failed to check recording status. Please try again.");
  }

  // Start/stop recording button
  recordButton.addEventListener("click", () => {
    if (recordButton.textContent === "Record") {
      // Start recording when clicked
      recordButton.textContent = "Recording (click to stop)";
      browser.runtime.sendMessage({ command: "startRecording" })
        .then(() => {
          downloadButton.classList.add("hidden");
          redoButton.classList.add("hidden");
        })
        .catch((error) => {
          console.error("Error starting recording:", error);
          alert("Failed to start recording. Please try again.");
        });
    } else {
      // Stop recording when clicked
      recordButton.textContent = "Record";
      browser.runtime.sendMessage({ command: "stopRecording" })
        .then(() => {
          downloadButton.classList.remove("hidden");
          redoButton.classList.remove("hidden");
        })
        .catch((error) => {
          console.error("Error stopping recording:", error);
          alert("Failed to stop recording. Please try again.");
        });
    }
  });

  // Download the recorded audio
  downloadButton.addEventListener("click", () => {
    browser.runtime.sendMessage({ command: "download" })
      .catch((error) => {
        console.error("Error downloading recording:", error);
        alert("Failed to download the recording. Please try again.");
      });
  });

  // Redo button to reload the page and reset the state
  redoButton.addEventListener("click", () => {
    location.reload();
  });
});
