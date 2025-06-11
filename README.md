# Agent Voice Response - AVR VAD - Silero Voice Activity Detection for Node.js 

[![Discord](https://img.shields.io/discord/1347239846632226998?label=Discord&logo=discord)](https://discord.gg/DFTU69Hg74)
[![GitHub Repo stars](https://img.shields.io/github/stars/agentvoiceresponse/avr-vad?style=social)](https://github.com/agentvoiceresponse/avr-vad)
[![npm version](https://img.shields.io/npm/v/avr-vad.svg)](https://www.npmjs.com/package/avr-vad)
[![npm downloads](https://img.shields.io/npm/dm/avr-vad.svg)](https://www.npmjs.com/package/avr-vad)
[![Ko-fi](https://img.shields.io/badge/Support%20us%20on-Ko--fi-ff5e5b.svg)](https://ko-fi.com/agentvoiceresponse)

🎤 A Node.js library for Voice Activity Detection using the Silero VAD model.

## ✨ Features

- 🚀 **Based on Silero VAD**: Uses the pre-trained Silero ONNX model (v5 and legacy versions) for accurate results
- 🎯 **Real-time processing**: Supports real-time frame-by-frame processing
- ⚡ **Non-real-time processing**: Batch processing for audio files and streams
- 🔧 **Configurable**: Customizable thresholds and parameters for different needs
- 🎵 **Audio processing**: Includes utilities for resampling and audio manipulation
- 📊 **Multiple models**: Support for both Silero VAD v5 and legacy models
- 💾 **Bundled models**: Models are included in the package, no external downloads required
- 📝 **TypeScript**: Fully typed with TypeScript

## 🚀 Installation

```bash
npm install avr-vad
```

## 📖 Quick Start

### Real-time Processing

```typescript
import { RealTimeVAD } from 'avr-vad';

// Initialize the VAD with default options (Silero v5 model)
const vad = await RealTimeVAD.new({
  model: 'v5', // or 'legacy'
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  preSpeechPadFrames: 1,
  redemptionFrames: 8,
  frameSamples: 1536,
  minSpeechFrames: 3
});

// Process audio frames in real-time
const audioFrame = getAudioFrameFromMicrophone(); // Float32Array of 1536 samples at 16kHz
const result = await vad.processFrame(audioFrame);

console.log(`Speech probability: ${result.probability}`);
console.log(`Speech detected: ${result.msg === 'SPEECH_START' || result.msg === 'SPEECH_CONTINUE'}`);

// Clean up when done
vad.destroy();
```

### Non-Real-time Processing

```typescript
import { NonRealTimeVAD } from 'avr-vad';

// Initialize for batch processing
const vad = await NonRealTimeVAD.new({
  model: 'v5',
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35
});

// Process entire audio buffer
const audioData = loadAudioData(); // Float32Array at 16kHz
const results = await vad.processAudio(audioData);

// Get speech segments
const speechSegments = vad.getSpeechSegments(results);
console.log(`Found ${speechSegments.length} speech segments`);

speechSegments.forEach((segment, i) => {
  console.log(`Segment ${i + 1}: ${segment.start}ms - ${segment.end}ms`);
});

// Clean up
vad.destroy();
```

## ⚙️ Configuration

### Real-time VAD Options

```typescript
interface RealTimeVADOptions {
  /** Model version to use ('v5' | 'legacy') */
  model?: 'v5' | 'legacy';
  
  /** Threshold for detecting speech start */
  positiveSpeechThreshold?: number;
  
  /** Threshold for detecting speech end */
  negativeSpeechThreshold?: number;
  
  /** Frames to include before speech detection */
  preSpeechPadFrames?: number;
  
  /** Frames to wait before ending speech */
  redemptionFrames?: number;
  
  /** Number of samples per frame (usually 1536 for 16kHz) */
  frameSamples?: number;
  
  /** Minimum frames for valid speech */
  minSpeechFrames?: number;
}
```

### Non-Real-time VAD Options

```typescript
interface NonRealTimeVADOptions {
  /** Model version to use ('v5' | 'legacy') */
  model?: 'v5' | 'legacy';
  
  /** Threshold for detecting speech start */
  positiveSpeechThreshold?: number;
  
  /** Threshold for detecting speech end */
  negativeSpeechThreshold?: number;
}
```

### Default Values

```typescript
// Real-time VAD defaults
const defaultRealTimeOptions = {
  model: 'v5',
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  preSpeechPadFrames: 1,
  redemptionFrames: 8,
  frameSamples: 1536,
  minSpeechFrames: 3
};

// Non-real-time VAD defaults
const defaultNonRealTimeOptions = {
  model: 'v5',
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35
};
```

## 📊 Results and Messages

### VAD Messages

The VAD returns different message types to indicate speech state changes:

```typescript
enum Message {
  ERROR = 'ERROR',
  SPEECH_START = 'SPEECH_START',
  SPEECH_CONTINUE = 'SPEECH_CONTINUE', 
  SPEECH_END = 'SPEECH_END',
  SILENCE = 'SILENCE'
}
```

### Processing Results

```typescript
interface VADResult {
  /** Speech probability (0.0 - 1.0) */
  probability: number;
  
  /** Message indicating speech state */
  msg: Message;
  
  /** Audio data if speech segment ended */
  audio?: Float32Array;
}
```

### Speech Segments

```typescript
interface SpeechSegment {
  /** Start time in milliseconds */
  start: number;
  
  /** End time in milliseconds */
  end: number;
  
  /** Speech probability for this segment */
  probability: number;
}
```

## 🔧 Audio Utilities

The library includes various audio processing utilities:

```typescript
import { utils, Resampler } from 'avr-vad';

// Resample audio to 16kHz (required for VAD)
const resampler = new Resampler({
  nativeSampleRate: 44100,
  targetSampleRate: 16000,
  targetFrameSize: 1536
});

const resampledFrame = resampler.process(audioFrame);

// Other utilities
const frameSize = utils.frameSize; // Get frame size for current sample rate
const audioBuffer = utils.concatArrays([frame1, frame2]); // Concatenate audio arrays
```

## 🎯 Advanced Examples

### Real-time Speech Detection with Callbacks

```typescript
import { RealTimeVAD, Message } from 'avr-vad';

class SpeechDetector {
  private vad: RealTimeVAD;
  private onSpeechStart?: (audio: Float32Array) => void;
  private onSpeechEnd?: (audio: Float32Array) => void;

  constructor(callbacks: {
    onSpeechStart?: (audio: Float32Array) => void;
    onSpeechEnd?: (audio: Float32Array) => void;
  }) {
    this.onSpeechStart = callbacks.onSpeechStart;
    this.onSpeechEnd = callbacks.onSpeechEnd;
  }

  async initialize() {
    this.vad = await RealTimeVAD.new({
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35
      onSpeechStart: this.onSpeechStart,
      onSpeechEnd: this.onSpeechEnd
    });
  }

  async processFrame(audioFrame: Float32Array) {
    const result = await this.vad.processFrame(audioFrame);
    return result;
  }

  destroy() {
    this.vad?.destroy();
  }
}

// Usage
const detector = new SpeechDetector({
  onSpeechStart: (audio) => console.log(`Speech started with ${audio.length} samples`),
  onSpeechEnd: (audio) => console.log(`Speech ended with ${audio.length} samples`)
});

await detector.initialize();
```

### Batch Processing Audio File

```typescript
import { NonRealTimeVAD, utils } from 'avr-vad';
import * as fs from 'fs';

async function processAudioFile(filePath: string) {
  // Load audio data (you'll need your own audio loading logic)
  const audioData = loadWavFile(filePath); // Float32Array at 16kHz
  
  const vad = await NonRealTimeVAD.new({
    model: 'v5',
    positiveSpeechThreshold: 0.6,
    negativeSpeechThreshold: 0.4
  });

  const results = await vad.processAudio(audioData);
  const segments = vad.getSpeechSegments(results);

  console.log(`Processing ${filePath}:`);
  console.log(`Total audio duration: ${(audioData.length / 16000).toFixed(2)}s`);
  console.log(`Speech segments found: ${segments.length}`);
  
  segments.forEach((segment, i) => {
    const duration = ((segment.end - segment.start) / 1000).toFixed(2);
    console.log(`  Segment ${i + 1}: ${segment.start}ms - ${segment.end}ms (${duration}s)`);
  });

  vad.destroy();
  return segments;
}
```

## 📝 Development

### Requirements

- Node.js >= 16.0.0
- TypeScript >= 5.0.0

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Scripts

```bash
npm run lint      # Run ESLint
npm run clean     # Clean build directory
npm run prepare   # Build before npm install (automatically run)
```

## 📁 Project Structure

```
avr-vad/
├── src/
│   ├── index.ts                    # Main exports
│   ├── real-time-vad.ts           # Real-time VAD implementation  
│   └── common/
│       ├── index.ts               # Common exports
│       ├── frame-processor.ts     # Core ONNX processing
│       ├── non-real-time-vad.ts  # Batch processing VAD
│       ├── utils.ts               # Utility functions
│       ├── resampler.ts           # Audio resampling
├── dist/                          # Compiled JavaScript
├── test/                          # Test files
├── silero_vad_v5.onnx            # Silero VAD v5 model
├── silero_vad_legacy.onnx        # Silero VAD legacy model
└── package.json
```

## 🔧 Troubleshooting

### Audio Format Requirements

The Silero VAD model requires:
- **Sample rate**: 16kHz
- **Channels**: Mono (single channel)
- **Format**: Float32Array with values between -1.0 and 1.0
- **Frame size**: 1536 samples (96ms at 16kHz)

### Model Selection

- **v5 model**: Latest version with improved accuracy
- **legacy model**: Original model for compatibility

Use the `Resampler` utility to convert audio to the required format:

```typescript
import { Resampler } from 'avr-vad';

const resampler = new Resampler({
  nativeSampleRate: 44100,    // Your audio sample rate
  targetSampleRate: 16000,    // Required by VAD
  targetFrameSize: 1536       // Required frame size
});
```

### Performance Tips

- Use appropriate thresholds for your use case
- Consider using the legacy model for lower resource usage
- For real-time applications, ensure your audio processing pipeline can handle 16kHz/1536 samples per frame
- Use `redemptionFrames` to avoid choppy speech detection

## Acknowledgments

- [Silero Models](https://github.com/snakers4/silero-vad) for the excellent VAD model
- [ONNX Runtime](https://onnxruntime.ai/) for model inference
- The open source community for supporting libraries 

## Support & Community

*   **Website:** [https://agentvoiceresponse.com](https://agentvoiceresponse.com) - Official website.
*   **GitHub:** [https://github.com/agentvoiceresponse](https://github.com/agentvoiceresponse) - Report issues, contribute code.
*   **Discord:** [https://discord.gg/DFTU69Hg74](https://discord.gg/DFTU69Hg74) - Join the community discussion.
*   **Docker Hub:** [https://hub.docker.com/u/agentvoiceresponse](https://hub.docker.com/u/agentvoiceresponse) - Find Docker images.
*   **NPM:** [https://www.npmjs.com/~agentvoiceresponse](https://www.npmjs.com/~agentvoiceresponse) - Browse our packages.
*   **Wiki:** [https://wiki.agentvoiceresponse.com/en/home](https://wiki.agentvoiceresponse.com/en/home) - Project documentation and guides.

## Support AVR

AVR is free and open-source. If you find it valuable, consider supporting its development:

<a href="https://ko-fi.com/agentvoiceresponse" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support us on Ko-fi"></a>

## License

MIT License - see the [LICENSE.md](LICENSE.md) file for details.