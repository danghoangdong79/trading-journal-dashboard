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
}

export function Card({ children, className, title, subtitle, extra, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={onClick ? { y: -1, transition: { duration: 0.15 } } : {}}
      onClick={onClick}
      className={cn(
        "premium-card",
        onClick && "cursor-pointer",
        className
      )}
      style={{ padding: 'var(--card-pad, 20px)' }}
    >
      {(title || extra) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="type-title">{title}</h3>}
            {subtitle && <p className="type-caption mt-0.5">{subtitle}</p>}
          </div>
          {extra && <div>{extra}</div>}
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
}

export function KpiCard({ title, value, icon: Icon, delta, deltaType = 'neutral', isLoading }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute -top-1 -right-1 p-3 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity">
        <Icon size={40} strokeWidth={1.2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="type-title">{title}</p>
        {isLoading ? (
          <div className="h-7 w-20 bg-foreground/5 animate-pulse rounded mt-1" />
        ) : (
          <div className="type-display text-foreground">{value}</div>
        )}
      </div>
      {delta && !isLoading && (
        <div className="mt-3 pt-2 border-t border-[var(--card-border)]">
          <span className={cn(
            "type-caption text-[10px] font-semibold",
            deltaType === 'positive' ? "text-[var(--win)]" :
            deltaType === 'negative' ? "text-[var(--loss)]" :
            "text-[var(--muted)]"
          )}>
            {delta}
          </span>
        </div>
      )}
    </Card>
  );
}
