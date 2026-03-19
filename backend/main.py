import os
import shutil
import uuid
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from pathlib import Path
from redis import Redis
from worker import transcribe_file
from utils import is_supported
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = Redis(host="localhost", port=6379, db=0, decode_responses=True)

os.makedirs("data/uploads", exist_ok=True)
os.makedirs("data/outputs", exist_ok=True)

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):

    # 1. Validate file type
    if not is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Send audio or video files only."
        )

    # 2. Generate unique job ID
    job_id = str(uuid.uuid4())
    suffix = Path(file.filename).suffix.lower()
    upload_path = f"data/uploads/{job_id}{suffix}"

    # 3. Save file to disk
    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4. Store initial status in Redis
    redis_client.set(job_id, json.dumps({ "status": "queued" }))

    # 5. Hand off to Celery worker — returns instantly
    transcribe_file.delay(job_id, upload_path, file.filename)

    # 6. Respond immediately
    return { "job_id": job_id, "status": "queued" }


@app.get("/status/{job_id}")
async def get_status(job_id: str):

    # 1. Read from Redis
    result = redis_client.get(job_id)

    # 2. Handle job not found
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # 3. Return the status
    return json.loads(result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)

## The full picture now

# Let's trace exactly what happens when someone uploads a 3 hour video:
# ```
# POST /transcribe
#   → file saved to data/uploads/abc-123.mp4
#   → Redis: "abc-123" = { status: "queued" }
#   → transcribe_file.delay() → job dropped in queue
#   → response: { job_id: "abc-123", status: "queued" }
#      ← user gets this in under 1 second

# Meanwhile in worker.py...
#   → picks up abc-123 from queue
#   → Redis: "abc-123" = { status: "processing" }
#   → FFmpeg extracts audio
#   → Whisper runs for 15 minutes
#   → Redis: "abc-123" = { status: "done", transcription: "...", segments: [...] }

# Frontend polls every 5 seconds...
#   GET /status/abc-123 → { status: "processing" }
#   GET /status/abc-123 → { status: "processing" }
#   GET /status/abc-123 → { status: "done", transcription: "..." }
# ```

# ---

# ## Where the backend stands now
# ```
# utils.py   ✅  FFmpeg layer — handles video → audio conversion
# worker.py  ✅  Celery task — runs Whisper in background
# main.py    ✅  Two endpoints — upload and status check