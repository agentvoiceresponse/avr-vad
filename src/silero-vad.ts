import { InferenceSession, Tensor } from 'onnxruntime-node';
import { VADOptions, VADResult, AudioSegment, VADState } from './types';
import { ModelManager } from './model-manager';

export class SileroVAD {
  private session: InferenceSession | null = null;
  protected options: Required<VADOptions>;
  private state: VADState;
  private h: Float32Array;
  private c: Float32Array;
  
  constructor(options: VADOptions = {}) {
    // Default options (use 1536 as frame size for Silero VAD)
    this.options = {
      sampleRate: 16000,
      frameSize: 1536, // Silero VAD uses 1536 samples per chunk
      threshold: 0.5,
      minSpeechDurationMs: 250,
      maxSilenceDurationMs: 2000,
      modelPath: '',
      ...options
    };
    
    // Initialize state
    this.state = {
      currentFrame: 0,
      speechActive: false,
      speechStart: null,
      silenceDuration: 0,
      speechDuration: 0
    };
    
    // Initialize LSTM states (2 layers, 128 units each, batch size 1)
    this.h = new Float32Array(2 * 1 * 128).fill(0); // (2, 1, 128)
    this.c = new Float32Array(2 * 1 * 128).fill(0); // (2, 1, 128)
    
    this.validateOptions();
  }
  
  private validateOptions(): void {
    const { sampleRate, frameSize, threshold } = this.options;
    
    if (![8000, 16000].includes(sampleRate)) {
      throw new Error('Sample rate must be 8000 or 16000 Hz');
    }
    
    // Silero VAD specifically uses 1536 samples
    if (frameSize !== 1536) {
      console.warn(`Frame size should be 1536 for Silero VAD, got ${frameSize}. Setting to 1536.`);
      this.options.frameSize = 1536;
    }
    
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
  }
  
  async initialize(): Promise<void> {
    try {
      const modelPath = await ModelManager.ensureModelExists(this.options.modelPath);
      
      if (!ModelManager.validateModelFile(modelPath)) {
        throw new Error('Invalid model file');
      }
      
      this.session = await InferenceSession.create(modelPath);
      console.log('Silero VAD model loaded successfully');
      
    } catch (error) {
      throw new Error(`Failed to initialize Silero VAD: ${error}`);
    }
  }
  
  async processFrame(audioFrame: Float32Array): Promise<VADResult> {
    if (!this.session) {
      throw new Error('VAD not initialized. Call initialize() first.');
    }
    
    if (audioFrame.length !== this.options.frameSize) {
      throw new Error(`Audio frame size must be ${this.options.frameSize}, got ${audioFrame.length}`);
    }
    
    try {
      // Based on Silero VAD documentation, the model expects:
      // - input: audio tensor (batch, sequence)
      // - state: LSTM states with rank 3
      // - sr: sample rate tensor
      
      // Prepare audio input tensor
      const inputTensor = new Tensor('float32', audioFrame, [1, audioFrame.length]);
      
      // State tensor with rank 3 - trying (2, 1, 128) format
      const stateTensor = new Tensor('float32', this.h, [2, 1, 128]);
      
      // Sample rate tensor
      const srTensor = new Tensor('int64', [BigInt(this.options.sampleRate)], [1]);
      
      // Run inference with correct input names based on Silero VAD docs
      const feeds = {
        input: inputTensor,
        state: stateTensor,
        sr: srTensor
      };
      
      const results = await this.session.run(feeds);
      
      // Extract outputs
      const probability = (results.output as Tensor).data[0] as number;
      
      // Update LSTM state if the model returns new state
      if (results.stateN) {
        const newState = results.stateN as Tensor;
        this.h.set(newState.data as Float32Array);
      }
      
      // Calculate timestamp
      const timestamp = this.state.currentFrame * (this.options.frameSize / this.options.sampleRate) * 1000;
      
      // Determine if speech is detected
      const isSpeech = probability >= this.options.threshold;
      
      // Update state
      this.updateState(isSpeech, timestamp);
      
      const result: VADResult = {
        probability,
        isSpeech,
        frame: this.state.currentFrame,
        timestamp
      };
      
      this.state.currentFrame++;
      
      return result;
      
    } catch (error) {
      throw new Error(`Error processing audio frame: ${error}`);
    }
  }
  
  private updateState(isSpeech: boolean, timestamp: number): void {
    const frameDurationMs = (this.options.frameSize / this.options.sampleRate) * 1000;
    
    if (isSpeech) {
      if (!this.state.speechActive) {
        // Start of new speech segment
        this.state.speechActive = true;
        this.state.speechStart = timestamp;
        this.state.speechDuration = 0;
      }
      
      this.state.speechDuration += frameDurationMs;
      this.state.silenceDuration = 0;
      
    } else {
      if (this.state.speechActive) {
        this.state.silenceDuration += frameDurationMs;
        
        // Check if silence duration exceeds threshold
        if (this.state.silenceDuration >= this.options.maxSilenceDurationMs) {
          this.state.speechActive = false;
          this.state.speechStart = null;
        }
      }
    }
  }
  
  async processAudio(audioData: Float32Array): Promise<VADResult[]> {
    const results: VADResult[] = [];
    const frameSize = this.options.frameSize;
    
    for (let i = 0; i < audioData.length; i += frameSize) {
      const frame = audioData.slice(i, i + frameSize);
      
      // Pad the last frame if necessary
      if (frame.length < frameSize) {
        const paddedFrame = new Float32Array(frameSize);
        paddedFrame.set(frame);
        const result = await this.processFrame(paddedFrame);
        results.push(result);
      } else {
        const result = await this.processFrame(frame);
        results.push(result);
      }
    }
    
    return results;
  }
  
  extractSpeechSegments(vadResults: VADResult[], audioData: Float32Array): AudioSegment[] {
    const segments: AudioSegment[] = [];
    let segmentStart: number | null = null;
    let speechFrames: number[] = [];
    
    for (const result of vadResults) {
      if (result.isSpeech) {
        if (segmentStart === null) {
          segmentStart = result.timestamp;
        }
        speechFrames.push(result.frame);
      } else {
        if (segmentStart !== null && speechFrames.length > 0) {
          // End of speech segment
          const segmentEnd = result.timestamp;
          const duration = segmentEnd - segmentStart;
          
          // Check minimum duration
          if (duration >= this.options.minSpeechDurationMs) {
            const startSample = Math.floor((segmentStart / 1000) * this.options.sampleRate);
            const endSample = Math.floor((segmentEnd / 1000) * this.options.sampleRate);
            
            const segmentAudio = audioData.slice(startSample, endSample);
            const confidence = speechFrames.reduce((sum, frame) => 
              sum + vadResults[frame].probability, 0) / speechFrames.length;
            
            segments.push({
              start: segmentStart,
              end: segmentEnd,
              audioData: segmentAudio,
              confidence
            });
          }
          
          segmentStart = null;
          speechFrames = [];
        }
      }
    }
    
    return segments;
  }
  
  reset(): void {
    this.state = {
      currentFrame: 0,
      speechActive: false,
      speechStart: null,
      silenceDuration: 0,
      speechDuration: 0
    };
    
    // Reset LSTM states
    this.h.fill(0);
    this.c.fill(0);
  }
  
  getState(): VADState {
    return { ...this.state };
  }
  
  getOptions(): Required<VADOptions> {
    return { ...this.options };
  }
  
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
} 