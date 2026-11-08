import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

/**
 * EmptyState — Shown when a page/section has no data yet.
 * Supports white and true black themes.
 */
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
        <Icon size={32} className="text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      {action}
    </div>
  );
}
