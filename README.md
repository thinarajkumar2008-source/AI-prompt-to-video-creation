# ANIMAGIC AI 🎬

**ANIMAGIC AI** is an advanced, production-grade AI-powered multi-scene video generation studio. It plans scene sequences, synthesizes dynamic video assets, and stitches multi-scene shots into unified video streams using FFmpeg.

---

## Architecture Overview

- **Frontend (`client/`)**: React 18 / TypeScript / Vite / Tailwind CSS / Lucide React. Dark glassmorphism, responsive across desktop, tablet, and mobile.
- **Backend API (`server/`)**: Express.js with TypeScript (`tsx`), JWT authentication, bcryptjs, streaming endpoints with HTTP 206 range requests, and authorized attachment downloads.
- **Job Worker (`server/src/worker.ts`)**: In-memory FIFO queue with concurrency limits, multi-scene execution, abortable job cancellation via `AbortController`, retry support, and real-time SSE progress streaming.
- **FFmpeg Concatenation Engine (`server/src/videoEngine.ts`)**:
  - Automatically breaks requested durations (5s, 10s, 15s, 20s, 30s) into multi-scene shots conforming to the selected model's maximum clip duration (e.g. 5s per shot).
  - Procedural 30fps/60fps video generation with dynamic camera movement, kinetic particles, and synchronized harmonic audio in Demo Mode.
  - Multi-scene concatenation using FFmpeg concat demuxer with faststart MP4 flags.
  - Duration verification using `ffprobe` ensuring final output matches requested duration within tolerance (+/- 0.5s).
- **Database & Storage (`server/storage/`)**:
  - ACID-compliant atomic file-backed JSON database (`database.json`) storing users, jobs, and video records.
  - User-isolated private storage directory (`storage/videos/:userId/`).

---

## Quick Start (Run Commands)

### Prerequisites
- Node.js v18+ (tested on Node v24)
- FFmpeg & FFprobe (automatically detected from system PATH or WinGet installation)

### 1. Install Dependencies
```bash
# In the root repository directory:
cd "C:\Users\Thina rajkumar\.gemini\antigravity\scratch\animagic-ai"

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in `server/`:
```bash
cd server
cp .env.example .env
```
Default configuration values:
- `PORT=5001`
- `JWT_SECRET=animagic-ultra-secure-jwt-secret-994411`
- Optional Live Cloud AI Provider Keys (Leave empty for Demo Mode):
  - `RUNWAY_API_SECRET`
  - `LUMA_API_KEY`
  - `KLING_API_KEY`
  - `MINIMAX_API_KEY`
  - `OPENAI_API_KEY`
  - `REPLICATE_API_TOKEN`

### 3. Start Backend & Worker
```bash
cd server
npm run dev
# Server will listen on http://localhost:5001
```

### 4. Start Frontend
```bash
cd client
npm run dev
# Frontend will be live on http://localhost:5174
```

### 5. Run Automated Senior QA Test Suite
```bash
cd server
npm test
# Executes comprehensive verification of scene planning, FFmpeg generation, multi-scene concatenation, duration tolerance, and security.
```

---

## Test Accounts
The database automatically seeds the following credentials on first run:
- **Demo Guest**: One-click instant login via the "Instant Access: Continue as Demo Guest" button.
- **Admin**: Email: `admin@animagic.ai` | Password: `animagic123`
