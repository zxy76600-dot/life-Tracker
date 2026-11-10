import { type SelectHTMLAttributes, forwardRef, useId } from 'react';

/**
 * Select — Styled dropdown select field with white and black theme support.
 */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-app-ink">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            min-h-11 w-full rounded-card border border-app-border bg-app-card px-4 py-2.5 shadow-sm
            text-app-ink transition-colors duration-200 motion-reduce:transition-none
            focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 focus-visible:ring-2 focus-visible:ring-accent
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-app-card text-app-ink">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
