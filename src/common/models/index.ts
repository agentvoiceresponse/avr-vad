// Import necessary types
import type { OrtConfigurer } from "./common";

// Re-export all common types explicitly
export type { 
  ModelFetcher,
  SpeechProbabilities,
  OrtConfigurer,
  OrtModule,
  ModelFactory,
  Model
} from "./common";

// Export model classes
export { SileroLegacy } from "./legacy";
export { SileroV5 } from "./v5";

// Define and export OrtOptions interface
export interface OrtOptions {
  ortConfig?: OrtConfigurer;
}
