export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="te-panel flex items-center gap-3 px-4 py-6 text-slate-300">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-rose-200">
      <p className="font-medium text-rose-300">Could not load data</p>
      <p className="mt-1 text-sm text-rose-200/80">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/20 px-3 py-1.5 text-sm text-rose-100 hover:bg-rose-500/30"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center text-slate-400">
      {message}
    </div>
  );
}
