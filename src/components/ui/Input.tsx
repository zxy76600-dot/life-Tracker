import { type InputHTMLAttributes, forwardRef, useId } from 'react';

/**
 * Input — Styled text input field for forms with white and black theme support.
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-app-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? [ariaDescribedBy, `${inputId}-error`].filter(Boolean).join(' ') : ariaDescribedBy}
          className={`
            min-h-11 w-full rounded-card border border-app-border bg-app-card px-4 py-2.5
            text-app-ink placeholder:text-app-subtle shadow-sm transition-colors duration-200 motion-reduce:transition-none
            focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 focus-visible:ring-2 focus-visible:ring-accent
            ${error ? 'border-app-ink focus:border-app-ink focus:ring-app-ink/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-app-ink">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
