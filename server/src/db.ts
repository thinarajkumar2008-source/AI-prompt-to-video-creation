import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { CONFIG } from './config.js';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'guest';
  createdAt: string;
}

export interface SceneMeta {
  index: number;
  duration: number;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoPath?: string;
  error?: string;
}

export interface GenerationJob {
  id: string;
  userId: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  requestedDuration: number; // in seconds
  actualDuration?: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  stylePreset: string;
  cameraMovement?: string;
  status: 'queued' | 'processing' | 'concatenating' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  currentStep: string;
  sceneCount: number;
  scenes: SceneMeta[];
  outputVideoId?: string;
  outputVideoUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface VideoRecord {
  id: string;
  jobId: string;
  userId: string;
  filename: string;
  filePath: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  aspectRatio: string;
  prompt: string;
  model: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  jobs: GenerationJob[];
  videos: VideoRecord[];
}

class Database {
  private data: DatabaseSchema = { users: [], jobs: [], videos: [] };
  private filePath: string = CONFIG.DATA_FILE;

  constructor() {
    this.init();
  }

  private init() {
    // Ensure storage directories exist
    if (!fs.existsSync(CONFIG.STORAGE_DIR)) fs.mkdirSync(CONFIG.STORAGE_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG.VIDEOS_DIR)) fs.mkdirSync(CONFIG.VIDEOS_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG.TEMP_DIR)) fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('[DB] Error reading database.json, initializing fresh schema', err);
        this.save();
      }
    } else {
      this.seedDefaultUsers();
      this.save();
    }

    if (this.data.users.length === 0) {
      this.seedDefaultUsers();
      this.save();
    }
  }

  private seedDefaultUsers() {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('animagic123', salt);

    this.data.users.push({
      id: 'usr_guest_demo',
      email: 'guest@animagic.ai',
      name: 'Demo Creator',
      passwordHash: demoPasswordHash,
      role: 'guest',
      createdAt: new Date().toISOString()
    });

    this.data.users.push({
      id: 'usr_admin',
      email: 'admin@animagic.ai',
      name: 'System Admin',
      passwordHash: demoPasswordHash,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  }

  private save() {
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  // User Operations
  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // Job Operations
  createJob(job: GenerationJob): GenerationJob {
    this.data.jobs.unshift(job);
    this.save();
    return job;
  }

  getJob(id: string): GenerationJob | undefined {
    return this.data.jobs.find(j => j.id === id);
  }

  getJobsByUser(userId: string): GenerationJob[] {
    return this.data.jobs.filter(j => j.userId === userId);
  }

  getAllJobs(): GenerationJob[] {
    return [...this.data.jobs];
  }

  updateJob(id: string, updates: Partial<GenerationJob>): GenerationJob | undefined {
    const job = this.getJob(id);
    if (!job) return undefined;

    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return job;
  }

  deleteJob(id: string): boolean {
    const idx = this.data.jobs.findIndex(j => j.id === id);
    if (idx !== -1) {
      this.data.jobs.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Video Operations
  createVideo(video: VideoRecord): VideoRecord {
    this.data.videos.unshift(video);
    this.save();
    return video;
  }

  getVideo(id: string): VideoRecord | undefined {
    return this.data.videos.find(v => v.id === id);
  }

  getVideosByUser(userId: string): VideoRecord[] {
    return this.data.videos.filter(v => v.userId === userId);
  }

  deleteVideo(id: string): boolean {
    const idx = this.data.videos.findIndex(v => v.id === id);
    if (idx !== -1) {
      const vid = this.data.videos[idx];
      if (fs.existsSync(vid.filePath)) {
        try { fs.unlinkSync(vid.filePath); } catch (e) {}
      }
      this.data.videos.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new Database();
