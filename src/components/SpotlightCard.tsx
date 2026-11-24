import React, { useRef } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch {
      /* segue normalmente */
    }
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--spot-x', `${x}px`);
    el.style.setProperty('--spot-y', `${y}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`spotlight-card relative overflow-hidden ${className}`}
    >
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};
