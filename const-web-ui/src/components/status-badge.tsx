import clsx from 'clsx';

type Tone = 'emerald' | 'amber' | 'rose' | 'slate';

const TONE_CLASS: Record<Tone, string> = {
  emerald:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  slate: 'border-slate-600/60 bg-slate-800/60 text-slate-300',
};

function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (
    s.includes('active') ||
    s.includes('open') ||
    s.includes('complete') ||
    s.includes('done') ||
    s.includes('ok')
  ) {
    return 'emerald';
  }
  if (
    s.includes('provision') ||
    s.includes('pending') ||
    s.includes('progress') ||
    s.includes('medium') ||
    s.includes('warn')
  ) {
    return 'amber';
  }
  if (
    s.includes('critical') ||
    s.includes('high') ||
    s.includes('fail') ||
    s.includes('error') ||
    s.includes('blocked') ||
    s.includes('closed')
  ) {
    return 'rose';
  }
  if (s.includes('low')) return 'slate';
  return 'slate';
}

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone?: Tone;
}) {
  const resolved = tone ?? toneForStatus(label);
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        TONE_CLASS[resolved],
      )}
    >
      {label.replaceAll('_', ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const tone: Tone =
    p === 'critical' || p === 'high'
      ? 'rose'
      : p === 'medium'
        ? 'amber'
        : 'slate';
  return <StatusBadge label={priority} tone={tone} />;
}
