import { cn } from '@/lib/utils';

export function CardSkeletonGrid({
  count = 6,
  className,
  cardClassName,
}: {
  count?: number;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-40 animate-pulse rounded-2xl border border-border/50 bg-card/50',
            cardClassName,
          )}
        />
      ))}
    </div>
  );
}
