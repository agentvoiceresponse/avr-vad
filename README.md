# AVR VAD - Silero Voice Activity Detection for Node.js

🎤 A Node.js library for Voice Activity Detection using the Silero VAD model.

## ✨ Features

- 🚀 **Based on Silero VAD**: Uses the pre-trained Silero ONNX model for accurate results
- 🎯 **Real-time processing**: Supports real-time frame-by-frame processing
- 📁 **WAV file support**: Easily load and process WAV audio files
- 🔧 **Configurable**: Customizable thresholds and parameters for different needs
- 🎵 **Audio processing**: Includes utilities for resampling, normalization, and filtering
- 📊 **Segment extraction**: Automatically identifies speech segments
- 💾 **Automatic download**: Model is downloaded automatically on first use
- 📝 **TypeScript**: Fully typed with TypeScript

## 🚀 Installation

```bash
npm install avr-vad
```

## 📖 Quick Start

### Basic Example

```typescript
import { AVRVad } from 'avr-vad';

// Quick method to process a WAV file
const result = await AVRVad.processWavFile('path/to/audio.wav', {
  threshold: 0.5,
  sampleRate: 16000
});

console.log(`Found ${result.segments.length} speech segments`);
result.segments.forEach((segment, i) => {
  console.log(`Segment ${i + 1}: ${segment.start}ms - ${segment.end}ms`);
});
```

### Manual Processing

```typescript
import { SileroVAD, AudioUtils } from 'avr-vad';

// Initialize the VAD
const vad = new SileroVAD({
  sampleRate: 16000,
  frameSize: 1536,
  threshold: 0.5,
  minSpeechDurationMs: 250,
  maxSilenceDurationMs: 2000
});

await vad.initialize();

// Load audio file
const { audioData, sampleRate } = await AudioUtils.loadWavFile('audio.wav');

// Process all audio
const results = await vad.processAudio(audioData);

// Extract speech segments
const segments = vad.extractSpeechSegments(results, audioData);

// Clean up
await vad.dispose();
```

### Real-time Processing

```typescript
import { SileroVAD } from 'avr-vad';

const vad = new SileroVAD({
  sampleRate: 16000,
  frameSize: 1536,
  threshold: 0.3
});

await vad.initialize();

// In a real-time loop (e.g., from microphone)
const audioFrame = getAudioFrameFromMicrophone(); // Float32Array of 1536 samples
const result = await vad.processFrame(audioFrame);

if (result.isSpeech) {
  console.log(`Speech detected! Confidence: ${(result.probability * 100).toFixed(1)}%`);
}
```

## ⚙️ Configuration

### VAD Options

```typescript
interface VADOptions {
  /** Audio sample rate (8000 or 16000 Hz) */
  sampleRate?: 8000 | 16000;
  
  /** Frame size in samples (Silero VAD uses 1536) */
  frameSize?: 256 | 512 | 768 | 1024 | 1536;
  
  /** Threshold for speech detection (0.0 - 1.0) */
  threshold?: number;
  
  /** Minimum speech duration in ms */
  minSpeechDurationMs?: number;
  
  /** Maximum silence duration in ms */
  maxSilenceDurationMs?: number;
  
  /** Path to custom ONNX model */
  modelPath?: string;
}
```

### Default Values

```typescript
const defaultOptions = {
  sampleRate: 16000,
  frameSize: 1536,
  threshold: 0.5,
  minSpeechDurationMs: 250,
  maxSilenceDurationMs: 2000
};
```

## 📊 Results

### VADResult

```typescript
interface VADResult {
  /** Speech probability (0.0 - 1.0) */
  probability: number;
  
  /** Speech detection based on threshold */
  isSpeech: boolean;
  
  /** Frame index */
  frame: number;
  
  /** Timestamp in milliseconds */
  timestamp: number;
}
```

### AudioSegment

```typescript
interface AudioSegment {
  /** Start time in ms */
  start: number;
  
  /** End time in ms */
  end: number;
  
  /** Audio data for this segment */
  audioData: Float32Array;
  
  /** Confidence score */
  confidence: number;
}
```

