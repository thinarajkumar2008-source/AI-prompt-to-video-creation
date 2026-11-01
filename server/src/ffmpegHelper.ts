import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // Check known WinGet path on Windows
  const wingetBase = path.join(
    process.env.LOCALAPPDATA || 'C:\\Users\\Thina rajkumar\\AppData\\Local',
    'Microsoft\\WinGet\\Packages'
  );

  if (fs.existsSync(wingetBase)) {
    try {
      const gyanDir = fs.readdirSync(wingetBase).find(d => d.includes('Gyan.FFmpeg'));
      if (gyanDir) {
        const fullBuildDir = fs.readdirSync(path.join(wingetBase, gyanDir)).find(d => d.includes('full_build'));
        if (fullBuildDir) {
          const candidate = path.join(wingetBase, gyanDir, fullBuildDir, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  return 'ffmpeg';
}

export function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    return process.env.FFPROBE_PATH;
  }

  const ffmpeg = getFfmpegPath();
  if (ffmpeg.endsWith('ffmpeg.exe')) {
    const candidate = ffmpeg.replace(/ffmpeg\.exe$/i, 'ffprobe.exe');
    if (fs.existsSync(candidate)) return candidate;
  }

  return 'ffprobe';
}

export interface FfmpegRunOptions {
  args: string[];
  signal?: AbortSignal;
}

export function runFfmpeg({ args, signal }: FfmpegRunOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const binary = getFfmpegPath();
    const child = spawn(binary, args, { signal, stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', err => {
      if (err.name === 'AbortError') {
        reject(new Error('FFmpeg process was cancelled by user.'));
      } else {
        reject(err);
      }
    });
  });
}

export interface VideoProbeResult {
  duration: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec?: string;
  fps: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

export function probeVideo(filePath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    const ffprobe = getFfprobePath();
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration:stream=codec_name,codec_type,width,height,r_frame_rate',
      '-of', 'json',
      filePath
    ];

    const child = spawn(ffprobe, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    child.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        const formatDuration = parseFloat(parsed.format?.duration || '0');
        const videoStream = parsed.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = parsed.streams?.find((s: any) => s.codec_type === 'audio');

        let fps = 30;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den && den > 0) fps = Math.round(num / den);
        }

        resolve({
          duration: formatDuration,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          videoCodec: videoStream?.codec_name || 'unknown',
          audioCodec: audioStream?.codec_name,
          fps,
          hasVideo: Boolean(videoStream),
          hasAudio: Boolean(audioStream)
        });
      } catch (e: any) {
        reject(new Error(`Failed to parse ffprobe output: ${e.message}`));
      }
    });

    child.on('error', reject);
  });
}
