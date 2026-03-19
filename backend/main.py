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

    if not is_supported(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Only audio and video files are supported"
        )

    job_id = str(uuid.uuid4())
    suffix = Path(file.filename).suffix.lower()
    upload_path = f"data/uploads/{job_id}{suffix}"

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    redis_client.set(job_id, json.dumps({"status": "queued"}))
    transcribe_file.delay(job_id, upload_path, file.filename)

    return {"job_id": job_id, "status": "queued"}


@app.get("/status/{job_id}")
async def get_status(job_id: str):

    result = redis_client.get(job_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return json.loads(result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)