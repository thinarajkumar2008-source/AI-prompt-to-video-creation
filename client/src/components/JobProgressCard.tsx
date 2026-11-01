import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle, RefreshCw, Layers, Film, Cpu } from 'lucide-react';
import { GenerationJob } from '../types.js';

interface JobProgressCardProps {
  job: GenerationJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onViewResult?: (job: GenerationJob) => void;
}

export const JobProgressCard: React.FC<JobProgressCardProps> = ({
  job,
  onCancel,
  onRetry,
  onViewResult
}) => {
  const isQueued = job.status === 'queued';
  const isProcessing = job.status === 'processing';
  const isConcatenating = job.status === 'concatenating';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isCancelled = job.status === 'cancelled';

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            {/* Status Indicator Icon */}
            {isQueued && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
            {isProcessing && <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />}
            {isConcatenating && <Layers className="w-5 h-5 text-indigo-400 animate-bounce" />}
            {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {isFailed && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {isCancelled && <XCircle className="w-5 h-5 text-slate-400" />}

            <h3 className="text-sm sm:text-base font-bold text-white capitalize">
              {isQueued && `Queued in Worker Line (Position #${job.queuePosition || 1})`}
              {isProcessing && 'Synthesizing Scene Clips'}
              {isConcatenating && 'FFmpeg Multi-Scene Concatenation'}
              {isCompleted && 'Video Generation Finished'}
              {isFailed && 'Generation Failed'}
              {isCancelled && 'Generation Cancelled'}
            </h3>
          </div>

          <p className="text-xs text-slate-400 font-mono">
            Job ID: <span className="text-slate-300">{job.id}</span> • {job.requestedDuration}s • {job.aspectRatio} • {job.model}
          </p>
        </div>

        {/* Action Buttons (Cancel / Retry / View) */}
        <div className="flex items-center space-x-2">
          {(isQueued || isProcessing || isConcatenating) && (
            <button
              onClick={() => onCancel(job.id)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center space-x-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}

          {(isFailed || isCancelled) && (
            <button
              onClick={() => onRetry(job.id)}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-all flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Job</span>
            </button>
          )}

          {isCompleted && onViewResult && (
            <button
              onClick={() => onViewResult(job)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center space-x-1"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Watch Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (Authentic, state-driven percentage) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">{job.currentStep}</span>
          <span className="font-mono font-bold text-purple-400">{job.progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isFailed ? 'bg-rose-500' : isCancelled ? 'bg-slate-600' : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500'
            }`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {/* Multi-Scene Step Pills */}
      {job.scenes && job.scenes.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-Scene Architecture ({job.scenes.length} Clips Planned)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {job.scenes.map((scene) => (
              <div
                key={scene.index}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  scene.status === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : scene.status === 'generating'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 ring-1 ring-purple-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-xs">#{scene.index + 1}</span>
                  <span className="text-[11px] truncate max-w-[120px]">{scene.duration}s Shot</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">
                  {scene.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message Box */}
      {isFailed && job.error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <p className="font-semibold mb-0.5">Failure Reason:</p>
          <p className="font-mono text-[11px]">{job.error}</p>
        </div>
      )}

      {/* Prompt summary */}
      <p className="text-xs text-slate-400 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/50 line-clamp-2">
        "{job.prompt}"
      </p>

    </div>
  );
};
