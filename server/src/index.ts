import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG, MODELS, SUPPORTED_DURATIONS, getClientConfig } from './config.js';
import { db, User, GenerationJob } from './db.js';
import { requireAuth, optionalAuth, generateToken, AuthRequest } from './auth.js';
import { worker } from './worker.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Public health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'animagic-ai-backend'
  });
});

// Config & capabilities (Never returns keys)
app.get('/api/config', (req, res) => {
  res.json(getClientConfig());
});

// ----------------- Auth Endpoints -----------------

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const user: User = {
    id: `usr_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    passwordHash: bcrypt.hashSync(password, salt),
    role: 'user',
    createdAt: new Date().toISOString()
  };

  db.createUser(user);
  const token = generateToken(user);

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Instant Guest Demo Login
app.post('/api/auth/demo', (req, res) => {
  let guest = db.getUserByEmail('guest@animagic.ai');
  if (!guest) {
    const salt = bcrypt.genSaltSync(10);
    guest = {
      id: 'usr_guest_demo',
      email: 'guest@animagic.ai',
      name: 'Demo Creator',
      passwordHash: bcrypt.hashSync('animagic123', salt),
      role: 'guest',
      createdAt: new Date().toISOString()
    };
    db.createUser(guest);
  }

  const token = generateToken(guest);
  res.json({
    token,
    user: { id: guest.id, name: guest.name, email: guest.email, role: guest.role }
  });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  const u = req.user!;
  res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

// ----------------- Generation Job Endpoints -----------------

app.post('/api/jobs', requireAuth, (req: AuthRequest, res) => {
  const { prompt, negativePrompt, model, duration, aspectRatio, stylePreset, cameraMovement } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const reqDuration = parseInt(duration || '5', 10);
  if (!SUPPORTED_DURATIONS.includes(reqDuration)) {
    return res.status(400).json({
      error: `Invalid duration. Supported durations are: ${SUPPORTED_DURATIONS.join(', ')} seconds.`
    });
  }

  const selectedModelId = model || 'animagic-turbo';
  if (!MODELS[selectedModelId]) {
    return res.status(400).json({ error: `Unknown model: ${selectedModelId}` });
  }

  const selectedAspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio) ? aspectRatio : '16:9';
  const selectedStyle = stylePreset || 'Cinematic';

  const jobId = `job_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const newJob: GenerationJob = {
    id: jobId,
    userId: req.user!.id,
    prompt: prompt.trim(),
    negativePrompt: negativePrompt?.trim() || '',
    model: selectedModelId,
    requestedDuration: reqDuration,
    aspectRatio: selectedAspectRatio,
    stylePreset: selectedStyle,
    cameraMovement: cameraMovement || 'Slow cinematic push-in (zoom)',
    status: 'queued',
    progress: 0,
    currentStep: 'Queued in generation pool',
    sceneCount: 1,
    scenes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createJob(newJob);
  worker.enqueue(newJob.id);

  const queuePosition = worker.getQueuePosition(jobId);

  res.status(201).json({
    job: newJob,
    queuePosition
  });
});

app.get('/api/jobs', requireAuth, (req: AuthRequest, res) => {
  const jobs = db.getJobsByUser(req.user!.id);
  const enriched = jobs.map(j => ({
    ...j,
    queuePosition: j.status === 'queued' ? worker.getQueuePosition(j.id) : 0
  }));
  res.json({ jobs: enriched });
});

app.get('/api/jobs/:id', requireAuth, (req: AuthRequest, res) => {
  const job = db.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  // Authorization: user can only access their own jobs unless admin
  if (job.userId !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You do not have permission to view this job.' });
  }

  const queuePosition = job.status === 'queued' ? worker.getQueuePosition(job.id) : 0;
  res.json({ job: { ...job, queuePosition } });
});

