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
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    cyan: 'bg-cyan-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ease-out ${colorMap[color] ?? 'bg-blue-500'}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
