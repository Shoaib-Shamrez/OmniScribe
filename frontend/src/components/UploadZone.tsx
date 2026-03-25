import { useRef, useState, useCallback } from "react";
import WaveformBars from "./WaveformBars";

interface UploadZoneProps {
  onFile: (file: File) => void;
  uploading: boolean;
}

export default function UploadZone({ onFile, uploading }: UploadZoneProps) {
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
      className={`relative w-full max-width-2xl mt-6 flex flex-col items-center gap-6 px-8 py-12 rounded-2xl border border-dashed cursor-pointer overflow-hidden transition-all duration-200
        ${dragging ? "border-amber bg-[#16160e]" : "border-border-custom bg-surface"}
        ${uploading ? "pointer-events-none border-amber-dim" : "hover:border-amber hover:bg-[#16160e]"}
      `}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.06),transparent_70%)] pointer-events-none" />

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.flac,.mp4,.mkv,.mov,.webm,.avi"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />

      <WaveformBars active={uploading} />

      <div className="flex flex-col items-center gap-1 text-center">
        {uploading ? (
          <>
            <span className="text-xl font-bold tracking-tight text-text-main">
              Uploading…
            </span>
            <span className="text-sm text-muted">Hang tight</span>
          </>
        ) : (
          <>
            <span className="text-xl font-bold tracking-tight text-text-main">
              {dragging ? "Drop it." : "Drop your file here"}
            </span>
            <span className="text-sm text-muted">
              or <u>click to browse</u> — audio &amp; video supported
            </span>
            <span className="mt-2 font-mono text-[0.65rem] text-muted tracking-wide">
              mp3 · wav · m4a · flac · mp4 · mkv · mov · webm
            </span>
          </>
        )}
      </div>
    </div>
  );
}