// Server-Sent Events (SSE) for real-time progress stream
app.get('/api/jobs/:id/events', optionalAuth, (req: AuthRequest, res) => {
  const job = db.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  const onUpdate = () => {
    const current = db.getJob(job.id);
    if (current) {
      res.write(`data: ${JSON.stringify(current)}\n\n`);
      if (current.status === 'completed' || current.status === 'failed' || current.status === 'cancelled') {
        res.end();
      }
    }
  };

  worker.on(`job:${job.id}`, onUpdate);

  req.on('close', () => {
    worker.off(`job:${job.id}`, onUpdate);
  });
});

app.post('/api/jobs/:id/cancel', requireAuth, (req: AuthRequest, res) => {
  const job = db.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  if (job.userId !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You do not have permission to cancel this job.' });
  }

  if (job.status === 'completed') {
    return res.status(400).json({ error: 'Cannot cancel a completed job.' });
  }

  worker.cancel(job.id);
  const updated = db.getJob(job.id);
  res.json({ message: 'Job cancelled successfully.', job: updated });
});

app.post('/api/jobs/:id/retry', requireAuth, (req: AuthRequest, res) => {
  const job = db.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  if (job.userId !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You do not have permission to retry this job.' });
  }

  const success = worker.retry(job.id);
  if (!success) {
    return res.status(400).json({ error: 'Only failed or cancelled jobs can be retried.' });
  }

  const updated = db.getJob(job.id);
  res.json({ message: 'Job re-queued successfully.', job: updated });
});

// ----------------- Video Endpoints (Private Storage & Downloads) -----------------

app.get('/api/videos', requireAuth, (req: AuthRequest, res) => {
  const videos = db.getVideosByUser(req.user!.id);
  res.json({ videos });
});

app.get('/api/videos/:id', requireAuth, (req: AuthRequest, res) => {
  const video = db.getVideo(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  if (video.userId !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You do not own this video.' });
  }

  res.json({ video });
});

// Authorized Stream (supports HTTP 206 range requests for video seeking)
app.get('/api/videos/:id/stream', optionalAuth, (req: AuthRequest, res) => {
  const video = db.getVideo(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  // If user token is provided, verify ownership; allow demo guest access
  if (req.user && video.userId !== req.user.id && req.user.role !== 'admin' && video.userId !== 'usr_guest_demo') {
    return res.status(403).json({ error: 'Access denied: Private video.' });
  }

  if (!fs.existsSync(video.filePath)) {
    return res.status(404).json({ error: 'Video file not found on disk.' });
  }

  const stat = fs.statSync(video.filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(video.filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(video.filePath).pipe(res);
  }
});

// Authorized Download endpoint with Content-Disposition attachment header
app.get('/api/videos/:id/download', optionalAuth, (req: AuthRequest, res) => {
  const video = db.getVideo(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  if (req.user && video.userId !== req.user.id && req.user.role !== 'admin' && video.userId !== 'usr_guest_demo') {
    return res.status(403).json({ error: 'Access denied: Private video.' });
  }

  if (!fs.existsSync(video.filePath)) {
    return res.status(404).json({ error: 'Video file missing.' });
  }

  // Safe filename sanitization
  const safeTitle = (video.prompt || 'animagic_video')
    .slice(0, 30)
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const downloadName = `animagic_${safeTitle}_${video.id.slice(-6)}.mp4`;

  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Content-Type', 'video/mp4');

  const stream = fs.createReadStream(video.filePath);
  stream.pipe(res);
});

// Delete Video
app.delete('/api/videos/:id', requireAuth, (req: AuthRequest, res) => {
  const video = db.getVideo(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found.' });
  }

  if (video.userId !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: You do not own this video.' });
  }

  db.deleteVideo(video.id);
  res.json({ message: 'Video deleted successfully.' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'An unexpected internal error occurred. Please try again.' });
});

// Start Server
app.listen(CONFIG.PORT, () => {
  console.log(`🎬 ANIMAGIC AI Server listening on http://localhost:${CONFIG.PORT}`);
  console.log(`📁 Video Storage: ${CONFIG.VIDEOS_DIR}`);
  console.log(`🔒 Authentication & Private Storage: ENABLED`);
  console.log(`⚡ Demo Mode Active: ${getClientConfig().demoMode ? 'YES (Procedural Engine)' : 'NO (Live Cloud AI)'}`);
});
