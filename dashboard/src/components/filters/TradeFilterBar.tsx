import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ALL_FILTER, countActiveTradeFilters, type TradeFilters, type TradeFilterOptions, type TradeSelectFilterKey } from '../../lib/tradeFilters.ts';
import { cn } from '../../lib/utils.ts';

interface FilterOption {
    value: string;
    label: string;
}

interface FilterConfig {
    allLabel: string;
    getOptions: (options: TradeFilterOptions) => FilterOption[];
}

interface TradeFilterBarProps {
    filters: TradeFilters;
    options: TradeFilterOptions;
    fields: TradeSelectFilterKey[];
    onChange: (patch: Partial<TradeFilters>) => void;
    onReset: () => void;
    showSearch?: boolean;
    showDateRange?: boolean;
    searchPlaceholder?: string;
    resultCount?: number;
    totalCount?: number;
    title?: string;
    className?: string;
    compact?: boolean;
}

const selectClass = 'h-12 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-[12px] font-semibold text-foreground outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';
const inputClass = 'h-12 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-[12px] font-semibold text-foreground outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';
const dateInputClass = 'h-12 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 pt-3 text-[12px] font-semibold text-foreground outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';
const compactSelectClass = 'h-10 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-[11px] font-semibold text-foreground outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';
const compactInputClass = 'h-10 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-[11px] font-semibold text-foreground outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';
const compactDateInputClass = 'h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 pt-3 text-[11px] font-semibold text-foreground outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';

function mapDynamic(values: string[]) {
    return values.map((value) => ({ value, label: value }));
}

const FIELD_CONFIG: Record<TradeSelectFilterKey, FilterConfig> = {
    account: { allLabel: 'Tất cả tài khoản', getOptions: (options) => mapDynamic(options.accounts) },
    assetType: { allLabel: 'Tất cả tài sản', getOptions: (options) => mapDynamic(options.assetTypes) },
    symbol: { allLabel: 'Tất cả mã', getOptions: (options) => mapDynamic(options.symbols) },
    position: { allLabel: 'Tất cả vị thế', getOptions: (options) => mapDynamic(options.positions) },
    orderType: { allLabel: 'Tất cả loại lệnh', getOptions: (options) => mapDynamic(options.orderTypes) },
    strategy: { allLabel: 'Tất cả chiến lược', getOptions: (options) => mapDynamic(options.strategies) },
    status: { allLabel: 'Tất cả trạng thái', getOptions: (options) => mapDynamic(options.statuses) },
    sector: { allLabel: 'Tất cả nhóm ngành', getOptions: (options) => mapDynamic(options.sectors) },
    mood: { allLabel: 'Tất cả tâm lý', getOptions: (options) => mapDynamic(options.moods) },
    pnlBucket: {
        allLabel: 'Tất cả PnL',
        getOptions: () => [
            { value: 'profit', label: 'Lệnh có lãi' },
            { value: 'loss', label: 'Lệnh lỗ' },
            { value: 'flat', label: 'Hòa vốn' },
            { value: 'open', label: 'Đang mở' },
        ],
    },
};

export function TradeFilterBar({
    filters,
    options,
    fields,
    onChange,
    onReset,
    showSearch,
    showDateRange,
    searchPlaceholder = 'Tìm mã, chiến lược, ghi chú...',
    resultCount,
    totalCount,
    title = 'Bộ lọc dữ liệu',
    className,
    compact,
}: TradeFilterBarProps) {
    const activeCount = countActiveTradeFilters(filters);
    const controlClass = compact ? compactSelectClass : selectClass;
    const textInputClass = compact ? compactInputClass : inputClass;
    const dateClass = compact ? compactDateInputClass : dateInputClass;

    return (
        <div className={cn('rounded-2xl border border-[var(--card-border)] bg-[var(--surface-soft)] shadow-sm', compact ? 'p-2.5' : 'p-3', className)}>
            <div className={cn('mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', compact && 'mb-2')}>
                <div className="flex items-center gap-2">
                    <div className={cn('rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]', compact ? 'p-1.5' : 'p-2')}>
                        <SlidersHorizontal size={14} />
                    </div>
                    <div>
                        <div className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-foreground">{title}</div>
                        <div className="type-caption text-[10px]">
                            {activeCount > 0 ? `${activeCount} điều kiện đang bật` : 'Đang xem toàn bộ dữ liệu'}
                            {typeof resultCount === 'number' && typeof totalCount === 'number' ? ` · ${resultCount}/${totalCount} lệnh` : ''}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onReset}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 text-[11px] font-bold text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-foreground"
                    title="Xóa bộ lọc"
                >
                    <X size={13} />
                    Xóa lọc
                </button>
            </div>

            <div className={cn('grid gap-2 md:grid-cols-2', compact ? 'xl:grid-cols-5' : 'xl:grid-cols-12')}>
                {showSearch && (
                    <div className={cn('relative', compact ? 'xl:col-span-2' : 'xl:col-span-6')}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={14} />
                        <input
                            type="text"
                            value={filters.search || ''}
                            onChange={(event) => onChange({ search: event.target.value })}
                            placeholder={searchPlaceholder}
                            className={cn(textInputClass, 'w-full pl-9')}
                        />
                    </div>
                )}

                {fields.map((field) => {
                    const config = FIELD_CONFIG[field];
                    return (
                        <select
                            key={field}
                            value={String(filters[field] || ALL_FILTER)}
                            onChange={(event) => onChange({ [field]: event.target.value } as Partial<TradeFilters>)}
                            className={cn(controlClass, compact ? 'xl:col-span-1' : 'xl:col-span-3')}
                        >
                            <option value={ALL_FILTER}>{config.allLabel}</option>
                            {config.getOptions(options).map((option) => (
                                <option key={`${field}-${option.value}`} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    );
                })}

                {showDateRange && (
                    <>
                        <label className={cn('relative block', compact ? 'xl:col-span-1' : 'xl:col-span-3')}>
                            <span className="pointer-events-none absolute left-3 top-1 z-10 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Từ ngày</span>
                            <input type="date" value={filters.fromDate || ''} onChange={(event) => onChange({ fromDate: event.target.value })} className={dateClass} />
                        </label>
                        <label className={cn('relative block', compact ? 'xl:col-span-1' : 'xl:col-span-3')}>
                            <span className="pointer-events-none absolute left-3 top-1 z-10 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Đến ngày</span>
                            <input type="date" value={filters.toDate || ''} onChange={(event) => onChange({ toDate: event.target.value })} className={dateClass} />
                        </label>
                    </>
                )}
            </div>
        </div>
    );
}
