import { forwardRef } from 'react';
import { cn } from '@/utils/query';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftIcon, rightElement, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full border bg-white rounded-xl text-sm text-navy placeholder:text-muted-light',
              'transition-all duration-150 outline-none',
              'focus:ring-2 focus:ring-brand/30 focus:border-brand',
              leftIcon ? 'pl-10 pr-4 py-3' : 'px-4 py-3',
              rightElement ? 'pr-10' : '',
              error
                ? 'border-danger focus:ring-danger/30 focus:border-danger'
                : 'border-muted-light/50',
              className
            )}
            aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger flex items-center gap-1" role="alert">
            <span>⚠</span> {error}
          </p>
        )}
        {helper && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-muted-light">
            {helper}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
