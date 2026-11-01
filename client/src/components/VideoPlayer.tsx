import React, { useState } from 'react';
import { Download, Play, Pause, Maximize2, ShieldCheck, Film, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import { VideoRecord, GenerationJob } from '../types.js';
import { api } from '../api.js';

interface VideoPlayerProps {
  video: VideoRecord;
  job?: GenerationJob;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, job, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const streamUrl = api.getStreamUrl(video.id);
  const downloadUrl = api.getDownloadUrl(video.id);

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
      
      {/* Player Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Stitched & Verified
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {video.duration.toFixed(1)}s • {video.width}x{video.height} • {video.aspectRatio}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1 line-clamp-1">
            "{video.prompt}"
          </h2>
        </div>

        {/* Authorized Download Button */}
        <div className="flex items-center space-x-2">
          <a
            href={downloadUrl}
            download
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download MP4</span>
          </a>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800 shadow-inner group">
        <video
          src={streamUrl}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          Your browser does not support HTML5 video preview.
        </video>
      </div>

      {/* Video Metadata Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Duration</div>
          <div className="text-xs sm:text-sm font-mono font-bold text-purple-400 mt-0.5">
            {video.duration.toFixed(1)}s
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Resolution</div>
          <div className="text-xs sm:text-sm font-mono font-bold text-slate-200 mt-0.5">
            {video.width} × {video.height}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">File Size</div>
          <div className="text-xs sm:text-sm font-mono font-bold text-slate-200 mt-0.5">
            {(video.fileSize / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Engine / Model</div>
          <div className="text-xs sm:text-sm font-mono font-bold text-slate-200 mt-0.5 truncate">
            {video.model}
          </div>
        </div>
      </div>

      {/* Scene Breakdown Accordion if available */}
      {job && job.scenes && job.scenes.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>FFmpeg Scene Concatenation Breakdown ({job.scenes.length} Stitched Shots)</span>
          </h4>
          <div className="space-y-2">
            {job.scenes.map((scene, i) => (
              <div key={i} className="p-3 rounded-lg bg-black/40 border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-purple-600/30 text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-slate-300 font-medium line-clamp-1">{scene.prompt}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400 shrink-0">
                  <span>{scene.duration}s</span>
                  <span className="text-emerald-400 font-semibold">• Concatenated</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
