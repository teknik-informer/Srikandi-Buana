"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AudienceChartPoint = { label: string; value: number };
export type AudienceTrendPoint = { label: string; records: number };
export type CashFlowPoint = { label: string; income: number; expense: number };

const numberLabel = (value: unknown) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(value || 0));

function ChartFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 text-center">
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  );
}

export function AudienceBarChart({
  title,
  description,
  data,
  emptyMessage = "Belum ada data yang memenuhi syarat untuk ditampilkan.",
  suffix = "",
}: {
  title: string;
  description: string;
  data: AudienceChartPoint[];
  emptyMessage?: string;
  suffix?: string;
}) {
  const visible = data.filter((item) => Number.isFinite(item.value) && item.value >= 0);
  return (
    <ChartFrame title={title} description={description}>
      {visible.length ? (
        <div className="h-64 min-h-64 w-full" role="img" aria-label={title + ". " + description}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visible} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={0} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.45 }}
                formatter={(value) => [numberLabel(value) + suffix, "Jumlah"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
              />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[7, 7, 2, 2]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart message={emptyMessage} />}
    </ChartFrame>
  );
}

export function AudienceTrendChart({
  title,
  description,
  data,
  emptyMessage = "Belum ada catatan pada periode yang dipilih.",
}: {
  title: string;
  description: string;
  data: AudienceTrendPoint[];
  emptyMessage?: string;
}) {
  const hasRecords = data.some((item) => item.records > 0);
  return (
    <ChartFrame title={title} description={description}>
      {hasRecords ? (
        <div className="h-64 min-h-64 w-full" role="img" aria-label={title + ". " + description}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
              <defs>
                <linearGradient id="audienceRecordsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [numberLabel(value), "Catatan"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
              />
              <Area type="monotone" dataKey="records" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#audienceRecordsGradient)" activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart message={emptyMessage} />}
    </ChartFrame>
  );
}

export function CashFlowTrendChart({
  data,
  emptyMessage = "Belum ada transaksi kas yang dapat dianalisis pada periode ini.",
}: {
  data: CashFlowPoint[];
  emptyMessage?: string;
}) {
  const hasValues = data.some((item) => item.income > 0 || item.expense > 0);
  return (
    <ChartFrame title="Arus kas bulanan" description="Pemasukan dan pengeluaran berdasarkan tanggal transaksi pada Buku Kas.">
      {hasValues ? (
        <div className="h-64 min-h-64 w-full" role="img" aria-label="Grafik arus kas bulanan">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 2, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} />
              <Tooltip
                formatter={(value) => ["Rp" + numberLabel(value), ""]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="income" name="Pemasukan" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart message={emptyMessage} />}
    </ChartFrame>
  );
}
