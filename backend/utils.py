import ffmpeg
import os

AUDIO_FORMATS = {'.mp3', '.wav', '.m4a', '.aac', '.flac', '.wma', '.opus'}
VIDEO_FORMATS = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv', '.flv'}

def is_supported(filename):
    extension = os.path.splitext(filename)[1].lower()
    return extension in AUDIO_FORMATS or extension in VIDEO_FORMATS

def prepare_audio(file_path, filename, job_id):
    extension = os.path.splitext(filename)[1].lower()
    
    if extension in VIDEO_FORMATS:
        output_path = f"data/outputs/{job_id}_audio.wav"
        ffmpeg.input(file_path).output(output_path, ac=1, ar='16000').run()
        return output_path
    else:
        return file_path
