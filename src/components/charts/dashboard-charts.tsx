"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/commission";

const CORAL = "#fc5f2b";
const CARBON = "#18181b";
const ZINC = "#71717a";
const MIST = "#e4e4e7";

const axisStyle = { fill: ZINC, fontSize: 12 };
const gridStyle = { stroke: MIST, strokeDasharray: "3 3" };
const tooltipStyle = {
  background: "#fff",
  border: `1px solid ${MIST}`,
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "rgba(0, 0, 0, 0.05) 0px 2px 2px 0px",
};

interface ChartProps {
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  height?: number;
  emptyLabel?: string;
  valueFormat?: "number" | "currency";
}

function chartHasValues(data: Record<string, string | number>[], dataKey: string) {
  return data.some((row) => Number(row[dataKey] ?? 0) > 0);
}

function ChartEmpty({ height, label }: { height: number; label: string }) {
  return (
    <div
      className="flex items-center justify-center px-2 text-center text-sm text-[var(--color-zinc-gray)]"
      style={{ height }}
    >
      {label}
    </div>
  );
}

function formatTooltipValue(value: unknown, format: "number" | "currency") {
  const n = Number(value ?? 0);
  if (format === "currency") return formatCurrency(n);
  return n.toLocaleString("en-US");
}

export function LeadsChart({
  data,
  dataKey,
  xKey,
  height = 240,
  emptyLabel = "No client data yet",
  valueFormat = "number",
}: ChartProps) {
  if (!chartHasValues(data, dataKey)) {
    return <ChartEmpty height={height} label={emptyLabel} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridStyle} vertical={false} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={axisStyle} dy={6} />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={axisStyle}
          width={36}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatTooltipValue(value, valueFormat), "Clients"]}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={CORAL}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CORAL, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: CORAL }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SalesChart({
  data,
  dataKey,
  xKey,
  height = 240,
  emptyLabel = "No data yet",
  valueFormat = "number",
}: ChartProps) {
  if (!chartHasValues(data, dataKey)) {
    return <ChartEmpty height={height} label={emptyLabel} />;
  }

  const isCurrency = valueFormat === "currency" || dataKey === "amount";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridStyle} vertical={false} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={axisStyle} dy={6} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={axisStyle}
          width={isCurrency ? 56 : 36}
          tickFormatter={(v) =>
            isCurrency ? `${Math.round(Number(v) / 1000)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [
            formatTooltipValue(value, isCurrency ? "currency" : "number"),
            isCurrency ? "Amount" : "Count",
          ]}
        />
        <Bar dataKey={dataKey} fill={CORAL} radius={[8, 8, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConversionChart({
  data,
  height = 240,
  emptyLabel = "Funnel will appear after the first clients",
}: {
  data: { stage: string; count: number }[];
  height?: number;
  emptyLabel?: string;
}) {
  if (!data.some((row) => row.count > 0)) {
    return <ChartEmpty height={height} label={emptyLabel} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid {...gridStyle} horizontal={false} />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={axisStyle} />
        <YAxis
          type="category"
          dataKey="stage"
          axisLine={false}
          tickLine={false}
          tick={axisStyle}
          width={96}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [Number(value ?? 0).toLocaleString("en-US"), "Stage"]}
        />
        <Bar dataKey="count" fill={CARBON} radius={[0, 8, 8, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopPartnersChart({
  data,
  height = 240,
  emptyLabel = "Not enough data for ranking",
  valueLabel = "Deals",
}: {
  data: { name: string; deals: number }[];
  height?: number;
  emptyLabel?: string;
  valueLabel?: string;
}) {
  if (!data.some((row) => row.deals > 0)) {
    return <ChartEmpty height={height} label={emptyLabel} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridStyle} vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={axisStyle}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={48}
        />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisStyle} width={36} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [Number(value ?? 0).toLocaleString("en-US"), valueLabel]}
        />
        <Bar dataKey="deals" fill={CORAL} radius={[8, 8, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 overflow-hidden">
      <div className="mb-3">
        <h3 className="text-[15px] font-bold tracking-[-0.009em] text-[var(--color-carbon-black)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-[13px] text-[var(--color-zinc-gray)]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
