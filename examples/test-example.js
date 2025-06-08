const { AVRVad, SileroVAD, AudioUtils } = require('../lib');

/**
 * AVR VAD Library Test
 * Practical example to verify functionality
 */
async function testAVRVad() {
  console.log('🎤 AVR VAD - Voice Activity Detection Library Test');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Basic initialization
    console.log('\n📦 Test 1: VAD Initialization');
    
    const vad = new SileroVAD({
      sampleRate: 8000,
      frameSize: 320,
      threshold: 0.5,
      minSpeechDurationMs: 250,
      maxSilenceDurationMs: 2000
    });
    
    console.log('Initializing...');
    await vad.initialize();
    console.log('✅ VAD initialized successfully!');
    
    // Test 2: Generate synthetic audio for testing
    console.log('\n🎵 Test 2: Test audio generation');
    const testAudio = generateTestAudio();
    console.log(`Audio generated: ${testAudio.length} samples (${testAudio.length / 8000} seconds)`);
    
    // Test 3: Complete audio processing
    console.log('\n🔍 Test 3: Complete audio processing');
    const results = await vad.processAudio(testAudio);
    
    const speechFrames = results.filter(r => r.isSpeech);
    const speechPercentage = ((speechFrames.length / results.length) * 100).toFixed(2);
    
    console.log(`📊 Processing results:`);
    console.log(`   Total frames: ${results.length}`);
    console.log(`   Speech frames: ${speechFrames.length}`);
    console.log(`   Speech percentage: ${speechPercentage}%`);
    
    if (speechFrames.length > 0) {
      const averageConfidence = speechFrames.reduce((sum, r) => sum + r.probability, 0) / speechFrames.length;
      console.log(`   Average confidence: ${(averageConfidence * 100).toFixed(2)}%`);
    }
    
    // Test 4: Speech segment extraction
    console.log('\n🗣️ Test 4: Speech segment extraction');
    const segments = vad.extractSpeechSegments(results, testAudio);
    console.log(`Speech segments found: ${segments.length}`);
    
    segments.forEach((segment, index) => {
      const duration = segment.end - segment.start;
      console.log(`   Segment ${index + 1}: ${duration.toFixed(0)}ms (confidence: ${(segment.confidence * 100).toFixed(1)}%)`);
    });
    
    // Test 5: Frame-by-frame processing
    console.log('\n🎯 Test 5: Frame-by-frame processing');
    vad.reset();
    
    const frames = AudioUtils.createFrames(testAudio, 1536);
    console.log(`Processing ${Math.min(15, frames.length)} frames...`);
    
    let speechCounter = 0;
    for (let i = 0; i < Math.min(15, frames.length); i++) {
      const result = await vad.processFrame(frames[i]);
      if (result.isSpeech) speechCounter++;
      
      const emoji = result.isSpeech ? '🗣️' : '🔇';
      const confidence = (result.probability * 100).toFixed(1);
      console.log(`   Frame ${i + 1}: ${emoji} ${confidence}%`);
    }
    
    console.log(`\n📈 Summary: ${speechCounter}/${Math.min(15, frames.length)} frames with speech`);
    
    // Test 6: Current VAD state
    console.log('\n📋 Test 6: VAD State');
    const state = vad.getState();
    console.log(`   Current frame: ${state.currentFrame}`);
    console.log(`   Speech active: ${state.speechActive ? 'Yes' : 'No'}`);
    console.log(`   Speech duration: ${state.speechDuration.toFixed(0)}ms`);
    console.log(`   Silence duration: ${state.silenceDuration.toFixed(0)}ms`);
    
    // Test 7: Real-time simulation
    await realTimeSimulation();
    
    // Cleanup
    await vad.dispose();
    console.log('\n✅ VAD closed successfully');
    
  } catch (error) {
    console.error('\n❌ Error during tests:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Generate synthetic audio for testing
 * Creates a pattern: 1 sec speech, 1 sec silence, 1 sec speech
 */
function generateTestAudio() {
  const sampleRate = 8000;
  const durationSeconds = 3;
  const samples = sampleRate * durationSeconds;
  const audio = new Float32Array(samples);
  
  console.log('Generating pattern: Speech(1s) → Silence(1s) → Speech(1s)');
  
  for (let i = 0; i < samples; i++) {
    const timeSeconds = i / sampleRate;
    
    // First and third seconds: simulate speech with sine waves
    if ((timeSeconds < 1.0) || (timeSeconds >= 2.0 && timeSeconds < 3.0)) {
      const freq1 = 440; // A4
      const freq2 = 880; // A5
      const freq3 = 220; // A3
      
      audio[i] = 0.25 * (
        Math.sin(2 * Math.PI * freq1 * timeSeconds) +
        0.6 * Math.sin(2 * Math.PI * freq2 * timeSeconds) +
        0.3 * Math.sin(2 * Math.PI * freq3 * timeSeconds) +
        0.1 * (Math.random() - 0.5) // Natural noise
      );
    } else {
      // Central second: silence with minimal background noise
      audio[i] = 0.005 * (Math.random() - 0.5);
    }
  }
  
  return audio;
}

/**
 * Simulate real-time processing
 */
async function realTimeSimulation() {
  console.log('\n🔴 Test 7: Real-time simulation');
  
  const vad = new SileroVAD({
    sampleRate: 8000,
    frameSize: 1536,
    threshold: 0.3 // Lower threshold for real-time
  });
  
  await vad.initialize();
  
  const frameSize = 1536;
  const sampleRate = 8000;
  const frameDurationMs = (frameSize / sampleRate) * 1000;
  
  console.log(`Frame size: ${frameSize} samples`);
  console.log(`Frame duration: ${frameDurationMs.toFixed(1)}ms`);
  console.log('Simulating 10 audio frames...\n');
  
  let speechFrames = 0;
  
  for (let i = 0; i < 10; i++) {
    // Simulate random audio frame (in real app would come from microphone)
    const frame = new Float32Array(frameSize);
    const hasSpeech = Math.random() > 0.7; // 30% chance of speech
    
    // Generate frame content
    for (let j = 0; j < frameSize; j++) {
      if (hasSpeech) {
        // Simulate speech with multiple frequencies
        const time = j / sampleRate;
        frame[j] = 0.2 * (
          Math.sin(2 * Math.PI * 300 * time) +
          0.7 * Math.sin(2 * Math.PI * 600 * time)
        ) + 0.03 * (Math.random() - 0.5);
      } else {
        // Background noise only
        frame[j] = 0.01 * (Math.random() - 0.5);
      }
    }
    
    const result = await vad.processFrame(frame);
    if (result.isSpeech) speechFrames++;
    
    const timestamp = (i * frameDurationMs).toFixed(0).padStart(4, ' ');
    const probability = (result.probability * 100).toFixed(1).padStart(5, ' ');
    const status = result.isSpeech ? '🗣️ SPEECH' : '🔇 SILENCE';
    
    console.log(`[${timestamp}ms] ${status} (${probability}%)`);
    
    // Simulate real-time delay
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  
  console.log(`\n📊 Simulation result: ${speechFrames}/10 frames with speech`);
  await vad.dispose();
}

/**
 * Test with WAV file (commented because it requires an audio file)
 */
async function testWithWavFile() {
  console.log('\n📁 Optional test: WAV file processing');
  try {
    const result = await AVRVad.processWavFile('./examples/audio/testaudio_8000_test01_20s.wav', {
      threshold: 0.5,
      sampleRate: 8000
    });
    
    console.log(`✅ File processed successfully!`);
    console.log(`Speech segments found: ${result.segments.length}`);
    
    result.segments.forEach((segment, i) => {
      console.log(`Segment ${i + 1}: ${segment.start}ms - ${segment.end}ms`);
    });
    
  } catch (error) {
    console.log(`⚠️ WAV file not found or error: ${error.message}`);
  }
}

/**
 * Show library information
 */
function showInfo() {
  console.log('\n📚 AVR VAD Library Information');
  console.log('─'.repeat(40));
  console.log('• Based on Silero VAD (ONNX model)');
  console.log('• Supports sample rates: 8kHz, 16kHz');
  console.log('• Optimal frame size: 1536 samples');
  console.log('• Real-time and batch processing');
  console.log('• Automatic speech segment extraction');
  console.log('• Integrated audio utilities (resample, filters)');
}

// Main execution
if (require.main === module) {
  (async () => {
    try {
      showInfo();
      await testAVRVad();
      await testWithWavFile();
      console.log('\n🎉 All tests completed successfully!');
      console.log('\n💡 Tips:');
      console.log('   - Adjust threshold for different sensitivity');
      console.log('   - Use 16kHz WAV files for optimal results');
      console.log('   - For real-time, process 1536-sample frames');
      
    } catch (error) {
      console.error('\n💥 General error:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  testAVRVad,
  generateTestAudio,
  realTimeSimulation
}; 