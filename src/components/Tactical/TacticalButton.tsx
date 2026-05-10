import { cn } from '../../lib/utils';
import { ReactNode } from 'react';

interface TacticalButtonProps {
  label: string;
  danger?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export function TacticalButton({
  label,
  danger,
  onClick,
  className,
  children
}: TacticalButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(`
        relative
        px-6 py-3
        rounded-xl
        font-semibold
        tracking-widest
        uppercase
        transition-all
        duration-300
        border
        backdrop-blur-xl
        ${danger
          ? 'bg-red-500/15 border-red-400 text-red-300 hover:shadow-red-500/40'
          : 'bg-cyan-500/10 border-cyan-400 text-cyan-200 hover:shadow-cyan-400/40'}
        hover:scale-105
        hover:shadow-2xl
      `, className)}
    >
      {label || children}
    </button>
  );
}
