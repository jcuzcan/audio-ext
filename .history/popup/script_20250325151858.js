// popup/script.js

let audioContext;
let source;
let processor;
let recordedSamples = [];
let isRecording = false;
let mediaStream;

document.addEventListener("DOMContentLoaded", () => {
  const recordButton = document.getElementById("record");
  const downloadButton = document.getElementById("download");
  const redoButton = document.getElementById("redo");

  // Initialize UI
  downloadButton.classList.add("hidden");
  redoButton.classList.add("hidden");

  recordButton.addEventListener("click", async () => {
    try {
      if (!isRecording) {
        // Start recording using getDisplayMedia
        await startRecording();
        recordButton.textContent = "Recording (click to stop)";
        downloadButton.classList.add("hidden");
        redoButton.classList.add("hidden");
      } else {
        // Stop recording and get the WAV Blob
        const wavBlob = await stopRecording();
        recordButton.textContent = "Record";
        downloadButton.classList.remove("hidden");
        redoButton.classList.remove("hidden");

        // Create a download link for the recording
        const url = URL.createObjectURL(wavBlob);
        downloadButton.onclick = () => {
          const a = document.createElement("a");
          a.href = url;
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          a.download = `recording-${timestamp}.wav`;
          a.click();
        };
      }
    } catch (error) {
      console.error("Recording error:", error);
      alert("Error during recording: " + error.message);
    }
  });

  redoButton.addEventListener("click", () => {
    // Reload the popup to reset state
    location.reload();
  });
});

async function startRecording() {
  if (isRecording) throw new Error("Already recording");
  isRecording = true;
  recordedSamples = [];

  // Use getDisplayMedia to capture the display (get both video and audio)
  mediaStream = await navigator.mediaDevices.getDisplayMedia({
    video: true, // Required for getDisplayMedia
    audio: true
  });

  // Extract audio tracks only
  const audioTracks = mediaStream.getAudioTracks();
  if (audioTracks.length === 0) {
    throw new Error("No audio track available in the captured stream");
  }
  const audioStream = new MediaStream(audioTracks);

  // Set up AudioContext and processing nodes
  audioContext = new AudioContext();
  source = audioContext.createMediaStreamSource(audioStream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    // Get raw PCM data from the first (mono) channel
    const inputData = event.inputBuffer.getChannelData(0);
    // Copy the samples to avoid being overwritten
    recordedSamples.push(new Float32Array(inputData));
  };

  // Connect the nodes so that audio processing occurs
  source.connect(processor);
  processor.connect(audioContext.destination);

  return;
}

async function stopRecording() {
  if (!isRecording) throw new Error("Not recording");
  isRecording = false;

  // Disconnect audio nodes and close the AudioContext
  if (source && processor) {
    source.disconnect(processor);
    processor.disconnect();
  }
  if (audioContext) {
    await audioContext.close();
  }
  if (mediaStream) {
    // Stop all tracks (both audio and video)
    mediaStream.getTracks().forEach(track => track.stop());
  }

  // Flatten recorded audio samples into one array
  const totalLength = recordedSamples.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedSamples = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of recordedSamples) {
    combinedSamples.set(chunk, offset);
    offset += chunk.length;
  }

  // Encode the audio samples into a WAV file at 44100 Hz
  return encodeWAV(combinedSamples, 44100);
}

function encodeWAV(samples, sampleRate) {
  const bufferLength = samples.length;
  const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
  const view = new DataView(wavBuffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + bufferLength * 2, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // Audio format (1 for PCM)
  view.setUint16(22, 1, true);  // Number of channels (1 = mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate: sampleRate * channels * bitsPerSample/8
  view.setUint16(32, 2, true);  // Block align: channels * bitsPerSample/8
  view.setUint16(34, 16, true); // Bits per sample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, bufferLength * 2, true);

  // Write PCM samples, converting from float to 16-bit PCM
  let offsetView = 44;
  for (let i = 0; i < bufferLength; i++, offsetView += 2) {
    let sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offsetView, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }

  return new Blob([view], { type: "audio/wav" });
}
