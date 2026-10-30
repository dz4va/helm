import React from 'react';
import { cn } from '@/lib/utils';

const paddingMap = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
} as const;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: keyof typeof paddingMap;
  hover?: boolean;
  className?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, padding = 'md', hover = false, className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-helm-card border border-helm-border rounded-lg',
        paddingMap[padding],
        hover && 'transition-all duration-200 hover:border-helm-borderStrong hover:scale-[1.01] hover:shadow-lg hover:shadow-black/40',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
