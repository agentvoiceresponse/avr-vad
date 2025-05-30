import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { InferenceSession } from 'onnxruntime-node';

export class ModelManager {
  private static readonly DEFAULT_MODEL_URL = 'https://github.com/snakers4/silero-vad/raw/master/src/silero_vad/data/silero_vad.onnx';
  private static readonly MODEL_DIR = path.join(__dirname, '..', 'models');
  private static readonly MODEL_FILENAME = 'silero_vad.onnx';
  
  static getModelPath(): string {
    return path.join(this.MODEL_DIR, this.MODEL_FILENAME);
  }
  
  static async ensureModelExists(customModelPath?: string): Promise<string> {
    if (customModelPath) {
      if (!fs.existsSync(customModelPath)) {
        throw new Error(`Custom model not found at: ${customModelPath}`);
      }
      return customModelPath;
    }
    
    const modelPath = this.getModelPath();
    
    if (fs.existsSync(modelPath)) {
      return modelPath;
    }
    
    console.log('Silero VAD model not found, downloading...');
    await this.downloadModel();
    return modelPath;
  }
  
  private static async downloadModel(): Promise<void> {
    try {
      // Create models directory if it doesn't exist
      if (!fs.existsSync(this.MODEL_DIR)) {
        fs.mkdirSync(this.MODEL_DIR, { recursive: true });
      }
      
      const response = await fetch(this.DEFAULT_MODEL_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }
      
      const buffer = await response.buffer();
      const modelPath = this.getModelPath();
      
      fs.writeFileSync(modelPath, buffer);
      console.log(`Model downloaded successfully to: ${modelPath}`);
      
    } catch (error) {
      throw new Error(`Failed to download Silero VAD model: ${error}`);
    }
  }
  
  static validateModelFile(modelPath: string): boolean {
    try {
      const stats = fs.statSync(modelPath);
      return stats.isFile() && stats.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Inspect the ONNX model to understand its input and output structure
   */
  static async inspectModel(modelPath: string): Promise<{
    inputs: Array<{ name: string; type: string; shape: number[] }>;
    outputs: Array<{ name: string; type: string; shape: number[] }>;
  }> {
    try {
      const session = await InferenceSession.create(modelPath);
      
      const inputs = session.inputNames.map(name => {
        const metadata = (session.inputMetadata as any)[name];
        return {
          name,
          type: metadata.type,
          shape: metadata.dims as number[]
        };
      });
      
      const outputs = session.outputNames.map(name => {
        const metadata = (session.outputMetadata as any)[name];
        return {
          name,
          type: metadata.type,
          shape: metadata.dims as number[]
        };
      });
      
      await session.release();
      
      return { inputs, outputs };
    } catch (error) {
      throw new Error(`Failed to inspect model: ${error}`);
    }
  }
} 