import type { OrtOptions } from "./common";
import {
  FrameProcessor,
  type FrameProcessorEvent,
  type FrameProcessorOptions,
  defaultLegacyFrameProcessorOptions,
  defaultV5FrameProcessorOptions,
  validateOptions,
} from "./common/frame-processor";
import { Message } from "./common/messages";
import {
  type ModelFactory,
  SileroLegacy,
  SileroV5,
  type SpeechProbabilities,
} from "./common/models";
import { Resampler } from "./common/resampler";
import { log } from "./common/logging";

export type ModelVersion = "v5" | "legacy";
export const DEFAULT_MODEL: ModelVersion = "v5";

/**
 * Callbacks for real-time VAD events
 */
export interface RealTimeVADCallbacks {
  onFrameProcessed: (
    probabilities: SpeechProbabilities,
    frame: Float32Array
  ) => void;
  onVADMisfire: () => void;
  onSpeechStart: () => void;
  onSpeechRealStart: () => void;
  onSpeechEnd: (audio: Float32Array) => void;
}

/**
 * Options for RealTimeVAD in Node environment
 */
export interface RealTimeVADOptions
  extends FrameProcessorOptions,
    RealTimeVADCallbacks,
    OrtOptions {
  /** Sample rate of the incoming audio; will be resampled to 16000Hz internally */
  sampleRate: number;
  /** Which Silero model to use: V5 or legacy */
  model?: ModelVersion;
}

/**
 * Build default options based on chosen model
 */
export function getDefaultRealTimeVADOptions(
  model: ModelVersion = DEFAULT_MODEL
): RealTimeVADOptions {
  const frameOpts =
    model === "v5"
      ? defaultV5FrameProcessorOptions
      : defaultLegacyFrameProcessorOptions;
  return {
    ...frameOpts,
    sampleRate: 16000,
    onFrameProcessed: () => {},
    onVADMisfire: () => {
      /* no-op */
    },
    onSpeechStart: () => {
      /* no-op */
    },
    onSpeechRealStart: () => {
      /* no-op */
    },
    onSpeechEnd: () => {
      /* no-op */
    },
    ortConfig: undefined,
    model,
  } as RealTimeVADOptions;
}

/**
 * RealTimeVAD processes raw audio buffers, frames, and emits events
 */
export class RealTimeVAD {
  private frameProcessor: FrameProcessor;
  private modelInstance: any;
  private buffer = new Float32Array(0);
  private frameSize: number;
  private active = false;
  private resampler: Resampler | null = null;

  /**
   * Construct a new instance with provided options and loaded model
   */
  protected constructor(
    private options: RealTimeVADOptions,
    modelInstance: any
  ) {
    this.modelInstance = modelInstance;
    this.frameSize = options.frameSamples;

    this.frameProcessor = new FrameProcessor(
      modelInstance.process,
      modelInstance.reset_state,
      {
        frameSamples: options.frameSamples,
        positiveSpeechThreshold: options.positiveSpeechThreshold,
        negativeSpeechThreshold: options.negativeSpeechThreshold,
        redemptionFrames: options.redemptionFrames,
        preSpeechPadFrames: options.preSpeechPadFrames,
        minSpeechFrames: options.minSpeechFrames,
        submitUserSpeechOnPause: options.submitUserSpeechOnPause,
      }
    );

    if (options.sampleRate > 16000) {
      this.resampler = new Resampler({
        nativeSampleRate: options.sampleRate,
        targetSampleRate: 16000,
        targetFrameSize: this.frameSize,
      });
    }
  }

  /**
   * Create and initialize a RealTimeVAD instance
   */
  static async new(
    ort: any,
    modelFetcher: () => Promise<ArrayBuffer>,
    opts: Partial<RealTimeVADOptions> = {}
  ): Promise<RealTimeVAD> {
    const fullOpts: RealTimeVADOptions = {
      ...getDefaultRealTimeVADOptions(opts.model),
      ...opts,
    };
    validateOptions(fullOpts);

    if (fullOpts.ortConfig) fullOpts.ortConfig(ort);

    const modelVersion: ModelVersion = fullOpts.model || DEFAULT_MODEL;
    const factory: ModelFactory =
      modelVersion === "v5" ? SileroV5.new : SileroLegacy.new;
    const modelInstance = await factory(ort, modelFetcher);

    return new RealTimeVAD(fullOpts, modelInstance);
  }

  /** Start processing incoming frames */
  start(): void {
    this.active = true;
    this.frameProcessor.resume();
  }

  /** Pause processing; may emit end-segment on pause */
  pause(): void {
    this.active = false;
    this.frameProcessor.pause(this.handleEvent);
  }

  /** Feed raw audio (any sample rate) into the VAD */
  async processAudio(audioData: Float32Array): Promise<void> {
    if (!this.active) return;

    let data = audioData;
    if (this.resampler) {
      const chunks: Float32Array[] = [];
      for await (const frame of this.resampler.stream(audioData)) {
        chunks.push(frame);
      }
      data = new Float32Array(chunks.reduce((sum, c) => sum + c.length, 0));
      let off = 0;
      for (const c of chunks) {
        data.set(c, off);
        off += c.length;
      }
    }

    // append to internal buffer
    const tmp = new Float32Array(this.buffer.length + data.length);
    tmp.set(this.buffer);
    tmp.set(data, this.buffer.length);
    this.buffer = tmp;

    // process complete frames
    while (this.buffer.length >= this.frameSize) {
      const frame = this.buffer.subarray(0, this.frameSize);
      this.buffer = this.buffer.subarray(this.frameSize);
      await this.frameProcessor.process(frame, this.handleEvent);
    }
  }

  /** Flush any remaining audio and end segment */
  async flush(): Promise<void> {
    if (this.buffer.length > 0 && this.buffer.length < this.frameSize) {
      const pad = new Float32Array(this.frameSize);
      pad.set(this.buffer);
      await this.frameProcessor.process(pad, this.handleEvent);
    }
    this.frameProcessor.endSegment(this.handleEvent);
    this.buffer = new Float32Array(0);
  }

  /** Reset internal state */
  reset(): void {
    this.buffer = new Float32Array(0);
    this.modelInstance.reset_state();
  }

  /** Handle events emitted by the frame processor */
  private handleEvent = (ev: FrameProcessorEvent): void => {
    switch (ev.msg) {
      case Message.FrameProcessed:
        this.options.onFrameProcessed(ev.probs!, ev.frame!);
        break;
      case Message.SpeechStart:
        this.options.onSpeechStart();
        break;
      case Message.SpeechRealStart:
        this.options.onSpeechRealStart();
        break;
      case Message.VADMisfire:
        this.options.onVADMisfire();
        break;
      case Message.SpeechEnd:
        this.options.onSpeechEnd(ev.audio!);
        break;
    }
  };

  /** Clean up resources */
  destroy(): void {
    this.pause();
    this.reset();
  }
}
