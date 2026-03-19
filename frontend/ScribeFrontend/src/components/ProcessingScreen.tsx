import { useState, useEffect } from "react";

interface ProcessingScreenProps {
  filename: string;
}

export default function ProcessingScreen({ filename }: ProcessingScreenProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      500,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-12 px-6 text-center">
      {/* Spinning ring */}
      <div className="relative w-[90px] h-[90px] flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full -rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#232329"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="276"
            strokeDashoffset="276"
            className="animate-spin-arc"
          />
        </svg>
        <span className="text-2xl z-10">🎙</span>
      </div>

      <p className="text-base font-semibold text-text-main">
        Transcribing <em className="not-italic text-amber">{filename}</em>
        {dots}
      </p>
      <p className="text-xs text-muted max-w-[36ch] leading-relaxed">
        Long files take a few minutes — we'll show results the moment they're
        ready.
      </p>
    </div>
  );
}
