# Audio Transcription API

This project provides a RESTful API for transcribing audio files into text with per‑segment timestamps. It’s built with **FastAPI** and uses **OpenAI’s Whisper** model for the actual transcription.

## How it works

The API exposes a single endpoint `/transcribe` that accepts an audio file upload. It returns the full transcript along with a list of segments—each containing a start time, end time, and the corresponding text. This makes it easy to integrate with applications that need captions, subtitles, or searchable transcripts.

I chose FastAPI because it handles asynchronous requests well (so the server stays responsive while the model processes the file) and comes with built‑in validation, reducing boilerplate.

## Design choices

- **Memory efficiency**: Audio files are streamed directly to disk instead of being loaded into RAM. This keeps memory usage low even for large files.
- **Reliable cleanup**: Temporary files are removed immediately after transcription—whether it succeeds or fails. The deletion logic is duplicated in both the success and error paths to guarantee that disk space isn’t gradually consumed.
- **Structured output**: The raw Whisper output includes segment‑level timestamps. I extract these into a clean list of dictionaries so the response can be used directly by downstream tools (e.g., video editors, subtitle generators).

## Potential improvements for production

If this service were to be deployed at scale, a few enhancements would make sense:

- Move transcription tasks to a background job queue (e.g., Celery with Redis) to keep the API responsive under load.
- Store uploaded files in cloud storage like AWS S3 instead of the local filesystem.
- Persist transcripts in a database (PostgreSQL, for example) to allow users to retrieve past transcriptions.

For now, the current implementation is suitable for small‑scale use or local experimentation.
