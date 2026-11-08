import { type InputHTMLAttributes, forwardRef } from 'react';

/**
 * Input — Styled text input field for forms with white and black theme support.
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 shadow-sm
            text-neutral-900 placeholder:text-neutral-400
            dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500
            transition-colors duration-200
            focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