## 🔧 Audio Utilities

The library includes various audio processing utilities:

```typescript
import { AudioUtils } from 'avr-vad';

// Load WAV file
const { audioData, sampleRate } = await AudioUtils.loadWavFile('file.wav');

// Resample audio
const resampled = AudioUtils.resample(audioData, 44100, 16000);

// Normalize audio
const normalized = AudioUtils.normalize(audioData, 0.95);

// Apply high-pass filter
const filtered = AudioUtils.highPassFilter(audioData, 80, 16000);

// Create overlapping frames
const frames = AudioUtils.createFrames(audioData, 1536, 768);
```

## 🎯 Advanced Examples

### Processing with Pre-processing

```typescript
import { SileroVAD, AudioUtils } from 'avr-vad';

const vad = new SileroVAD({ threshold: 0.4 });
await vad.initialize();

// Load and preprocess audio
let { audioData, sampleRate } = await AudioUtils.loadWavFile('noisy_audio.wav');

// Resample if necessary
if (sampleRate !== 16000) {
  audioData = AudioUtils.resample(audioData, sampleRate, 16000);
}

// Apply filter and normalization
audioData = AudioUtils.highPassFilter(audioData, 80, 16000);
audioData = AudioUtils.normalize(audioData, 0.9);

// Process with VAD
const results = await vad.processAudio(audioData);
const speechSegments = vad.extractSpeechSegments(results, audioData);

console.log(`Speech segments found: ${speechSegments.length}`);
```

### Real-time Monitoring with Callbacks

```typescript
import { SileroVAD } from 'avr-vad';

class RealTimeVAD {
  private vad: SileroVAD;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private lastSpeechState = false;

  constructor(callbacks: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
  }) {
    this.vad = new SileroVAD({ threshold: 0.4 });
    this.onSpeechStart = callbacks.onSpeechStart;
    this.onSpeechEnd = callbacks.onSpeechEnd;
  }

  async initialize() {
    await this.vad.initialize();
  }

  async processFrame(audioFrame: Float32Array) {
    const result = await this.vad.processFrame(audioFrame);
    
    // Detect transitions
    if (result.isSpeech && !this.lastSpeechState) {
      this.onSpeechStart?.();
    } else if (!result.isSpeech && this.lastSpeechState) {
      this.onSpeechEnd?.();
    }
    
    this.lastSpeechState = result.isSpeech;
    return result;
  }
}

// Usage
const realTimeVAD = new RealTimeVAD({
  onSpeechStart: () => console.log('🗣️ Speech started'),
  onSpeechEnd: () => console.log('🔇 Speech ended')
});

await realTimeVAD.initialize();
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

### Run Examples

```bash
npm run dev
```

## 📁 Project Structure

```
avr-vad/
├── src/
│   ├── index.ts           # Main exports
│   ├── silero-vad.ts      # Main VAD class
│   ├── model-manager.ts   # ONNX model management
│   ├── audio-utils.ts     # Audio utilities
│   └── types.ts           # TypeScript definitions
├── examples/
│   └── basic-example.ts   # Usage examples
├── lib/                   # Compiled files
└── models/                # Downloaded ONNX models
```

## 🔧 Troubleshooting

### Error: Model not found

The Silero VAD model is downloaded automatically on first use. If the download fails:

1. Check your internet connection
2. Verify write permissions in the project directory
3. Manually download the model from [Silero VAD Repository](https://github.com/snakers4/silero-vad)

### Error: Unsupported sample rate

Silero VAD only supports 8kHz and 16kHz. Use `AudioUtils.resample()` to convert:

```typescript
const resampled = AudioUtils.resample(audioData, originalSampleRate, 16000);
```

### Real-time Performance

For better real-time performance:

- Use `frameSize: 1536` (optimal for Silero VAD)
- Consider higher `threshold` to reduce false positives
- Process frames in a separate worker thread for critical applications

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 🙏 Acknowledgments

- [Silero Models](https://github.com/snakers4/silero-vad) for the excellent VAD model
- [ONNX Runtime](https://onnxruntime.ai/) for model inference
- The open source community for supporting libraries 