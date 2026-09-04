import { cn } from "@/lib/utils";
import { TrendValue } from "@/components/ui/trend-value";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeLabel = "за мес.",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-[15px] bg-[var(--color-fog-gray)] px-5 py-4",
        className
      )}
    >
      <p className="text-[26px] font-normal leading-[1.1] tracking-[-0.015em] text-[var(--color-carbon-black)] md:text-[30px] md:leading-[1.2]">
        {value}
      </p>
      <p className="mt-1 text-[13px] tracking-[-0.005em] text-[var(--color-zinc-gray)]">{label}</p>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <TrendValue change={change} className="text-xs" />
          <span className="text-xs text-[#71717a]">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}

export { TrendValue as TrendIndicatorInline };
