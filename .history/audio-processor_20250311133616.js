class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.audioChunks = [];
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];
  
      if (input.length > 0) {
        const inputData = input[0]; // First channel of input data
        this.audioChunks.push(new Float32Array(inputData));
        console.log("Captured audio chunk:", inputData.length);
      }
  
      // Copy the input to the output (for monitoring purposes, remove if not needed)
      output[0].set(input[0]);
  
      return true;
    }
  
    // Optional: You can add a method to access the audioChunks
    getAudioChunks() {
      return this.audioChunks;
    }
  }
  
  registerProcessor('audio-capture-processor', AudioCaptureProcessor);
  