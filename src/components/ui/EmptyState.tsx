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
      <div className="mb-4 rounded-card-lg border border-app-border bg-accent/5 p-4 text-accent dark:bg-accent/10">
        <Icon size={30} aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-bold tracking-tight text-app-ink">{title}</h3>
      <p className="mb-6 max-w-sm text-sm leading-6 text-app-subtle">{description}</p>
      {action}
    </div>
  );
}
