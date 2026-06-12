import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-bold leading-tight',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
        ok: 'bg-primary-soft text-primary-dark',
        info: 'bg-accent text-accent-foreground',
        warn: 'bg-warning-soft text-warning',
        danger: 'bg-destructive-soft text-destructive',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
