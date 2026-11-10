import { type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * Button — Reusable button with multiple variants supporting white and true black themes.
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent-contrast text-white hover:brightness-95 active:brightness-90 shadow-accent',
  secondary: 'border border-app-border bg-app-card text-app-ink hover:border-accent/30 hover:bg-accent-soft active:bg-accent/15 dark:hover:bg-accent/10',
  danger: 'bg-accent/10 text-app-ink hover:bg-accent/15',
  ghost: 'text-app-subtle hover:bg-app-muted hover:text-app-ink',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex min-h-10 items-center justify-center gap-2 rounded-card
        font-semibold transition-colors duration-200 motion-reduce:transition-none cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg
        disabled:pointer-events-none disabled:opacity-50
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
