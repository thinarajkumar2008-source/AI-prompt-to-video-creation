export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'guest';
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  maxClipDuration: number;
  defaultFps: number;
  supportedAspectRatios: ('16:9' | '9:16' | '1:1')[];
  description: string;
  isConfigured: boolean;
  requiresKeyName: string | null;
}

export interface ClientConfig {
  demoMode: boolean;
  models: ModelOption[];
  supportedDurations: number[];
  setupInstructions: {
    message: string;
    envVars: { name: string; provider: string; docsUrl: string }[];
  };
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
  requestedDuration: number;
  actualDuration?: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  stylePreset: string;
  cameraMovement?: string;
  status: 'queued' | 'processing' | 'concatenating' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  sceneCount: number;
  scenes: SceneMeta[];
  queuePosition?: number;
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
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  aspectRatio: string;
  prompt: string;
  model: string;
  createdAt: string;
}
