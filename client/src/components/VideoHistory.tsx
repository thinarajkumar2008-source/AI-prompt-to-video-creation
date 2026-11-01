import React, { useState } from 'react';
import { Search, Film, Download, Trash2, Clock, Play, Sparkles, Filter } from 'lucide-react';
import { VideoRecord } from '../types.js';
import { api } from '../api.js';

interface VideoHistoryProps {
  videos: VideoRecord[];
  onSelectVideo: (video: VideoRecord) => void;
  onDeleteVideo: (id: string) => Promise<void>;
  onNavigateToStudio: () => void;
}

export const VideoHistory: React.FC<VideoHistoryProps> = ({
  videos,
  onSelectVideo,
  onDeleteVideo,
  onNavigateToStudio
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredVideos = videos.filter((v) =>
    v.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this video?')) return;
    setDeletingId(id);
    try {
      await onDeleteVideo(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Search & Header Bar */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <span>Private Video Vault</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {videos.length} rendered {videos.length === 1 ? 'video' : 'videos'} stored in user-isolated storage.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by prompt or model..."
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Film className="w-8 h-8 opacity-70" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No Videos Found</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {searchTerm
                ? 'No rendered videos match your search query. Try clearing the search filter.'
                : 'Your private vault is currently empty. Head over to the Studio to generate your first multi-scene AI video.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              onClick={onNavigateToStudio}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-purple-600/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create First Video</span>
            </button>
          )}
        </div>
      )}

      {/* Videos Grid */}
      {filteredVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className="group glass-card rounded-2xl border border-slate-800 overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
            >
              {/* Video Thumbnail / Preview Container */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                  src={api.getStreamUrl(video.id)}
                  preload="metadata"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                />
                
                {/* Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" />
                  <span>{video.duration.toFixed(1)}s</span>
                </div>

                {/* Aspect ratio badge */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-purple-950/80 backdrop-blur-md text-[10px] font-mono font-bold text-purple-300 border border-purple-500/30">
                  {video.aspectRatio}
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                  <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>
              </div>

              {/* Video Info Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-2 group-hover:text-purple-300 transition-colors">
                    "{video.prompt}"
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[140px]">{video.model}</span>
                    <span>{(video.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={api.getDownloadUrl(video.id)}
                      download
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                      title="Download MP4"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={(e) => handleDelete(video.id, e)}
                      disabled={deletingId === video.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                      title="Delete Video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
