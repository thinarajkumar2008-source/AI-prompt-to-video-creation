import EventEmitter from 'events';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db, GenerationJob, SceneMeta, VideoRecord } from './db.js';
import { planScenes, generateSingleScene, concatenateScenes } from './videoEngine.js';

class JobQueueWorker extends EventEmitter {
  private queue: string[] = []; // Job IDs
  private isProcessing: boolean = false;
  private activeControllers: Map<string, AbortController> = new Map();

  constructor() {
    super();
    // Check for any jobs that were queued before server restart
    setTimeout(() => this.resumeUnfinishedJobs(), 1000);
  }

  private resumeUnfinishedJobs() {
    const jobs = db.getAllJobs();
    for (const job of jobs) {
      if (job.status === 'queued') {
        this.enqueue(job.id);
      } else if (job.status === 'processing' || job.status === 'concatenating') {
        // Mark as failed from previous crash or reset to queued
        db.updateJob(job.id, {
          status: 'queued',
          progress: 0,
          currentStep: 'Resumed in queue after worker restart'
        });
        this.enqueue(job.id);
      }
    }
  }

  public enqueue(jobId: string) {
    if (!this.queue.includes(jobId)) {
      this.queue.push(jobId);
      this.emit('jobQueued', { jobId, position: this.queue.length });
    }
    this.processNext();
  }

  public getQueuePosition(jobId: string): number {
    const idx = this.queue.indexOf(jobId);
    return idx === -1 ? 0 : idx + 1;
  }

  public cancel(jobId: string): boolean {
    // 1. If currently active, abort
    const controller = this.activeControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(jobId);
    }

    // 2. Remove from queue if waiting
    const qIdx = this.queue.indexOf(jobId);
    if (qIdx !== -1) {
      this.queue.splice(qIdx, 1);
    }

    // 3. Update DB
    db.updateJob(jobId, {
      status: 'cancelled',
      currentStep: 'Generation cancelled by user',
      error: 'Job was cancelled'
    });

