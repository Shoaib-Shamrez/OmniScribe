import { useState } from "react";
import type { Segment } from "../types";
import { formatTime } from "../utils/formatTime";

interface TranscriptViewProps {
  segments: Segment[];
  onReset: () => void;
}

export default function TranscriptView({
  segments,
  onReset,
}: TranscriptViewProps) {
  const [copied, setCopied] = useState(false);
  const fullText = segments.map((s) => s.text).join(" ");

  const copy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between py-6 border-b border-border-custom mb-2 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-text-main">
          Transcript
        </h2>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="font-syne text-xs font-bold px-4 py-2 rounded-lg border border-border-custom text-muted hover:text-text-main hover:border-muted transition-all cursor-pointer bg-transparent"
          >
            {copied ? "✓ Copied" : "Copy text"}
          </button>
          <button
            onClick={onReset}
            className="font-syne text-xs font-bold px-4 py-2 rounded-lg bg-amber text-bg hover:bg-yellow-400 transition-all cursor-pointer border-none"
          >
            New file
          </button>
        </div>
      </div>

      {/* Segments */}
      <div>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="grid gap-4 py-3 border-b border-border-custom"
            style={{ gridTemplateColumns: "56px 1fr" }}
          >
            <span className="font-mono text-[0.7rem] text-amber tracking-wide pt-[2px]">
              {formatTime(seg.start)}
            </span>
            <p className="font-mono text-sm leading-relaxed text-text-main">
              {seg.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
