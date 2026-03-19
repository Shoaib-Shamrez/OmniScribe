import { useState, useRef, useCallback, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type AppState = "idle" | "uploading" | "processing" | "done" | "error";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface StatusResponse {
  status: "queued" | "processing" | "done" | "failed";
  transcription?: string;
  segments?: Segment[];
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// ── Waveform bars (pure CSS animation) ───────────────────────────────────
function WaveformBars({ active }: { active: boolean }) {
  const bars = Array.from({ length: 28 });
  return (
    <div className="waveform">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`bar ${active ? "bar--active" : ""}`}
          style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }}
        />
      ))}
    </div>
  );
}

// ── Upload Zone ────────────────────────────────────────────────────────────
function UploadZone({
  onFile,
  uploading,
}: {
  onFile: (f: File) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      className={`upload-zone ${dragging ? "upload-zone--drag" : ""} ${uploading ? "upload-zone--uploading" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.flac,.mp4,.mkv,.mov,.webm,.avi"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />

      <WaveformBars active={uploading} />

      <div className="upload-zone__text">
        {uploading ? (
          <>
            <span className="upload-zone__title">Uploading…</span>
            <span className="upload-zone__sub">Hang tight</span>
          </>
        ) : (
          <>
            <span className="upload-zone__title">
              {dragging ? "Drop it." : "Drop your file here"}
            </span>
            <span className="upload-zone__sub">
              or <u>click to browse</u> — audio &amp; video supported
            </span>
            <div className="upload-zone__formats">
              mp3 · wav · m4a · flac · mp4 · mkv · mov · webm
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Processing Screen ──────────────────────────────────────────────────────
function ProcessingScreen({ filename }: { filename: string }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      500,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="processing">
      <div className="processing__ring">
        <svg viewBox="0 0 100 100" className="processing__svg">
          <circle cx="50" cy="50" r="44" className="processing__track" />
          <circle cx="50" cy="50" r="44" className="processing__arc" />
        </svg>
        <span className="processing__icon">🎙</span>
      </div>
      <p className="processing__label">
        Transcribing <em>{filename}</em>
        {dots}
      </p>
      <p className="processing__hint">
        Long files take a few minutes — we'll show results the moment they're
        ready.
      </p>
    </div>
  );
}

// ── Transcript View ────────────────────────────────────────────────────────
function TranscriptView({
  segments,
  onReset,
}: {
  segments: Segment[];
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const fullText = segments.map((s) => s.text).join(" ");

  const copy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="transcript">
      <div className="transcript__header">
        <h2 className="transcript__title">Transcript</h2>
        <div className="transcript__actions">
          <button className="btn btn--ghost" onClick={copy}>
            {copied ? "✓ Copied" : "Copy text"}
          </button>
          <button className="btn btn--primary" onClick={onReset}>
            New file
          </button>
        </div>
      </div>

      <div className="transcript__segments">
        {segments.map((seg, i) => (
          <div key={i} className="segment">
            <span className="segment__time">{formatTime(seg.start)}</span>
            <p className="segment__text">{seg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
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

      setJobId(data.job_id);
      setState("processing");
      poll(data.job_id);
    } catch {
      setErrorMsg("Could not reach the server. Is it running?");
      setState("error");
    }
  };

  const reset = () => {
    stopPolling();
    setJobId(null);
    setSegments([]);
    setFilename("");
    setErrorMsg("");
    setState("idle");
  };

  useEffect(() => () => stopPolling(), []);

  return (
    <>
      {/* ── Global styles ───────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #0d0d0f;
          --surface:   #141417;
          --border:    #232329;
          --amber:     #f59e0b;
          --amber-dim: #78490a;
          --text:      #e8e8ea;
          --muted:     #6b6b78;
          --font-head: 'Syne', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          --radius:    14px;
        }

        html, body, #root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-head);
        }

        /* Grain overlay */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
          z-index: 999;
        }

        /* ── Layout ───────────────────────────────────────────────── */
        .shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Nav ──────────────────────────────────────────────────── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2.5rem;
          border-bottom: 1px solid var(--border);
        }
        .nav__logo {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
        }
        .nav__logo span { color: var(--amber); }
        .nav__badge {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--muted);
          border: 1px solid var(--border);
          padding: 0.2rem 0.6rem;
          border-radius: 100px;
        }

        /* ── Hero ─────────────────────────────────────────────────── */
        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1.5rem;
          text-align: center;
          gap: 1rem;
        }
        .hero__eyebrow {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.15em;
          color: var(--amber);
          text-transform: uppercase;
        }
        .hero__title {
          font-size: clamp(2.4rem, 6vw, 4.5rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.05;
          max-width: 16ch;
        }
        .hero__title em {
          font-style: normal;
          color: var(--amber);
        }
        .hero__sub {
          font-size: 1rem;
          color: var(--muted);
          max-width: 42ch;
          line-height: 1.6;
          font-weight: 400;
        }

        /* ── Upload zone ──────────────────────────────────────────── */
        .upload-zone {
          width: 100%;
          max-width: 640px;
          margin-top: 1.5rem;
          border: 1.5px dashed var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          position: relative;
          overflow: hidden;
        }
        .upload-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .upload-zone:hover,
        .upload-zone--drag {
          border-color: var(--amber);
          background: #16160e;
        }
        .upload-zone--uploading {
          pointer-events: none;
          border-color: var(--amber-dim);
        }

        .upload-zone__text {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
        }
        .upload-zone__title {
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .upload-zone__sub {
          font-size: 0.88rem;
          color: var(--muted);
        }
        .upload-zone__formats {
          margin-top: 0.5rem;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--muted);
          letter-spacing: 0.05em;
        }

        /* ── Waveform ─────────────────────────────────────────────── */
        .waveform {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 40px;
        }
        .bar {
          width: 3px;
          border-radius: 3px;
          background: var(--border);
          height: 8px;
          transition: height 0.2s;
        }
        .bar--active {
          background: var(--amber);
          animation: wave 1s ease-in-out infinite alternate;
        }
        @keyframes wave {
          0%   { height: 4px; }
          100% { height: 36px; }
        }

        /* ── Processing ───────────────────────────────────────────── */
        .processing {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          padding: 3rem 1.5rem;
          text-align: center;
        }
        .processing__ring {
          position: relative;
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .processing__svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .processing__track {
          fill: none;
          stroke: var(--border);
          stroke-width: 6;
        }
        .processing__arc {
          fill: none;
          stroke: var(--amber);
          stroke-width: 6;
          stroke-linecap: round;
          stroke-dasharray: 276;
          stroke-dashoffset: 276;
          animation: spin-arc 2s ease-in-out infinite;
        }
        @keyframes spin-arc {
          0%   { stroke-dashoffset: 276; }
          50%  { stroke-dashoffset: 60; }
          100% { stroke-dashoffset: 276; }
        }
        .processing__icon {
          font-size: 1.6rem;
          z-index: 1;
        }
        .processing__label {
          font-size: 1rem;
          font-weight: 600;
        }
        .processing__label em {
          color: var(--amber);
          font-style: normal;
        }
        .processing__hint {
          font-size: 0.82rem;
          color: var(--muted);
          max-width: 36ch;
          line-height: 1.6;
        }

        /* ── Transcript ───────────────────────────────────────────── */
        .transcript {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 1.5rem 4rem;
        }
        .transcript__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 0 1rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .transcript__title {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .transcript__actions {
          display: flex;
          gap: 0.5rem;
        }

        .segment {
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
          align-items: baseline;
        }
        .segment__time {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--amber);
          padding-top: 0.15rem;
          letter-spacing: 0.05em;
        }
        .segment__text {
          font-family: var(--font-mono);
          font-size: 0.88rem;
          line-height: 1.7;
          color: var(--text);
        }

        /* ── Buttons ──────────────────────────────────────────────── */
        .btn {
          font-family: var(--font-head);
          font-size: 0.82rem;
          font-weight: 700;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          letter-spacing: 0.01em;
        }
        .btn--primary {
          background: var(--amber);
          color: #0d0d0f;
        }
        .btn--primary:hover { background: #fbbf24; }
        .btn--ghost {
          background: transparent;
          color: var(--muted);
          border: 1px solid var(--border);
        }
        .btn--ghost:hover { color: var(--text); border-color: var(--muted); }

        /* ── Error ────────────────────────────────────────────────── */
        .error-box {
          max-width: 480px;
          text-align: center;
          padding: 2.5rem 2rem;
          border: 1px solid #7f1d1d;
          border-radius: var(--radius);
          background: #180a0a;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .error-box__icon { font-size: 2rem; }
        .error-box__msg { font-size: 0.9rem; color: #fca5a5; line-height: 1.6; }

        /* ── Footer ───────────────────────────────────────────────── */
        .footer {
          padding: 1.25rem 2.5rem;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer__copy {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--muted);
        }
        .footer__status {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .footer__dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      <div className="shell">
        {/* Nav */}
        <nav className="nav">
          <span className="nav__logo">
            Omni<span>Scribe</span>
          </span>
          <span className="nav__badge">AI · Phase 1</span>
        </nav>

        {/* Main content */}
        <main className="hero">
          {state === "idle" && (
            <>
              <p className="hero__eyebrow">Powered by OpenAI Whisper</p>
              <h1 className="hero__title">
                Every word, <em>captured.</em>
              </h1>
              <p className="hero__sub">
                Upload any audio or video file and get a precise, timestamped
                transcript in minutes — no account needed.
              </p>
              <UploadZone onFile={handleFile} uploading={false} />
            </>
          )}

          {state === "uploading" && (
            <>
              <p className="hero__eyebrow">Uploading</p>
              <h1 className="hero__title" style={{ fontSize: "2.5rem" }}>
                Sending your file<em>…</em>
              </h1>
              <UploadZone onFile={handleFile} uploading={true} />
            </>
          )}

          {state === "processing" && <ProcessingScreen filename={filename} />}

          {state === "error" && (
            <div className="error-box">
              <span className="error-box__icon">⚠️</span>
              <p className="error-box__msg">{errorMsg}</p>
              <button className="btn btn--primary" onClick={reset}>
                Try again
              </button>
            </div>
          )}
        </main>

        {state === "done" && (
          <TranscriptView segments={segments} onReset={reset} />
        )}

        {/* Footer */}
        <footer className="footer">
          <span className="footer__copy">© 2026 OmniScribe AI</span>
          <span className="footer__status">
            <span className="footer__dot" />
            backend live · localhost:4000
          </span>
        </footer>
      </div>
    </>
  );
}
