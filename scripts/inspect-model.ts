import { ModelManager } from '../src/model-manager';

async function inspectModel() {
  try {
    console.log('🔍 Inspecting Silero VAD ONNX model...');
    
    // Ensure model exists
    const modelPath = await ModelManager.ensureModelExists();
    console.log(`Model path: ${modelPath}`);
    
    // Inspect model structure
    const modelInfo = await ModelManager.inspectModel(modelPath);
    
    console.log('\n📥 Model Inputs:');
    modelInfo.inputs.forEach((input, index) => {
      console.log(`  ${index + 1}. Name: "${input.name}"`);
      console.log(`     Type: ${input.type}`);
      console.log(`     Shape: [${input.shape.join(', ')}]`);
      console.log('');
    });
    
    console.log('📤 Model Outputs:');
    modelInfo.outputs.forEach((output, index) => {
      console.log(`  ${index + 1}. Name: "${output.name}"`);
      console.log(`     Type: ${output.type}`);
      console.log(`     Shape: [${output.shape.join(', ')}]`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error inspecting model:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  inspectModel();
} 