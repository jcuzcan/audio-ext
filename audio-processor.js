class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.audioChunks = [];
        this.port.onmessage = (event) => {
            if (event.data.command === "stop") {
                this.port.postMessage({ audioChunks: this.audioChunks });
                this.audioChunks = []; // Clear buffer after sending
            }
        };
    }

    process(inputs) {
        const input = inputs[0];

        if (input.length > 0) {
            this.audioChunks.push(new Float32Array(input[0])); // Store audio data
        }

        return true;
    }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
