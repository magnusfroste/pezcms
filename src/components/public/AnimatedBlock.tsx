import { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface AnimatedBlockProps {
  children: ReactNode;
  animation?: 'fade-up' | 'fade-in' | 'slide-up' | 'scale-in';
  delay?: number;
  className?: string;
}

export function AnimatedBlock({ 
  children, 
  animation = 'fade-up',
  delay = 0,
  className 
}: AnimatedBlockProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  const animationClasses = {
    'fade-up': 'translate-y-8 opacity-0',
    'fade-in': 'opacity-0',
    'slide-up': 'translate-y-12 opacity-0',
    'scale-in': 'scale-95 opacity-0',
  };

  const visibleClasses = 'translate-y-0 scale-100 opacity-100';

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible ? visibleClasses : animationClasses[animation],
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
