import { useState, useRef, useCallback, useEffect } from "react";
import type { AppState, Segment, StatusResponse } from "./types";
import Navbar from "./components/Navbar";
import UploadZone from "./components/UploadZone";
import ProcessingScreen from "./components/ProcessingScreen";
import TranscriptView from "./components/TranscriptView";
import ErrorBox from "./components/ErrorBox";
import api from "./utils/http";
import axios from "axios";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [filename, setFilename] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const poll = useCallback((id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<StatusResponse>(`/status/${id}`);
        const data = res.data;

        switch (data.status) {
          case "done":
            if (data.segments) {
              stopPolling();
              setSegments(data.segments);
              setState("done");
            }
            break;

          case "failed":
            stopPolling();
            setErrorMsg(data.error ?? "Transcription failed.");
            setState("error");
            break;

          default:
            // queued / processing
            break;
        }
      } catch (err) {
        stopPolling();

        if (axios.isAxiosError(err)) {
          setErrorMsg(
            err.response?.data?.detail ?? "Lost connection to server.",
          );
        } else {
          setErrorMsg("An unexpected error occurred.");
        }

        setState("error");
      }
    }, 4000);
  }, []);

  const handleFile = async (file: File) => {
    setFilename(file.name);
    setState("uploading");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api.post("/transcribe", form);
      const data = res.data;

      setState("processing");
      poll(data.job_id);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          "Backend server is unavailable. Please contact me to start the backend.",
        );
      } else {
        setErrorMsg("An unexpected error occurred.");
      }

      setState("error");
    }
  };

  const reset = () => {
    stopPolling();
    setSegments([]);
    setFilename("");
    setErrorMsg("");
    setState("idle");
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-main font-syne">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-4">
        {state === "idle" && (
          <>
            <p className="font-mono text-[0.72rem] tracking-[0.15em] text-amber uppercase">
              Powered by OpenAI Whisper
            </p>

            <h1 className="text-5xl font-extrabold tracking-tight leading-none max-w-[16ch]">
              Every word, <em className="not-italic text-amber">captured.</em>
            </h1>

            <p className="text-base text-muted max-w-[42ch] leading-relaxed font-normal">
              Upload any audio or video file and get a precise, timestamped
              transcript in minutes — no account needed.
            </p>

            <UploadZone onFile={handleFile} uploading={false} />
          </>
        )}

        {state === "uploading" && (
          <>
            <p className="font-mono text-[0.72rem] tracking-[0.15em] text-amber uppercase">
              Uploading
            </p>

            <h1 className="text-4xl font-extrabold tracking-tight leading-none">
              Sending your file
              <em className="not-italic text-amber">…</em>
            </h1>

            <UploadZone onFile={handleFile} uploading />
          </>
        )}

        {state === "processing" && <ProcessingScreen filename={filename} />}

        {state === "error" && <ErrorBox message={errorMsg} onRetry={reset} />}
      </main>

      {state === "done" && (
        <TranscriptView segments={segments} onReset={reset} />
      )}

      <footer className="flex justify-between items-center px-10 py-5 border-t border-border-custom">
        <span className="font-mono text-[0.68rem] text-muted">
          © 2026 OmniScribe AI
        </span>

        <span className="font-mono text-[0.68rem] text-muted flex items-center gap-2">
          <span className="w-[6px] h-[6px] rounded-full bg-green-500 animate-pulse-dot" />
          backend live
        </span>
      </footer>
    </div>
  );
}
