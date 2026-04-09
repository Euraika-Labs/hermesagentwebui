import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

function frameClass(layout: 'card' | 'banner') {
  return layout === 'banner'
    ? 'rounded-xl border border-border/60 bg-card/50 p-4 shadow-[var(--shadow-card)]'
    : 'rounded-2xl border border-border/60 bg-card/55 p-6 shadow-[var(--shadow-card)]';
}

export function LoadingState({
  title,
  message,
  description,
  layout = 'card',
  className,
  children,
}: {
  title?: string;
  message?: string;
  description?: ReactNode;
  layout?: 'card' | 'banner';
  className?: string;
  children?: ReactNode;
}) {
  const resolvedTitle = title ?? message ?? 'Loading…';
  return (
    <div className={cn(frameClass(layout), className)}>
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{resolvedTitle}</p>
          {description ? <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div> : null}
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  action,
  layout = 'card',
  className,
}: {
  title: string;
  description: ReactNode;
  icon?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  action?: ReactNode;
  layout?: 'card' | 'banner';
  className?: string;
}) {
  const resolvedPrimaryAction = primaryAction ?? action;
  return (
    <div className={cn(frameClass(layout), 'border-dashed', className)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-primary">{icon ?? <Inbox className="h-4 w-4" />}</div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div>
          {resolvedPrimaryAction || secondaryAction ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {resolvedPrimaryAction}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DegradedState({
  title,
  description,
  severity = 'warning',
  icon,
  details,
  primaryAction,
  secondaryAction,
  layout = 'card',
  className,
}: {
  title: string;
  description: ReactNode;
  severity?: 'warning' | 'danger';
  icon?: ReactNode;
  details?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  layout?: 'card' | 'banner';
  className?: string;
}) {
  const toneClass = severity === 'danger'
    ? 'border-danger/35 bg-danger/10'
    : 'border-warning/35 bg-warning/10';
  const toneIconClass = severity === 'danger' ? 'text-danger' : 'text-warning';

  return (
    <div className={cn(frameClass(layout), toneClass, className)}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', toneIconClass)}>{icon ?? <TriangleAlert className="h-4 w-4" />}</div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div>
          {details ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{details}</div> : null}
          {primaryAction || secondaryAction ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryAction}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  message,
  description,
  primaryAction,
  secondaryAction,
  layout = 'card',
  className,
}: {
  title?: string;
  error?: unknown;
  message?: string;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  layout?: 'card' | 'banner';
  className?: string;
}) {
  const resolvedMessage = message ?? error;
  const detail = typeof resolvedMessage === 'string'
    ? resolvedMessage
    : resolvedMessage instanceof Error
      ? resolvedMessage.message
      : null;

  return (
    <div className={cn(frameClass(layout), 'border-danger/35 bg-danger/10', className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-danger" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          {description ? <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div> : null}
          {detail ? <p className="mt-1 text-sm leading-6 text-foreground">{detail}</p> : null}
          {primaryAction || secondaryAction ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryAction}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
