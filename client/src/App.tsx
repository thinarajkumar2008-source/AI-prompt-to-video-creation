import React, { useState, useEffect } from 'react';
import { Sparkles, Film, AlertCircle } from 'lucide-react';
import { api } from './api.js';
import { ClientConfig, User, GenerationJob, VideoRecord } from './types.js';
import { Header } from './components/Header.js';
import { GeneratorForm } from './components/GeneratorForm.js';
import { JobProgressCard } from './components/JobProgressCard.js';
import { VideoPlayer } from './components/VideoPlayer.js';
import { VideoHistory } from './components/VideoHistory.js';
import { SetupModal } from './components/SetupModal.js';
import { AuthModal } from './components/AuthModal.js';

export const App: React.FC = () => {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  
  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  // Active Job & Result Video
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Initialize App
  useEffect(() => {
    async function init() {
      try {
        const cfg = await api.getConfig();
        setConfig(cfg);

        // Try getting logged in user; if none, auto-login as demo creator
        let currentUser = await api.getCurrentUser();
        if (!currentUser) {
          const demoRes = await api.demoLogin();
          currentUser = demoRes.user;
        }
        setUser(currentUser);

        // Load past videos
        const vidRes = await api.getVideos();
        setVideos(vidRes.videos);

        // Check if there is any unfinished job
        const jobRes = await api.getJobs();
        const active = jobRes.jobs.find(j => j.status === 'queued' || j.status === 'processing' || j.status === 'concatenating');
        if (active) {
          setActiveJob(active);
        }
      } catch (err: any) {
        console.error('Failed to initialize application:', err);
        setErrorBanner(err.message || 'Unable to connect to backend service.');
      }
    }
    init();
  }, []);

  // Poll / Listen for active job updates
  useEffect(() => {
    if (!activeJob) return;

    if (activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cancelled') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.getJob(activeJob.id);
        setActiveJob(res.job);

        if (res.job.status === 'completed') {
          // Fetch completed video record
          const vidRes = await api.getVideos();
          setVideos(vidRes.videos);
          if (res.job.outputVideoId) {
            const v = vidRes.videos.find(item => item.id === res.job.outputVideoId);
            if (v) setActiveVideo(v);
          }
        }
      } catch (e) {
        console.error('Job polling error:', e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  const handleCreateJob = async (data: any) => {
    setErrorBanner(null);
    try {
      const res = await api.createJob(data);
      setActiveJob(res.job);
      setActiveVideo(null);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to submit generation request.');
    }
  };

  const handleCancelJob = async (id: string) => {
    try {
      const res = await api.cancelJob(id);
      setActiveJob(res.job);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to cancel job.');
    }
  };

  const handleRetryJob = async (id: string) => {
    try {
      const res = await api.retryJob(id);
      setActiveJob(res.job);
      setActiveVideo(null);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to retry job.');
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await api.deleteVideo(id);
      setVideos(videos.filter(v => v.id !== id));
      if (activeVideo?.id === id) {
        setActiveVideo(null);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to delete video.');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setVideos([]);
    setActiveJob(null);
    setActiveVideo(null);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      
      {/* Navigation Header */}
      <Header
        user={user}
        demoMode={config?.demoMode ?? true}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSetup={() => setIsSetupOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Error Banner */}
        {errorBanner && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-xs font-semibold hover:text-white underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Studio */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Generator Form (7 cols on Desktop) */}
            <div className="lg:col-span-7 space-y-6">
              <GeneratorForm
                models={config?.models || []}
                supportedDurations={config?.supportedDurations || [5, 10, 15, 20, 30]}
                onSubmit={handleCreateJob}
                isGenerating={activeJob?.status === 'queued' || activeJob?.status === 'processing' || activeJob?.status === 'concatenating'}
                onOpenSetup={() => setIsSetupOpen(true)}
              />
            </div>

            {/* Right Column: Active Job Status & Video Player (5 cols on Desktop) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Active Generation Progress Card */}
              {activeJob && (
                <JobProgressCard
                  job={activeJob}
                  onCancel={handleCancelJob}
                  onRetry={handleRetryJob}
                  onViewResult={(j) => {
                    const found = videos.find(v => v.id === j.outputVideoId);
                    if (found) setActiveVideo(found);
                  }}
                />
              )}

              {/* Rendered Video Player */}
              {activeVideo ? (
                <VideoPlayer
                  video={activeVideo}
                  job={activeJob?.outputVideoId === activeVideo.id ? activeJob : undefined}
                />
              ) : !activeJob ? (
                /* Empty / Ready State */
                <div className="glass-panel rounded-2xl border border-slate-800 p-8 sm:p-10 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Film className="w-8 h-8 opacity-70" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Video Studio Ready</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
                      Choose your prompt, target duration, and aspect ratio on the left. The engine will plan the scene breakdown and concatenate the final video using FFmpeg.
                    </p>
                  </div>
                </div>
              ) : null}

            </div>

          </div>
        )}

        {/* Tab 2: Video History Vault */}
        {activeTab === 'history' && (
          <VideoHistory
            videos={videos}
            onSelectVideo={(v) => {
              setActiveVideo(v);
              setActiveTab('generate');
            }}
            onDeleteVideo={handleDeleteVideo}
            onNavigateToStudio={() => setActiveTab('generate')}
          />
        )}

      </main>

      {/* Modals */}
      <SetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        config={config}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          api.getVideos().then(res => setVideos(res.videos));
        }}
      />

    </div>
  );
};