    this.emit(`job:${jobId}`, { status: 'cancelled', progress: 0, currentStep: 'Cancelled by user' });
    return true;
  }

  public retry(jobId: string): boolean {
    const job = db.getJob(jobId);
    if (!job) return false;

    if (job.status !== 'failed' && job.status !== 'cancelled') {
      return false; // Can only retry failed or cancelled jobs
    }

    db.updateJob(jobId, {
      status: 'queued',
      progress: 0,
      currentStep: 'Re-queued for generation',
      error: undefined,
      scenes: []
    });

    this.enqueue(jobId);
    return true;
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const jobId = this.queue.shift()!;
    const job = db.getJob(jobId);

    if (!job || job.status === 'cancelled') {
      this.isProcessing = false;
      this.processNext();
      return;
    }

    const abortController = new AbortController();
    this.activeControllers.set(jobId, abortController);

    try {
      await this.executeJob(job, abortController);
    } catch (err: any) {
      if (abortController.signal.aborted || err.message?.includes('cancelled')) {
        console.log(`[Worker] Job ${jobId} was aborted/cancelled.`);
        db.updateJob(jobId, {
          status: 'cancelled',
          currentStep: 'Cancelled',
          error: 'Job was cancelled'
        });
      } else {
        console.error(`[Worker] Error processing job ${jobId}:`, err);
        db.updateJob(jobId, {
          status: 'failed',
          currentStep: 'Failed',
          error: err.message || 'Generation failed'
        });
        this.emit(`job:${jobId}`, { status: 'failed', error: err.message });
      }
    } finally {
      this.activeControllers.delete(jobId);
      this.isProcessing = false;
      // Process next queued job
      setImmediate(() => this.processNext());
    }
  }

  private async executeJob(job: GenerationJob, abortController: AbortController) {
    const signal = abortController.signal;

    // 1. Scene Planning
    const plans = planScenes(
      job.prompt,
      job.stylePreset,
      job.cameraMovement || '',
      job.requestedDuration,
      job.model
    );

    const initialScenes: SceneMeta[] = plans.map(p => ({
      index: p.index,
      duration: p.duration,
      prompt: p.prompt,
      status: 'pending'
    }));

    db.updateJob(job.id, {
      status: 'processing',
      progress: 5,
      currentStep: `Planned ${plans.length} scene(s) for ${job.requestedDuration}s total duration`,
      sceneCount: plans.length,
      scenes: initialScenes
    });

    this.emit(`job:${job.id}`, {
      status: 'processing',
      progress: 5,
      currentStep: `Planned ${plans.length} scene(s)`
    });

    // 2. Generate each scene
    const generatedScenePaths: string[] = [];
    const totalScenes = plans.length;

    for (let i = 0; i < totalScenes; i++) {
      if (signal.aborted) throw new Error('Cancelled by user');

      const plan = plans[i];
      const startSceneProgress = 10 + Math.round((i / totalScenes) * 70);
      const endSceneProgress = 10 + Math.round(((i + 1) / totalScenes) * 70);

      // Update scene status to generating
      const updatedScenes = [...db.getJob(job.id)!.scenes];
      updatedScenes[i].status = 'generating';

      db.updateJob(job.id, {
        progress: startSceneProgress,
        currentStep: `Synthesizing Scene ${i + 1} of ${totalScenes} (${plan.duration}s)...`,
        scenes: updatedScenes
      });

      this.emit(`job:${job.id}`, {
        status: 'processing',
        progress: startSceneProgress,
        currentStep: `Synthesizing Scene ${i + 1} of ${totalScenes}...`
      });

      // Generate the single scene
      const sceneFilePath = await generateSingleScene({
        jobId: job.id,
        sceneIndex: i,
        duration: plan.duration,
        prompt: plan.prompt,
        aspectRatio: job.aspectRatio,
        stylePreset: job.stylePreset,
        model: job.model,
        signal
      });

      generatedScenePaths.push(sceneFilePath);

      // Mark scene completed
      updatedScenes[i].status = 'completed';
      updatedScenes[i].videoPath = sceneFilePath;

      db.updateJob(job.id, {
        progress: endSceneProgress,
        currentStep: `Scene ${i + 1} completed (${plan.duration}s)`,
        scenes: updatedScenes
      });

      this.emit(`job:${job.id}`, {
        status: 'processing',
        progress: endSceneProgress,
        currentStep: `Scene ${i + 1} completed`
      });
    }

    if (signal.aborted) throw new Error('Cancelled by user');

    // 3. Concatenate Scenes with FFmpeg
    db.updateJob(job.id, {
      status: 'concatenating',
      progress: 88,
      currentStep: `Stitching ${totalScenes} scenes with FFmpeg into seamless ${job.requestedDuration}s stream...`
    });

    this.emit(`job:${job.id}`, {
      status: 'concatenating',
      progress: 88,
      currentStep: 'Concatenating scenes with FFmpeg...'
    });

    const concatResult = await concatenateScenes({
      jobId: job.id,
      userId: job.userId,
      scenePaths: generatedScenePaths,
      requestedDuration: job.requestedDuration,
      prompt: job.prompt,
      model: job.model,
      aspectRatio: job.aspectRatio,
      signal
    });

    // 4. Save Video Record in DB
    const videoId = `vid_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const videoRecord: VideoRecord = {
      id: videoId,
      jobId: job.id,
      userId: job.userId,
      filename: concatResult.filename,
      filePath: concatResult.finalFilePath,
      duration: concatResult.probe.duration,
      width: concatResult.probe.width,
      height: concatResult.probe.height,
      fileSize: fs.statSync(concatResult.finalFilePath).size,
      aspectRatio: job.aspectRatio,
      prompt: job.prompt,
      model: job.model,
      createdAt: new Date().toISOString()
    };

    db.createVideo(videoRecord);

    // 5. Mark Job Completed
    db.updateJob(job.id, {
      status: 'completed',
      progress: 100,
      currentStep: `Completed (${concatResult.probe.duration.toFixed(1)}s, ${concatResult.probe.width}x${concatResult.probe.height})`,
      actualDuration: concatResult.probe.duration,
      outputVideoId: videoId,
      outputVideoUrl: `/api/videos/${videoId}/stream`,
      completedAt: new Date().toISOString()
    });

    this.emit(`job:${job.id}`, {
      status: 'completed',
      progress: 100,
      videoId,
      actualDuration: concatResult.probe.duration
    });
  }
}

export const worker = new JobQueueWorker();
