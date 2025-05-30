export interface VADOptions {
  /** Sample rate of the audio (supported: 8000, 16000) */
  sampleRate?: 8000 | 16000;
  /** Frame size in samples (supported: 256, 512, 768, 1024, 1536) */
  frameSize?: 256 | 512 | 768 | 1024 | 1536;
  /** Threshold for voice activity detection (0.0 - 1.0) */
  threshold?: number;
  /** Minimum speech duration in ms */
  minSpeechDurationMs?: number;
  /** Maximum silence duration in ms */
  maxSilenceDurationMs?: number;
  /** Path to custom ONNX model */
  modelPath?: string;
}

export interface VADResult {
  /** Probability of speech (0.0 - 1.0) */
  probability: number;
  /** Whether speech is detected based on threshold */
  isSpeech: boolean;
  /** Frame index */
  frame: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

export interface AudioSegment {
  /** Start time in milliseconds */
  start: number;
  /** End time in milliseconds */
  end: number;
  /** Audio data for this segment */
  audioData: Float32Array;
  /** Confidence score */
  confidence: number;
}

export interface VADState {
  /** Current frame index */
  currentFrame: number;
  /** Speech state */
  speechActive: boolean;
  /** Start of current speech segment */
  speechStart: number | null;
  /** Silence duration counter */
  silenceDuration: number;
  /** Speech duration counter */
  speechDuration: number;
} 