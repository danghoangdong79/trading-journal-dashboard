import { ReactNode } from 'react';
import { cn } from '../../lib/utils.ts';
import { motion } from 'motion/react';

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
      whileHover={onClick ? { y: -2, transition: { duration: 0.2 } } : {}}
      onClick={onClick}
      className={cn(
        "premium-card p-6",
        onClick && "cursor-pointer hover:border-foreground/20",
        className
      )}
    >
      {(title || extra) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && <h3 className="font-bold text-foreground text-sm uppercase tracking-widest">{title}</h3>}
            {subtitle && <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tight">{subtitle}</p>}
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
  icon: any;
  delta?: string | number;
  deltaType?: 'positive' | 'negative' | 'neutral';
  isLoading?: boolean;
}

export function KpiCard({ title, value, icon: Icon, delta, deltaType = 'neutral', isLoading }: KpiCardProps) {
  return (
    <Card className="hover:border-foreground/30 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 text-foreground opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
        <Icon size={48} strokeWidth={1} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{title}</p>
        {isLoading ? (
          <div className="h-8 w-24 bg-foreground/5 animate-pulse rounded mt-2" />
        ) : (
          <div className="text-2xl font-black tracking-tighter font-mono text-foreground">{value}</div>
        )}
      </div>
      {delta && !isLoading && (
        <div className="mt-4 flex items-center gap-1.5 pt-1">
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
            deltaType === 'positive' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
            deltaType === 'negative' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
            "bg-gray-500/10 text-gray-500 border-gray-500/20"
          )}>
            {delta}
          </span>
        </div>
      )}
    </Card>
  );
}
