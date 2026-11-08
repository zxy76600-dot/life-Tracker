import { type ReactNode } from 'react';

/**
 * Badge — Small colored label for categories, tags, or status indicators.
 */
type BadgeVariant = 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'slate';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
  slate: 'bg-neutral-100 text-neutral-700 ring-neutral-400/20 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
};

export function Badge({ children, variant = 'blue', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5
        text-xs font-medium ring-1 ring-inset
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
