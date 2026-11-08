import { type SelectHTMLAttributes, forwardRef } from 'react';

/**
 * Select — Styled dropdown select field with white and black theme support.
 */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 shadow-sm
            text-neutral-900 transition-colors duration-200
            dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100
            focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
