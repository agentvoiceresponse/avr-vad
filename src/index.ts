export { SileroVAD } from './silero-vad';
export { AudioUtils } from './audio-utils';
export { ModelManager } from './model-manager';
export * from './types';

import { SileroVAD } from './silero-vad';
import { AudioUtils } from './audio-utils';
import { VADOptions, VADResult, AudioSegment } from './types';

// Main library class for easier usage
export class AVRVad extends SileroVAD {
  constructor(options?: VADOptions) {
    super(options);
  }
  
  /**
   * Quick start method that initializes the VAD and processes a WAV file
   */
  static async processWavFile(
    filePath: string, 
    options?: VADOptions
  ): Promise<{ 
    results: VADResult[]; 
    segments: AudioSegment[]; 
    audioData: Float32Array;
  }> {
    const vad = new AVRVad(options);
    await vad.initialize();
    
    try {
      // Load audio file
      const { audioData, sampleRate } = await AudioUtils.loadWavFile(filePath);
      
      // Resample if necessary
      const targetSampleRate = vad.getOptions().sampleRate;
      const processedAudio = sampleRate !== targetSampleRate 
        ? AudioUtils.resample(audioData, sampleRate, targetSampleRate)
        : audioData;
      
      // Process audio
      const results = await vad.processAudio(processedAudio);
      const segments = vad.extractSpeechSegments(results, processedAudio);
      
      return { results, segments, audioData: processedAudio };
      
    } finally {
      await vad.dispose();
    }
  }
} 