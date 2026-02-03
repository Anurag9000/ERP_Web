import { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export function Select({ label, error, className, children, ...props }: SelectProps) {
    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <select
                className={cn(
                    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                    className
                )}
                {...props}
            >
                {children}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
