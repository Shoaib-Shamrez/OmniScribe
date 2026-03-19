import { useState, useRef, useCallback, useEffect } from "react";
import type { AppState, Segment, StatusResponse } from "./types";
import Navbar from "./components/Navbar";
import UploadZone from "./components/UploadZone";
import ProcessingScreen from "./components/ProcessingScreen";
import TranscriptView from "./components/TranscriptView";
import ErrorBox from "./components/ErrorBox";

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
        const res = await fetch(`http://localhost:4000/status/${id}`);
        const data: StatusResponse = await res.json();

        if (data.status === "done" && data.segments) {
          stopPolling();
          setSegments(data.segments);
          setState("done");
        } else if (data.status === "failed") {
          stopPolling();
          setErrorMsg(data.error ?? "Transcription failed.");
          setState("error");
        }
      } catch {
        stopPolling();
        setErrorMsg("Lost connection to server.");
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
      const res = await fetch("http://localhost:4000/transcribe", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail ?? "Upload failed.");
        setState("error");
        return;
      }

      setState("processing");
      poll(data.job_id);
    } catch {
      setErrorMsg("Could not reach the server. Is it running?");
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

  useEffect(() => () => stopPolling(), []);

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
              Sending your file<em className="not-italic text-amber">…</em>
            </h1>
            <UploadZone onFile={handleFile} uploading={true} />
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
          backend live · localhost:4000
        </span>
      </footer>
    </div>
  );
}
