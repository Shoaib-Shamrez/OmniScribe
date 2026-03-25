interface WaveformBarsProps {
  active: boolean;
}

export default function WaveformBars({ active }: WaveformBarsProps) {
  const bars = Array.from({ length: 28 });

  return (
    <div className="flex items-center gap-[3px] h-10">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-sm transition-all duration-200 ${
            active ? "bg-amber animate-wave" : "bg-border-custom h-2"
          }`}
          style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }}
        />
      ))}
    </div>
  );
}
