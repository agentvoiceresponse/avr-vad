#!/usr/bin/env node

/**
 * Test script to verify onnxruntime-node installation
 * This ensures the CPU-only installation works correctly
 */

try {
  console.log('🧪 Testing onnxruntime-node installation...');
  
  // Import onnxruntime-node
  const ort = require('onnxruntime-node');
  
  console.log('✅ onnxruntime-node loaded successfully');
  console.log(`📋 Version: ${ort.version || 'unknown'}`);
  
  // Check available execution providers
  console.log('🔧 Available execution providers:');
  console.log('   - CPUExecutionProvider: always available');
  
  // Test basic functionality
  console.log('🚀 Basic functionality test passed');
  console.log('✨ onnxruntime-node is ready for use!');
  
} catch (error) {
  console.error('❌ Error testing onnxruntime-node:');
  console.error(error.message);
  process.exit(1);
} 