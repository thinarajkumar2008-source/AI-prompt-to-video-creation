import React, { useState, useMemo } from 'react';
import { Sparkles, Film, Clock, Monitor, Wand2, SlidersHorizontal, Layers, Camera, AlertCircle } from 'lucide-react';
import { ModelOption } from '../types.js';

interface GeneratorFormProps {
  models: ModelOption[];
  supportedDurations: number[];
  onSubmit: (data: {
    prompt: string;
    negativePrompt?: string;
    model: string;
    duration: number;
    aspectRatio: string;
    stylePreset: string;
    cameraMovement?: string;
  }) => Promise<void>;
  isGenerating: boolean;
  onOpenSetup: () => void;
}

const SAMPLE_PROMPTS = [
  "A majestic bioluminescent whale gliding through deep oceanic nebula, ethereal cosmic particles, 8k cinematic lighting",
  "Cyberpunk neo-Tokyo streets in torrential rain, reflections of pink and cyan neon signs, steaming street vendors, cinematic camera push",
  "Ancient mossy stone temple floating in sunset clouds, cherry blossom petals drifting in the wind, studio ghibli anime aesthetic",
  "Golden autumn forest river with sunlight rays breaking through morning mist, photorealistic nature documentary, slow gliding camera"
];

const STYLE_PRESETS = [
  { id: 'Cinematic', label: 'Cinematic Movie', icon: '🎬', desc: 'Dramatic lighting, anamorphic lens flares' },
  { id: 'Anime / Studio Ghibli', label: 'Anime / Ghibli', icon: '🌸', desc: 'Vibrant hand-drawn watercolor aesthetic' },
  { id: 'Cyberpunk / Neon', label: 'Cyberpunk', icon: '⚡', desc: 'High-contrast neon glow and reflections' },
  { id: 'Photorealistic 8K', label: 'Photorealistic 8K', icon: '📷', desc: 'Hyper-detailed natural camera physics' },
  { id: '3D Disney Animation', label: '3D Disney', icon: '✨', desc: 'Whimsical volumetric character lighting' },
  { id: 'Vintage Film 35mm', label: 'Vintage 35mm', icon: '🎞️', desc: 'Kodak grain, warm color grade' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: 'Landscape (16:9)', desc: '1280x720 • YouTube / Web', frameClass: 'w-7 h-4' },
  { id: '9:16', label: 'Portrait (9:16)', desc: '720x1280 • Reels / Shorts', frameClass: 'w-4 h-7' },
  { id: '1:1', label: 'Square (1:1)', desc: '720x720 • Social Feed', frameClass: 'w-5 h-5' },
];

const CAMERA_MOVEMENTS = [
  'Slow cinematic push-in (zoom)',
  'Dynamic orbital pan left-to-right',
  'Low-angle tilt up with kinetic flare',
  'Gentle continuous glide forward',
  'Wide crane shot pulling back'
];

