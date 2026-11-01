import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/db.js';
import { MODELS, SUPPORTED_DURATIONS, getClientConfig } from '../src/config.js';
import { planScenes, generateSingleScene, concatenateScenes } from '../src/videoEngine.js';
import { probeVideo } from '../src/ffmpegHelper.js';
import { worker } from '../src/worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeniorQASuite() {
  console.log('=====================================================');
  console.log('🧪 RUNNING SENIOR QA & VERIFICATION TEST SUITE');
  console.log('=====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => Promise<void> | void) {
    totalTests++;
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passedTests++;
      } catch (err: any) {
        console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
        throw err;
      }
    })();
  }

  // TEST 1: Model Max Clip Duration & Scene Planning
  await test('Scene planner respects model max clip duration and requested duration', () => {
    const model = MODELS['animagic-turbo'];
    assert.strictEqual(model.maxClipDuration, 5, 'Model max clip duration should be 5s');

    // 5s requested -> 1 scene
    const plan5 = planScenes('A mystical enchanted forest', 'Cinematic', '', 5, 'animagic-turbo');
    assert.strictEqual(plan5.length, 1, '5s should result in 1 scene');
    assert.strictEqual(plan5[0].duration, 5, 'Scene 1 should be 5s');

    // 10s requested -> 2 scenes of 5s each
    const plan10 = planScenes('Cyberpunk city rain', 'Cyberpunk / Neon', '', 10, 'animagic-turbo');
    assert.strictEqual(plan10.length, 2, '10s should result in 2 scenes');
    assert.strictEqual(plan10[0].duration + plan10[1].duration, 10, 'Total scene durations must equal 10s');

    // 15s requested -> 3 scenes of 5s each
    const plan15 = planScenes('Galactic nebula journey', 'Photorealistic 8K', '', 15, 'animagic-turbo');
    assert.strictEqual(plan15.length, 3, '15s should result in 3 scenes');
    assert.strictEqual(plan15.reduce((sum, s) => sum + s.duration, 0), 15, 'Total scene durations must equal 15s');

    // MiniMax with 6s max clip: 10s requested -> 2 scenes (5s + 5s)
    const planMiniMax = planScenes('Ancient temple ruins', 'Cinematic', '', 10, 'minimax-hailuo');
    assert.strictEqual(planMiniMax.length, 2, '10s with 6s max clip should plan 2 scenes');
    assert.strictEqual(planMiniMax.reduce((sum, s) => sum + s.duration, 0), 10, 'Sum of MiniMax scenes must equal 10s');
  });

  // TEST 2: Single Scene Generation with FFmpeg
  let testSceneFile = '';
  await test('Generates real 30fps MP4 scene with audio & motion', async () => {
    testSceneFile = await generateSingleScene({
      jobId: 'qa_test_job_1',
      sceneIndex: 0,
      duration: 3,
      prompt: 'QA Verification test - Golden hour ocean horizon',
      aspectRatio: '16:9',
      stylePreset: 'Cinematic',
      model: 'animagic-turbo'
    });

    assert(fs.existsSync(testSceneFile), 'Generated scene file must exist on disk');
    const stat = fs.statSync(testSceneFile);
    assert(stat.size > 20000, `Generated file size must be substantial (>20KB), got: ${stat.size} bytes`);

    const probe = await probeVideo(testSceneFile);
    assert(probe.hasVideo, 'Probe must detect valid video stream');
    assert(probe.hasAudio, 'Probe must detect valid audio stream');
    assert.strictEqual(probe.videoCodec, 'h264', 'Video codec must be h264');
    assert.strictEqual(probe.width, 1280, '16:9 width must be 1280');
    assert.strictEqual(probe.height, 720, '16:9 height must be 720');
    assert(probe.fps >= 29, `Frame rate must be >= 29fps, got: ${probe.fps}`);
    assert(Math.abs(probe.duration - 3.0) <= 0.3, `Scene duration must match 3s, got: ${probe.duration}`);
  });

  // TEST 3: Multi-Scene Generation and FFmpeg Concatenation
  let finalVideoPath = '';
  await test('Generates multi-scene clips and concatenates via FFmpeg into seamless stream', async () => {
    // Generate second scene
    const scene2File = await generateSingleScene({
      jobId: 'qa_test_job_1',
      sceneIndex: 1,
      duration: 3,
      prompt: 'QA Verification test - Deep ocean bioluminescence',
      aspectRatio: '16:9',
      stylePreset: 'Cinematic',
      model: 'animagic-turbo'
    });

    // Concatenate scene 1 (3s) and scene 2 (3s) -> total 6s
    const concatResult = await concatenateScenes({
      jobId: 'qa_test_job_1',
      userId: 'usr_guest_demo',
      scenePaths: [testSceneFile, scene2File],
      requestedDuration: 6,
      prompt: 'Complete Ocean Odyssey',
      model: 'animagic-turbo',
      aspectRatio: '16:9'
    });

    finalVideoPath = concatResult.finalFilePath;
    assert(fs.existsSync(finalVideoPath), 'Concatenated video must exist');

    const probe = concatResult.probe;
    assert.strictEqual(probe.videoCodec, 'h264', 'Concatenated video codec must be h264');
    assert(probe.hasAudio, 'Concatenated video must have audio');
    // Verify duration tolerance (+/- 0.5s)
    const tolerance = 0.5;
    const diff = Math.abs(probe.duration - 6.0);
    assert(diff <= tolerance, `Final duration must match 6.0s within 0.5s tolerance, got: ${probe.duration}s (diff: ${diff.toFixed(2)}s)`);
  });

  // TEST 4: Job Persistence & Status Transitions in DB
  await test('Job creation, status updates, and video record persistence', () => {
    const testJob = db.createJob({
      id: 'job_qa_persistence_1',
      userId: 'usr_guest_demo',
      prompt: 'Bioluminescent jellyfish in underwater cave',
      model: 'animagic-turbo',
      requestedDuration: 10,
      aspectRatio: '16:9',
      stylePreset: 'Cyberpunk / Neon',
      status: 'queued',
      progress: 0,
      currentStep: 'In queue',
      sceneCount: 2,
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    assert.strictEqual(testJob.status, 'queued');

    // Update job
    db.updateJob(testJob.id, {
      status: 'processing',
      progress: 50,
      currentStep: 'Generating Scene 1/2'
    });

    const retrieved = db.getJob(testJob.id);
    assert.strictEqual(retrieved?.status, 'processing');
    assert.strictEqual(retrieved?.progress, 50);

    // Clean up test job
    db.deleteJob(testJob.id);
  });

  // TEST 5: Job Cancellation and Retry
  await test('Supports job cancellation and retry mechanics', () => {
    const cancelJob = db.createJob({
      id: 'job_qa_cancel_test',
      userId: 'usr_guest_demo',
      prompt: 'Futuristic hyperloop transit',
      model: 'animagic-turbo',
      requestedDuration: 15,
      aspectRatio: '16:9',
      stylePreset: 'Cinematic',
      status: 'queued',
      progress: 0,
      currentStep: 'In queue',
      sceneCount: 3,
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    worker.enqueue(cancelJob.id);
    const cancelSuccess = worker.cancel(cancelJob.id);
    assert.strictEqual(cancelSuccess, true, 'Cancellation should return true');

    const cancelledState = db.getJob(cancelJob.id);
    assert.strictEqual(cancelledState?.status, 'cancelled', 'Job status must be cancelled');

    // Test retry
    const retrySuccess = worker.retry(cancelJob.id);
    assert.strictEqual(retrySuccess, true, 'Retry should return true');

    const retriedState = db.getJob(cancelJob.id);
    assert.strictEqual(retriedState?.status, 'queued', 'Retried job must be queued');

    // Clean up
    worker.cancel(cancelJob.id);
    db.deleteJob(cancelJob.id);
  });

  // TEST 6: Security Audit - Zero API Key Leaks to Frontend
  await test('Client config DTO does not leak secret API keys or credentials', () => {
    // Set a dummy key in env to test masking
    process.env.RUNWAY_API_SECRET = 'secret_runway_key_123456';
    const clientConfig = getClientConfig();

    const jsonString = JSON.stringify(clientConfig);
    assert(!jsonString.includes('secret_runway_key_123456'), 'API keys must NEVER appear in client config response');

    // Runway model should be flagged isConfigured: true, without leaking the key
    const runwayModel = clientConfig.models.find(m => m.id === 'runway-gen3');
    assert(runwayModel?.isConfigured === true, 'Runway should be marked isConfigured: true');
    assert.strictEqual(runwayModel?.requiresKeyName, 'RUNWAY_API_SECRET', 'Safe key name metadata is reported');

    // Clean up dummy key
    delete process.env.RUNWAY_API_SECRET;
  });

  // TEST 7: Aspect Ratio Resolution Handling
  await test('Verifies aspect ratios: 16:9, 9:16, 1:1', () => {
    const landscape = planScenes('test', 'Cinematic', '', 5, 'animagic-turbo');
    assert.strictEqual(landscape[0].duration, 5);

    const config = getClientConfig();
    const turbo = config.models.find(m => m.id === 'animagic-turbo');
    assert(turbo?.supportedAspectRatios.includes('16:9'));
    assert(turbo?.supportedAspectRatios.includes('9:16'));
    assert(turbo?.supportedAspectRatios.includes('1:1'));
  });

  console.log('\n=====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('=====================================================\n');
}

runSeniorQASuite().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
