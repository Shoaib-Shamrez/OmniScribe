

## ## 📋 Project Overview: OmniScribe AI (Phase 1)

This project is a **RESTful Speech-to-Text API**. It allows a user to upload an audio file and receive a structured JSON response containing the full text and specific timestamps for every sentence spoken.

### ### 1. Current Code Breakdown (The "How it Works")

Your current `main.py` follows a 4-step execution flow:

1. **Validation:** It checks the file extension to ensure it’s a valid audio format (MP3, WAV, etc.).
2. **Buffering:** It uses `shutil.copyfileobj` to stream the file from the request directly to a temporary file on your disk. This is a "Memory Efficient" choice—it prevents the server from crashing by not loading the whole file into RAM at once.
3. **Inference:** It calls `whisper.load_model("base")` to process the audio. The "base" model is chosen for its balance of speed and accuracy.
4. **Transformation:** It loops through the `result["segments"]` list to restructure the data into a clean, developer-friendly format with `"start"`, `"end"`, and `"text"`.

---

## ## 🚀 The "Production" Upgrade (For 3-Hour Videos)

Your current code has one limitation: it is **Synchronous**. If you upload a 3-hour meeting, the browser will wait 20 minutes for a response and then timeout. To fix this for a real job, we must move to an **Asynchronous Architecture**.

### ### 2. The Distributed System Design

Instead of one script doing everything, we split the work into three parts:

| Component | Responsibility |
| --- | --- |
| **FastAPI (The Boss)** | Receives the file and immediately returns a `job_id`. It doesn't wait for the AI. |
| **Redis (The Queue)** | Acts as a "waiting room." It holds the list of files that need transcribing. |
| **Celery (The Worker)** | A background process that picks up files from the queue, runs FFmpeg and Whisper, and saves the results. |

---

## ## 🛠️ 3. Full Project Roadmap (From Start to Finish)

### ### Phase 1: Handling Video (The FFmpeg Layer)

To handle meetings, we need to extract audio from video.

* **Action:** Add `ffmpeg-python` to your requirements.
* **Reason:** Video files are 10x larger than audio. Processing only the audio track makes the system faster and cheaper to run.

### ### Phase 2: The Background Worker

* **Action:** Move your `model.transcribe` logic into a Celery task.
* **Result:** When a user uploads a 3-hour video, the API says "Got it! Check back in 10 minutes at `/status/{job_id}`."

### ### Phase 3: The React Frontend

Since you are a frontend developer, your UI should include:

* **A Progress Bar:** Using the `job_id` to poll the server.
* **Interactive Transcript:** When a user clicks a sentence, the video player jumps to that exact time (e.g., `videoRef.current.currentTime = segment.start`).

---

## ## 📂 4. Project File Structure (End-to-End)

This is how a professional Python project should be organized:

```text
OmniScribe-AI/
├── backend/
│   ├── main.py          # FastAPI Endpoints
│   ├── worker.py        # Celery + Whisper Logic
│   ├── utils.py         # FFmpeg Video Extraction
│   └── requirements.txt # Dependencies
├── frontend/
│   ├── src/             # React App
│   └── tailwind.config.js
├── data/                # Temporary storage for uploads
├── docker-compose.yml   # Runs Redis and PostgreSQL automatically
└── README.md            # Your "Engineering Decisions" document

```

---

## ## 💡 5. Why this wins the Interview

When you explain this project to **Volga Partners**, focus on these **Engineering Decisions**:

1. **"I used a Producer-Consumer model** to ensure that long 3-hour meetings don't block our web traffic."
2. **"I implemented FFmpeg pre-processing** to reduce file sizes before AI analysis, saving 80% on compute resources."
3. **"I designed a Polling mechanism** in the React frontend to give users a real-time status of their transcription progress."

