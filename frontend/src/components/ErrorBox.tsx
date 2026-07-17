type ErrorBoxProps = {
  message: string;
  onRetry: () => void;
};

export default function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  const isBackendError =
    message.toLowerCase().includes("server") ||
    message.toLowerCase().includes("connection") ||
    message.toLowerCase().includes("reach") ||
    message.toLowerCase().includes("backend");

  return (
    <div className="max-w-md text-center space-y-4">
      <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>

        {isBackendError ? (
          <p className="mt-3 text-muted leading-relaxed">
            The backend server is currently offline because it requires
            additional resources to run Whisper AI.
            <br />
            <br />
            If you want to test OmniScribe, please email me at
            shoaibshamrez@gmail.com and I will start the backend server for you.
          </p>
        ) : (
          <p className="mt-3 text-muted">{message}</p>
        )}
      </div>

      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-lg bg-amber text-black font-semibold hover:opacity-90"
      >
        Try Again
      </button>
    </div>
  );
}
