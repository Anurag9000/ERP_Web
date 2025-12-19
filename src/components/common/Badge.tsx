import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  color?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'default', color, dot }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--pastel-gray-bg)] text-[var(--pastel-gray-text)]',
    success: 'bg-[var(--pastel-green-bg)] text-[var(--pastel-green-text)]',
    warning: 'bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)]',
    danger: 'bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)]',
    info: 'bg-[var(--pastel-blue-bg)] text-[var(--pastel-blue-text)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        !color && variants[variant]
      )}
      style={color ? { backgroundColor: color, color: '#1F2937' } : undefined}
    >
      {dot && (
        <span
          className="w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
      {children}
    </span>
  );
}
