'use client';

import { HelpCircle, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type TrustLevel = 'verified' | 'community' | 'unreviewed';

type TrustBadgeProps = {
  level: TrustLevel;
  className?: string;
};

const config: Record<TrustLevel, { label: string; icon: typeof ShieldCheck; colorClasses: string }> = {
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    colorClasses: 'bg-emerald-500/15 text-emerald-400',
  },
  community: {
    label: 'Community',
    icon: Users,
    colorClasses: 'bg-blue-500/15 text-blue-400',
  },
  unreviewed: {
    label: 'Unreviewed',
    icon: HelpCircle,
    colorClasses: 'bg-muted text-muted-foreground',
  },
};

export function TrustBadge({ level, className }: TrustBadgeProps) {
  const { label, icon: Icon, colorClasses } = config[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-3xs font-medium',
        colorClasses,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
