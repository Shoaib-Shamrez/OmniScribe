# OmniScribe AI 🎙

A production-grade Speech-to-Text API that transcribes audio and video files into timestamped text using OpenAI Whisper. Built with a distributed async architecture to handle files of any length — including 2-3 hour meeting recordings.

---

## Demo

Upload any audio or video file → get a structured JSON response with the full transcript and per-sentence timestamps.

```json
{
  "job_id": "4de88918-d20d-4567-a1cc-352640500aee",
  "status": "done",
  "transcription": "Welcome to the meeting. Today we will discuss...",
  "segments": [
    { "start": 0.0, "end": 3.2, "text": "Welcome to the meeting." },
    {
      "start": 3.2,
      "end": 7.8,
      "text": "Today we will discuss the Q3 roadmap."
    }
  ]
}
```

---

## The Problem This Solves

Standard transcription APIs block the server until processing is done. For a 3-hour meeting, that means a 20-minute HTTP connection that always times out.

OmniScribe uses a **Producer-Consumer architecture** to solve this:

```
User uploads file
      ↓
FastAPI returns job_id instantly  ← response in < 1 second
      ↓
Celery worker picks up the job in the background
      ↓
FFmpeg extracts audio (if video file)
      ↓
Whisper transcribes (takes as long as it needs)
      ↓
Result saved to Redis
      ↓
Frontend polls /status/{job_id} until done
```

---

## Tech Stack

| Layer             | Technology                    | Why                                                |
| ----------------- | ----------------------------- | -------------------------------------------------- |
| API               | FastAPI                       | Async request handling, auto validation            |
| Background Worker | Celery                        | Runs transcription outside the request cycle       |
| Queue & Cache     | Redis                         | Fast in-memory job status storage                  |
| Audio Extraction  | FFmpeg                        | Strips audio from video, reduces file size by ~80% |
| Transcription     | OpenAI Whisper                | State of the art open source speech recognition    |
| Frontend          | React + TypeScript + Tailwind | Real-time polling UI with progress feedback        |

---

## Architecture

```
┌─────────────────┐     POST /transcribe      ┌─────────────────┐
│                 │ ────────────────────────→  │                 │
│  React Frontend │                            │  FastAPI Server │
│                 │ ←────────────────────────  │                 │
│                 │     { job_id, "queued" }   └────────┬────────┘
│                 │                                     │
│                 │     GET /status/{job_id}            │ .delay()
│                 │ ────────────────────────→           ↓
│                 │ ←────────────────────────  ┌─────────────────┐
│                 │     { status, segments }   │  Redis Queue    │
└─────────────────┘                            └────────┬────────┘
                                                        │
                                               ┌────────↓────────┐
                                               │  Celery Worker  │
                                               │                 │
                                               │  FFmpeg → WAV   │
                                               │  Whisper AI     │
                                               │  Save to Redis  │
                                               └─────────────────┘
```

---

## Engineering Decisions

**1. Why async architecture instead of synchronous?**

A 3-hour video takes 15-20 minutes to transcribe. A synchronous approach would hold the HTTP connection open the entire time — browsers timeout after ~2 minutes. The Producer-Consumer pattern lets the API respond instantly while work happens in the background.

**2. Why FFmpeg pre-processing?**

Video files are 10-20x larger than their audio content. A 2-hour MP4 can be 4GB. By extracting only the audio track (converted to 16kHz mono WAV), we reduce the file to ~200MB before feeding it to Whisper. This saves compute time and disk I/O.

**3. Why Redis for job status?**

Job statuses are temporary, fast-access data — exactly what Redis is optimized for. Reading a job status takes microseconds from RAM versus milliseconds from disk-based databases like PostgreSQL.

**4. Why Celery over FastAPI BackgroundTasks?**

`BackgroundTasks` runs inside the web server process. If the server restarts mid-transcription, the job is lost. Celery is a separate process — it survives server restarts, supports retries, and can be scaled horizontally by adding more workers.

---

## Project Structure

```
OmniScribe-AI/
├── backend/
│   ├── main.py          # FastAPI endpoints (/transcribe, /status)
│   ├── worker.py        # Celery task — FFmpeg + Whisper logic
│   ├── utils.py         # FFmpeg audio extraction helper
│   └── requirements.txt
├── frontend/
│   └── src/
│       └── App.tsx      # React UI — upload, polling, transcript view
├── data/
│   ├── uploads/         # Temporary uploaded files
│   └── outputs/         # Temporary extracted audio files
└── README.md
```

---

## Local Setup

### Prerequisites

- Python 3.11
- Node.js 18+
- Redis ([Windows](https://github.com/microsoftarchive/redis/releases) / [Mac](https://formulae.brew.sh/formula/redis))
- FFmpeg ([Windows](https://ffmpeg.org/download.html) / Mac: `brew install ffmpeg`)

### Backend

```bash
# 1. Create virtual environment with Python 3.11
cd backend
py -3.11 -m venv venv

# 2. Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start FastAPI server (Terminal 1)
python main.py

# 5. Start Celery worker (Terminal 2)
# Windows:
celery -A worker worker --loglevel=info --pool=solo
# Mac/Linux:
celery -A worker worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Reference

### POST `/transcribe`

Upload an audio or video file for transcription.

**Accepted formats:** `mp3, wav, m4a, aac, flac, wma, opus, mp4, mkv, avi, mov, webm`

**Request:** `multipart/form-data` with a `file` field

**Response:**

```json
{
  "job_id": "4de88918-d20d-4567-a1cc-352640500aee",
  "status": "queued"
}
```

---

### GET `/status/{job_id}`

Check the status of a transcription job.

**Possible responses:**

```json
{ "status": "queued" }
{ "status": "processing" }
{
  "status": "done",
  "transcription": "Full transcript text...",
  "segments": [
    { "start": 0.0, "end": 3.2, "text": "First sentence." }
  ]
}
{ "status": "failed", "error": "Error message here" }
```

---

## Supported File Formats

| Type  | Formats                             |
| ----- | ----------------------------------- |
| Audio | mp3, wav, m4a, aac, flac, wma, opus |
| Video | mp4, mkv, avi, mov, webm, wmv, flv  |

---

## Feautures Enhancements

- [ ] PostgreSQL integration — persist transcripts permanently
- [ ] User authentication
- [ ] Export transcript as PDF, SRT, or DOCX
- [ ] Speaker diarization — identify who said what
- [ ] Upgrade to Whisper `small` or `medium` model for better accuracy
- [ ] Deploy backend to Railway + frontend to Vercel
