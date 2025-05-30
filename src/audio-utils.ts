import * as fs from 'fs';
import * as wav from 'wav';

export class AudioUtils {
  /**
   * Load audio from a WAV file
   */
  static async loadWavFile(filePath: string): Promise<{ audioData: Float32Array; sampleRate: number }> {
    return new Promise((resolve, reject) => {
      try {
        const file = fs.createReadStream(filePath);
        const reader = new wav.Reader();
        
        let audioData: Buffer[] = [];
        let format: any = null;
        
        reader.on('format', (fmt) => {
          format = fmt;
        });
        
        reader.on('data', (chunk) => {
          audioData.push(chunk);
        });
        
        reader.on('end', () => {
          if (!format) {
            reject(new Error('Failed to read audio format'));
            return;
          }
          
          const buffer = Buffer.concat(audioData);
          const samples = AudioUtils.bufferToFloat32Array(buffer, format);
          
          resolve({
            audioData: samples,
            sampleRate: format.sampleRate
          });
        });
        
        reader.on('error', (err) => {
          reject(err);
        });
        
        file.pipe(reader);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Convert buffer to Float32Array based on audio format
   */
  private static bufferToFloat32Array(buffer: Buffer, format: any): Float32Array {
    const { bitDepth, channels } = format;
    let samples: Float32Array;
    
    if (bitDepth === 16) {
      const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
      samples = new Float32Array(int16Array.length);
      
      for (let i = 0; i < int16Array.length; i++) {
        samples[i] = int16Array[i] / 32768.0; // Normalize to [-1, 1]
      }
    } else if (bitDepth === 32) {
      const int32Array = new Int32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
      samples = new Float32Array(int32Array.length);
      
      for (let i = 0; i < int32Array.length; i++) {
        samples[i] = int32Array[i] / 2147483648.0; // Normalize to [-1, 1]
      }
    } else {
      throw new Error(`Unsupported bit depth: ${bitDepth}`);
    }
    
    // Convert to mono if stereo
    if (channels === 2) {
      const monoSamples = new Float32Array(samples.length / 2);
      for (let i = 0; i < monoSamples.length; i++) {
        monoSamples[i] = (samples[i * 2] + samples[i * 2 + 1]) / 2;
      }
      return monoSamples;
    }
    
    return samples;
  }
  
  /**
   * Resample audio to target sample rate (simple linear interpolation)
   */
  static resample(audioData: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
    if (sourceSampleRate === targetSampleRate) {
      return audioData;
    }
    
    const ratio = sourceSampleRate / targetSampleRate;
    const outputLength = Math.floor(audioData.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;
      
      if (index + 1 < audioData.length) {
        // Linear interpolation
        output[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
      } else {
        output[i] = audioData[index];
      }
    }
    
    return output;
  }
  
  /**
   * Apply a simple high-pass filter to remove DC offset
   */
  static highPassFilter(audioData: Float32Array, cutoffFreq: number = 80, sampleRate: number = 16000): Float32Array {
    const rc = 1.0 / (cutoffFreq * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alpha = rc / (rc + dt);
    
    const filtered = new Float32Array(audioData.length);
    let prevInput = 0;
    let prevOutput = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      filtered[i] = alpha * (prevOutput + audioData[i] - prevInput);
      prevInput = audioData[i];
      prevOutput = filtered[i];
    }
    
    return filtered;
  }
  
  /**
   * Normalize audio amplitude
   */
  static normalize(audioData: Float32Array, targetPeak: number = 0.95): Float32Array {
    let maxAbs = 0;
    for (let i = 0; i < audioData.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(audioData[i]));
    }
    
    if (maxAbs === 0) {
      return audioData;
    }
    
    const scale = targetPeak / maxAbs;
    const normalized = new Float32Array(audioData.length);
    
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] * scale;
    }
    
    return normalized;
  }
  
  /**
   * Split audio into overlapping frames
   */
  static createFrames(audioData: Float32Array, frameSize: number, hopSize?: number): Float32Array[] {
    const hop = hopSize || frameSize;
    const frames: Float32Array[] = [];
    
    for (let i = 0; i <= audioData.length - frameSize; i += hop) {
      const frame = audioData.slice(i, i + frameSize);
      frames.push(frame);
    }
    
    return frames;
  }
} 