import { ReactNode } from 'react';
import { cn } from '../../lib/utils.ts';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  extra?: ReactNode;
  onClick?: () => void;
  titleTooltip?: string;
}

export function Card({ children, className, title, subtitle, extra, onClick, titleTooltip }: CardProps) {
  return (
    <motion.div
      whileHover={onClick ? { y: -2, transition: { duration: 0.18 } } : {}}
      onClick={onClick}
      className={cn('premium-card p-[var(--card-pad)]', onClick && 'cursor-pointer', className)}
    >
      {(title || extra) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h3 className="type-title truncate" title={titleTooltip || title}>{title}</h3>}
            {subtitle && <p className="mt-1 type-caption leading-5">{subtitle}</p>}
          </div>
          {extra && <div className="shrink-0">{extra}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  delta?: string | number;
  deltaType?: 'positive' | 'negative' | 'neutral';
  isLoading?: boolean;
  description?: string;
  onClick?: () => void;
}

export function KpiCard({ title, value, icon: Icon, delta, deltaType = 'neutral', isLoading, description, onClick }: KpiCardProps) {
  return (
    <Card className="group relative flex h-full min-h-[164px] flex-col overflow-hidden" title={undefined} onClick={onClick}>
      <div className="absolute right-5 top-5 text-[var(--watermark-icon)] transition-colors group-hover:text-[color-mix(in_srgb,var(--watermark-icon)_70%,var(--accent))]">
        <Icon size={46} strokeWidth={1.15} />
      </div>
      <div className="relative flex flex-1 flex-col">
        <div className="relative flex min-h-[68px] flex-1 flex-col justify-between gap-3 pr-10">
          <p className="type-title">{title}</p>
          {isLoading ? (
            <div className="mt-1 h-8 w-24 animate-pulse rounded-lg bg-[var(--surface-strong)]" />
          ) : (
            <div className="type-display text-foreground">{value}</div>
          )}
        </div>
        <div className="relative mt-3 flex min-h-[33px] items-center border-t border-[var(--card-border)] pt-3">
          {delta && !isLoading ? (
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em]',
                deltaType === 'positive'
                  ? 'border-[var(--win)]/20 bg-[var(--win)]/10 text-[var(--win)]'
                  : deltaType === 'negative'
                    ? 'border-[var(--loss)]/20 bg-[var(--loss)]/10 text-[var(--loss)]'
                    : 'border-[var(--card-border)] bg-[var(--surface-soft)] text-[var(--muted)]',
              )}
            >
              {delta}
            </span>
          ) : (
            <span className="invisible rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em]">
              placeholder
            </span>
          )}
        </div>
      </div>
      {description && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 translate-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)]/95 p-3 text-[12px] font-semibold leading-5 text-[var(--muted)] opacity-0 shadow-xl backdrop-blur transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {description}
        </div>
      )}
    </Card>
  );
}
