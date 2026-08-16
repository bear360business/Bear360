import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCompactInr } from '@/lib/currency'
import type { DonutSlice, SeriesPoint } from '@/lib/types'
import { cn } from '@/lib/utils'

// Series order per doc §7.4: 1st brand (theme-aware), 2nd #B2D1FA; grid #E5EAEE.
const seriesConfig = {
  value: { label: 'This period', color: 'hsl(var(--brand))' },
  secondary: { label: 'Previous', color: '#B2D1FA' },
} satisfies ChartConfig

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
} as const

export function AreaSeriesChart({
  data,
  showSecondary = false,
  currency = false,
  className,
}: {
  data: SeriesPoint[]
  /** Previous-period ghost line (doc §6.13). */
  showSecondary?: boolean
  /** Format Y-axis ticks as compact INR ("₹45k"). */
  currency?: boolean
  className?: string
}) {
  return (
    <ChartContainer config={seriesConfig} className={cn('aspect-auto h-full w-full', className)}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--line))" />
        <XAxis dataKey="label" tickMargin={8} {...axisProps} />
        <YAxis
          width={currency ? 52 : 44}
          tickFormatter={currency ? formatCompactInr : undefined}
          {...axisProps}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {showSecondary && (
          <Area
            dataKey="secondary"
            type="monotone"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="transparent"
            dot={false}
          />
        )}
        <Area
          dataKey="value"
          type="monotone"
          stroke="hsl(var(--brand-hover))"
          strokeWidth={2.5}
          fill="var(--color-value)"
          fillOpacity={0.25}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function BarSeriesChart({
  data,
  currency = false,
  className,
}: {
  data: SeriesPoint[]
  /** Format Y-axis ticks as compact INR ("₹45k"). */
  currency?: boolean
  className?: string
}) {
  return (
    <ChartContainer config={seriesConfig} className={cn('aspect-auto h-full w-full', className)}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--line))" />
        <XAxis dataKey="label" tickMargin={8} {...axisProps} />
        <YAxis
          width={currency ? 52 : 44}
          tickFormatter={currency ? formatCompactInr : undefined}
          {...axisProps}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  )
}

// Donut segments per doc §6.2: yellow, blue/100, dark/800, gray/100 (+ neutral).
const donutColors = [
  'hsl(var(--brand))',
  '#B2D1FA',
  'hsl(var(--ink-800))',
  'hsl(var(--line))',
  'hsl(var(--muted-foreground))',
]

export function DonutChart({ data, className }: { data: DonutSlice[]; className?: string }) {
  const total = data.reduce((sum, s) => sum + s.value, 0)
  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-4 sm:flex-row', className)}>
      <ChartContainer config={{}} className="aspect-square h-full max-h-[200px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="95%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((slice, i) => (
              <Cell key={slice.name} fill={donutColors[i % donutColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="space-y-2">
        {data.map((slice, i) => (
          <li key={slice.name} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full border border-line"
              style={{ backgroundColor: donutColors[i % donutColors.length] }}
            />
            <span className="text-foreground">{slice.name}</span>
            <span className="text-muted-foreground">
              {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
