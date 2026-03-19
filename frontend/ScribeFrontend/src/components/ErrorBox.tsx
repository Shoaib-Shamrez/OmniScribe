interface ErrorBoxProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div className="max-w-md text-center px-8 py-10 border border-red-900 rounded-2xl bg-[#180a0a] flex flex-col items-center gap-4">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm text-red-300 leading-relaxed">{message}</p>
      <button
        onClick={onRetry}
        className="font-syne text-xs font-bold px-4 py-2 rounded-lg bg-amber text-bg hover:bg-yellow-400 transition-all cursor-pointer border-none"
      >
        Try again
      </button>
    </div>
  );
}
