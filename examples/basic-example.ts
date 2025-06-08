import { AVRVad, SileroVAD, AudioUtils } from '../src';

async function basicExample() {
  console.log('🎤 AVR VAD - Silero Voice Activity Detection Example');
  console.log('='.repeat(50));
  
  try {
    // Method 1: Quick processing of a WAV file
    console.log('\n📁 Method 1: Quick WAV file processing');
    const result = await AVRVad.processWavFile('./examples/audio/testaudio_8000_test01_20s.wav', {
      threshold: 0.5,
      sampleRate: 8000
    });
    
    console.log(`Found ${result.segments.length} speech segments`);
    
    // Method 2: Manual processing with more control
    console.log('\n🔧 Method 2: Manual processing');
    
    const vad = new SileroVAD({
      sampleRate: 8000,
      frameSize: 1536, // Silero VAD optimal frame size
      threshold: 0.5,
      minSpeechDurationMs: 250,
      maxSilenceDurationMs: 2000
    });
    
    // Initialize the VAD
    console.log('Initializing Silero VAD...');
    await vad.initialize();
    console.log('✅ VAD initialized successfully!');
    
    // Method 3: Generate sample audio for testing
    console.log('\n🎵 Method 3: Processing synthetic audio');
    const sampleAudio = generateSampleAudio();
    
    console.log(`Processing ${sampleAudio.length} samples...`);
    const vadResults = await vad.processAudio(sampleAudio);
    
    console.log('\n📊 VAD Results:');
    console.log(`Total frames processed: ${vadResults.length}`);
    
    const speechFrames = vadResults.filter(r => r.isSpeech);
    console.log(`Speech frames detected: ${speechFrames.length}`);
    console.log(`Speech percentage: ${((speechFrames.length / vadResults.length) * 100).toFixed(2)}%`);
    
    if (speechFrames.length > 0) {
      const avgConfidence = speechFrames.reduce((sum, r) => sum + r.probability, 0) / speechFrames.length;
      console.log(`Average confidence: ${(avgConfidence * 100).toFixed(2)}%`);
    }
    
    // Extract speech segments
    const segments = vad.extractSpeechSegments(vadResults, sampleAudio);
    console.log(`\n🗣️ Speech segments found: ${segments.length}`);
    
    segments.forEach((segment, index) => {
      console.log(`  Segment ${index + 1}:`);
      console.log(`    Duration: ${(segment.end - segment.start).toFixed(0)}ms`);
      console.log(`    Confidence: ${(segment.confidence * 100).toFixed(2)}%`);
      console.log(`    Audio samples: ${segment.audioData.length}`);
    });
    
    // Method 4: Frame-by-frame processing
    console.log('\n🎯 Method 4: Frame-by-frame processing');
    vad.reset(); // Reset state for new processing
    
    const frameSize = 1536; // Use correct Silero VAD frame size
    const frames = AudioUtils.createFrames(sampleAudio, frameSize);
    
    console.log(`Processing ${frames.length} frames individually...`);
    
    let speechFrameCount = 0;
    for (let i = 0; i < Math.min(10, frames.length); i++) { // Process first 10 frames as example
      const result = await vad.processFrame(frames[i]);
      if (result.isSpeech) speechFrameCount++;
      
      console.log(`Frame ${i}: ${result.isSpeech ? '🗣️' : '🔇'} (${(result.probability * 100).toFixed(1)}%)`);
    }
    
    console.log(`\n📈 Summary: ${speechFrameCount}/10 frames contained speech`);
    
    // Show current VAD state
    const state = vad.getState();
    console.log('\n🔍 Current VAD State:');
    console.log(`  Current frame: ${state.currentFrame}`);
    console.log(`  Speech active: ${state.speechActive ? 'Yes' : 'No'}`);
    console.log(`  Speech duration: ${state.speechDuration.toFixed(0)}ms`);
    console.log(`  Silence duration: ${state.silenceDuration.toFixed(0)}ms`);
    
    // Clean up
    await vad.dispose();
    console.log('\n✅ VAD disposed successfully');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Generate synthetic audio data for testing
function generateSampleAudio(): Float32Array {
  const sampleRate = 8000;
  const durationSeconds = 3; // 3 seconds
  const samples = sampleRate * durationSeconds;
  const audio = new Float32Array(samples);
  
  // Generate pattern: 1 second of speech, 1 second of silence, 1 second of speech
  for (let i = 0; i < samples; i++) {
    const timeSeconds = i / sampleRate;
    
    if ((timeSeconds < 1.0) || (timeSeconds >= 2.0 && timeSeconds < 3.0)) {
      // Simulate speech with a combination of sine waves
      const freq1 = 440; // A4 note
      const freq2 = 880; // A5 note
      audio[i] = 0.3 * (
        Math.sin(2 * Math.PI * freq1 * timeSeconds) +
        0.5 * Math.sin(2 * Math.PI * freq2 * timeSeconds) +
        0.1 * Math.random() // Add some noise
      );
    } else {
      // Silence with minimal noise
      audio[i] = 0.01 * (Math.random() - 0.5);
    }
  }
  
  return audio;
}

// Additional utility function to demonstrate real-time processing
async function realTimeExample() {
  console.log('\n🔴 Real-time processing simulation');
  
  const vad = new SileroVAD({
    sampleRate: 8000,
    frameSize: 1536, // Correct frame size for Silero VAD
    threshold: 0.3
  });
  
  await vad.initialize();
  
  const frameSize = 1536;
  const sampleRate = 8000;
  const frameDurationMs = (frameSize / sampleRate) * 1000;
  
  console.log(`Frame size: ${frameSize} samples`);
  console.log(`Frame duration: ${frameDurationMs.toFixed(1)}ms`);
  console.log('Simulating real-time audio frames...\n');
  
  // Simulate 20 frames of audio
  for (let i = 0; i < 20; i++) {
    // Generate random audio frame (in real app, this would come from microphone)
    const frame = new Float32Array(frameSize);
    const isSpeechFrame = Math.random() > 0.6; // 40% chance of speech
    
    for (let j = 0; j < frameSize; j++) {
      if (isSpeechFrame) {
        frame[j] = 0.2 * Math.sin(2 * Math.PI * 440 * j / sampleRate) + 0.05 * (Math.random() - 0.5);
      } else {
        frame[j] = 0.02 * (Math.random() - 0.5); // Background noise
      }
    }
    
    const result = await vad.processFrame(frame);
    const timestamp = (i * frameDurationMs).toFixed(0).padStart(4, ' ');
    const probability = (result.probability * 100).toFixed(1).padStart(5, ' ');
    const status = result.isSpeech ? '🗣️ SPEECH' : '🔇 SILENCE';
    
    console.log(`[${timestamp}ms] ${status} (${probability}%)`);
    
    // Simulate real-time delay
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  await vad.dispose();
}

// Run the examples
if (require.main === module) {
  (async () => {
    await basicExample();
    await realTimeExample();
    console.log('\n🎉 All examples completed successfully!');
  })();
} 