export const GeneratorForm: React.FC<GeneratorFormProps> = ({
  models,
  supportedDurations,
  onSubmit,
  isGenerating,
  onOpenSetup
}) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0]?.id || 'animagic-turbo');
  const [duration, setDuration] = useState(10);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [stylePreset, setStylePreset] = useState('Cinematic');
  const [cameraMovement, setCameraMovement] = useState(CAMERA_MOVEMENTS[0]);

  const activeModelConfig = useMemo(() => {
    return models.find(m => m.id === selectedModel) || models[0];
  }, [models, selectedModel]);

  // Calculate dynamic multi-scene breakdown based on model max clip duration
  const sceneCalculation = useMemo(() => {
    const maxClip = activeModelConfig?.maxClipDuration || 5;
    const sceneCount = Math.max(1, Math.ceil(duration / maxClip));
    const baseDuration = Math.floor(duration / sceneCount);
    return {
      sceneCount,
      maxClip,
      baseDuration,
      isMultiScene: sceneCount > 1
    };
  }, [duration, activeModelConfig]);

  const handleRandomize = () => {
    const random = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
    setPrompt(random);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onSubmit({
      prompt: prompt.trim(),
      negativePrompt: showNegative ? negativePrompt.trim() : undefined,
      model: selectedModel,
      duration,
      aspectRatio,
      stylePreset,
      cameraMovement
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-7 shadow-xl space-y-6">
      
      {/* Prompt Input Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Visual Narrative Prompt</span>
          </label>
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Surprise Me</span>
          </button>
        </div>
        <div className="relative">
          <textarea
            required
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the cinematic scene in vivid detail (e.g. camera framing, lighting, subject motion, physics)..."
            className="w-full p-3.5 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed transition-all"
          />
          <div className="absolute right-3 bottom-3 text-[10px] text-slate-500 font-mono">
            {prompt.length}/1000
          </div>
        </div>
      </div>

      {/* Negative Prompt Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowNegative(!showNegative)}
          className="text-xs text-slate-400 hover:text-slate-300 font-medium flex items-center gap-1 transition-colors"
        >
          <span>{showNegative ? '− Hide Negative Prompt' : '+ Add Negative Prompt'}</span>
        </button>
        {showNegative && (
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="blurry, distorted faces, static jitter, low quality, artifacts..."
            className="mt-2 w-full px-3.5 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
          />
        )}
      </div>

      {/* Style Presets */}
      <div>
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2.5">
          <Film className="w-3.5 h-3.5 text-indigo-400" />
          <span>Cinematic Style Preset</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STYLE_PRESETS.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStylePreset(st.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                stylePreset === st.id
                  ? 'bg-purple-600/20 border-purple-500/80 text-white shadow-sm ring-1 ring-purple-500/50'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="text-base mb-1">{st.icon}</div>
              <div className="text-xs font-bold truncate">{st.label}</div>
              <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{st.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Model Selection & Duration Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Model Selector with Max Clip Duration Highlight */}
        <div>
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
            <span>AI Model & Provider</span>
          </label>
          <div className="space-y-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2.5 rounded-xl glass-input text-xs sm:text-sm text-white focus:outline-none bg-slate-900 font-medium"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {!m.isConfigured ? '(Key Needed → Procedural Engine)' : '• Ready'}
                </option>
              ))}
            </select>
            
            {/* Model Metadata Pill */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between text-xs">
              <span className="text-slate-400">Model Shot Limit:</span>
              <span className="font-mono font-semibold text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                Max {activeModelConfig?.maxClipDuration || 5}s per clip
              </span>
            </div>
          </div>
        </div>

        {/* Video Duration Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Target Duration</span>
            </label>
            <span className="text-xs font-mono font-bold text-purple-300">{duration} seconds</span>
          </div>
          
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            {supportedDurations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono transition-all ${
                  duration === d
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          {/* Dynamic Multi-Scene Plan Badge */}
          <div className="mt-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2 text-xs">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="text-slate-300 text-[11px] leading-tight">
              {sceneCalculation.isMultiScene ? (
                <>
                  <span className="font-bold text-purple-300">Multi-Scene Mode: </span>
                  Generates <span className="text-white font-semibold">{sceneCalculation.sceneCount} clips</span> (max {sceneCalculation.maxClip}s each) and concatenates via <span className="text-white font-semibold">FFmpeg</span>.
                </>
              ) : (
                <>
                  <span className="font-bold text-emerald-300">Single Shot: </span>
                  Single continuous {duration}s clip matching model duration.
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Grid: Aspect Ratio & Camera Movement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Aspect Ratio */}
        <div>
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            <span>Aspect Ratio & Resolution</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => setAspectRatio(ar.id)}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                  aspectRatio === ar.id
                    ? 'bg-purple-600/20 border-purple-500/80 text-white ring-1 ring-purple-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`border-2 border-current rounded-sm mb-1.5 ${ar.frameClass}`}></div>
                <div className="text-xs font-bold">{ar.id}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{ar.desc.split('•')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Camera Movement */}
        <div>
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Camera Dynamics</span>
          </label>
          <select
            value={cameraMovement}
            onChange={(e) => setCameraMovement(e.target.value)}
            className="w-full p-2.5 rounded-xl glass-input text-xs sm:text-sm text-white focus:outline-none bg-slate-900 font-medium"
          >
            {CAMERA_MOVEMENTS.map((cam) => (
              <option key={cam} value={cam}>{cam}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-2">
            Controls cinematic virtual camera momentum and perspective flow across scene cuts.
          </p>
        </div>

      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-xl shadow-purple-600/25 transition-all flex items-center justify-center space-x-2"
      >
        <Sparkles className="w-5 h-5 animate-spin-slow" />
        <span>
          {isGenerating
            ? 'Synthesizing Video Stream...'
            : `Generate ${duration}s Video (${sceneCalculation.sceneCount} ${sceneCalculation.sceneCount > 1 ? 'Scenes' : 'Scene'})`}
        </span>
      </button>

    </form>
  );
};
