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
  
    // Request the current recording state from background.js
    browser.runtime.sendMessage({ command: "getRecordingState" })
    .then((response) => {
      if (response.isRecording) {
        recordButton.textContent = "Recording (click to stop)";
        downloadButton.classList.remove("hidden");
        redoButton.classList.remove("hidden");
      }
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
  
    recordButton.addEventListener("click", () => {
      if (recordButton.textContent === "Record") {
        recordButton.textContent = "Recording (click to stop)";
        browser.runtime.sendMessage({ command: "startRecording" });
      } else {
        recordButton.textContent = "Record";
        browser.runtime.sendMessage({ command: "stopRecording" });
        downloadButton.classList.remove("hidden");
        redoButton.classList.remove("hidden");
      }
    });
  
    downloadButton.addEventListener("click", () => {
      browser.runtime.sendMessage({ command: "download" });
    });
  
    redoButton.addEventListener("click", () => {
      location.reload();
    });
  });
  