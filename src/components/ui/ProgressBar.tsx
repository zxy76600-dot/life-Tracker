/**
 * ProgressBar — Visual indicator of progress (0-100%) with white and true black theme support.
 */
interface ProgressBarProps {
  value: number;     // 0-100
  color?: string;    // Tailwind color class
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  color = 'blue',
  size = 'md',
  showLabel = true,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  const colorMap: Record<string, string> = {
    blue: 'bg-cat-blue',
    emerald: 'bg-cat-green',
    purple: 'bg-cat-indigo',
    amber: 'bg-cat-amber',
    red: 'bg-accent',
    cyan: 'bg-cat-teal',
  };

  return (
    <div className="flex items-center gap-3">
      <div role="progressbar" aria-valuenow={Math.round(clampedValue)} aria-valuemin={0} aria-valuemax={100} className={`flex-1 overflow-hidden rounded-full bg-app-muted ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${colorMap[color] ?? 'bg-cat-blue'}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-app-subtle tabular-nums">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
