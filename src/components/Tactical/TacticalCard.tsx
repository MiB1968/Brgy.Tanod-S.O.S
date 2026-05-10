import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function TacticalCard({ title, children, className }: Props) {
  return (
    <div className={cn("tactical-panel p-5 tactical-grid relative overflow-hidden", className)}>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-cyan-400" />
      </div>

      {title && (
        <h3 className="text-cyan-300 text-sm tracking-[0.35em] uppercase mb-4">
          {title}
        </h3>
      )}

      {children}
    </div>
  );
}
