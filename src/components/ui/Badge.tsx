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
  blue: 'bg-cat-blue/10 text-cat-blue-ink ring-cat-blue/20',
  emerald: 'bg-cat-green/10 text-cat-green-ink ring-cat-green/20',
  purple: 'bg-cat-indigo/10 text-cat-indigo ring-cat-indigo/20',
  amber: 'bg-cat-amber/10 text-cat-amber-ink ring-cat-amber/25',
  red: 'bg-accent/10 text-app-ink ring-accent/20',
  slate: 'bg-app-muted text-app-subtle ring-app-border',
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
