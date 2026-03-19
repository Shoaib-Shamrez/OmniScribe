import whisper
import os
import json
from celery import Celery
from redis import Redis
from utils import prepare_audio

model = whisper.load_model("base")

celery = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

redis_client = Redis(host="localhost", port=6379, db=0, decode_responses=True)

@celery.task
def transcribe_file(job_id, file_path, original_filename):
    
    audio_path = file_path
    
    try:
        redis_client.set(job_id, json.dumps({ "status": "processing" }))

        audio_path = prepare_audio(file_path, original_filename, job_id)
        result = model.transcribe(audio_path)

        segments = []
        for seg in result["segments"]:
            segments.append({
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip()
            })

        redis_client.set(job_id, json.dumps({
            "status": "done",
            "transcription": result["text"],
            "segments": segments
        }))

    except Exception as e:
        redis_client.set(job_id, json.dumps({
            "status": "failed",
            "error": str(e)
        }))

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        if audio_path != file_path and os.path.exists(audio_path):
            os.remove(audio_path)

