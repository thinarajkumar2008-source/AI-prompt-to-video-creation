import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'animagic-turbo' | 'runway' | 'luma' | 'kling' | 'minimax' | 'sora';
  maxClipDuration: number; // in seconds
  defaultFps: number;
  supportedAspectRatios: ('16:9' | '9:16' | '1:1')[];
  description: string;
  requiresKey?: string;
}

export const MODELS: Record<string, ModelConfig> = {
  'animagic-turbo': {
    id: 'animagic-turbo',
    name: 'Animagic Turbo v2.5 (Fast Cinematic)',
    provider: 'animagic-turbo',
    maxClipDuration: 5,
    defaultFps: 30,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    description: 'High-speed procedural cinematic engine with dynamic camera motions & lighting.',
  },
  'runway-gen3': {
    id: 'runway-gen3',
    name: 'Runway Gen-3 Alpha',
    provider: 'runway',
    maxClipDuration: 5,
    defaultFps: 30,
    supportedAspectRatios: ['16:9', '9:16'],
    description: 'Hyper-realistic video generation with advanced motion fidelity.',
    requiresKey: 'RUNWAY_API_SECRET'
  },
  'luma-dream': {
    id: 'luma-dream',
    name: 'Luma Dream Machine v1.5',
    provider: 'luma',
    maxClipDuration: 5,
    defaultFps: 30,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    description: 'Camera motion control with cinematic temporal coherence.',
    requiresKey: 'LUMA_API_KEY'
  },
  'kling-video': {
    id: 'kling-video',
    name: 'Kling 1.5 Pro',
    provider: 'kling',
    maxClipDuration: 5,
    defaultFps: 30,
    supportedAspectRatios: ['16:9', '9:16'],
    description: 'Photorealistic physical world simulation and action capture.',
    requiresKey: 'KLING_API_KEY'
  },
  'minimax-hailuo': {
    id: 'minimax-hailuo',
    name: 'MiniMax Hailuo Video',
    provider: 'minimax',
    maxClipDuration: 6,
    defaultFps: 30,
    supportedAspectRatios: ['16:9', '9:16'],
    description: 'High dynamic action and stylistic character movements.',
    requiresKey: 'MINIMAX_API_KEY'
  },
  'sora-preview': {
    id: 'sora-preview',
    name: 'OpenAI Sora (Preview)',
    provider: 'sora',
    maxClipDuration: 5,
    defaultFps: 30,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    description: 'Deep understanding of physical world with high resolution.',
    requiresKey: 'OPENAI_API_KEY'
  }
};

export const SUPPORTED_DURATIONS = [5, 10, 15, 20, 30]; // seconds

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'animagic-super-secret-key-prod-998822',
  STORAGE_DIR: path.resolve(__dirname, '../storage'),
  VIDEOS_DIR: path.resolve(__dirname, '../storage/videos'),
  TEMP_DIR: path.resolve(__dirname, '../storage/temp'),
  DATA_FILE: path.resolve(__dirname, '../storage/database.json'),
  
  // Cloud AI Credentials
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || '',
  RUNWAY_API_SECRET: process.env.RUNWAY_API_SECRET || '',
  LUMA_API_KEY: process.env.LUMA_API_KEY || '',
  KLING_API_KEY: process.env.KLING_API_KEY || '',
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};

// Check if any real cloud AI provider is configured
export function isDemoMode(): boolean {
  return !(
    Boolean(CONFIG.REPLICATE_API_TOKEN) ||
    Boolean(CONFIG.RUNWAY_API_SECRET) ||
    Boolean(CONFIG.LUMA_API_KEY) ||
    Boolean(CONFIG.KLING_API_KEY) ||
    Boolean(CONFIG.MINIMAX_API_KEY) ||
    Boolean(CONFIG.OPENAI_API_KEY)
  );
}

// Client-safe configuration DTO (NEVER EXPOSES KEYS!)
export function getClientConfig() {
  const modelsWithKeyStatus = Object.values(MODELS).map((model) => {
    const hasKey = model.requiresKey ? Boolean(process.env[model.requiresKey]) : true;
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      maxClipDuration: model.maxClipDuration,
      defaultFps: model.defaultFps,
      supportedAspectRatios: model.supportedAspectRatios,
      description: model.description,
      isConfigured: hasKey,
      requiresKeyName: model.requiresKey || null
    };
  });

  return {
    demoMode: isDemoMode(),
    models: modelsWithKeyStatus,
    supportedDurations: SUPPORTED_DURATIONS,
    setupInstructions: {
      message: isDemoMode()
        ? 'Demo Mode is active. The built-in Animagic Turbo procedural video engine generates high-definition, dynamic 60fps motion scenes with ambient audio. To enable live external AI cloud models (Runway, Luma, Kling, etc.), add your API keys to the backend .env file.'
        : 'Live AI credentials detected. Selected cloud models will use external provider APIs.',
      envVars: [
        { name: 'RUNWAY_API_SECRET', provider: 'Runway Gen-3', docsUrl: 'https://dev.runwayml.com' },
        { name: 'LUMA_API_KEY', provider: 'Luma Dream Machine', docsUrl: 'https://lumalabs.ai/dream-machine/api' },
        { name: 'KLING_API_KEY', provider: 'Kling 1.5', docsUrl: 'https://klingai.org/api' },
        { name: 'MINIMAX_API_KEY', provider: 'MiniMax Hailuo', docsUrl: 'https://api.minimax.chat' },
        { name: 'OPENAI_API_KEY', provider: 'OpenAI Sora', docsUrl: 'https://platform.openai.com' },
        { name: 'REPLICATE_API_TOKEN', provider: 'Replicate Hub', docsUrl: 'https://replicate.com' }
      ]
    }
  };
}
