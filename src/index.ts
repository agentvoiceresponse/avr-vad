import * as fs from "node:fs/promises";
import * as ort from "onnxruntime-node";
import {
  FrameProcessor,
  type FrameProcessorOptions,
  Message,
  Resampler,
  utils,
} from "./common";

import {
  RealTimeVAD as BaseRealTimeVAD,
  DEFAULT_MODEL,
  type RealTimeVADOptions,
  getDefaultRealTimeVADOptions,
} from "./real-time-vad";

const LEGACY_MODEL_PATH = `${__dirname}/silero_vad_legacy.onnx`;
const V5_MODEL_PATH = `${__dirname}/silero_vad_v5.onnx`;

const fetchLegacyModel = async (): Promise<ArrayBuffer> => {
  const data = await fs.readFile(LEGACY_MODEL_PATH);
  return data.buffer;
};

const fetchV5Model = async (): Promise<ArrayBuffer> => {
  const data = await fs.readFile(V5_MODEL_PATH);
  return data.buffer;
};

export { NonRealTimeVAD } from "./common/non-real-time-vad";
export type { NonRealTimeVADOptions } from "./common/non-real-time-vad";

/**
 * RealTimeVAD with selectable model version (v5 default)
 */
export class RealTimeVAD extends BaseRealTimeVAD {
  static override async new(
    options: Partial<RealTimeVADOptions> = {}
  ): Promise<RealTimeVAD> {
    // determine which model to use
    const modelVersion = options.model ?? DEFAULT_MODEL;
    const fetcher = modelVersion === "v5" ? fetchV5Model : fetchLegacyModel;
    // build full defaults including correct frame processor opts
    const defaults = getDefaultRealTimeVADOptions(modelVersion);
    const opts = { ...defaults, ...options };
    return BaseRealTimeVAD.new(ort, fetcher, opts) as Promise<RealTimeVAD>;
  }
}

export {
  DEFAULT_MODEL,
  FrameProcessor,
  Message,
  Resampler,
  getDefaultRealTimeVADOptions,
  utils,
};
export type { FrameProcessorOptions, RealTimeVADOptions };
