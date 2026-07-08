import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

export const chartMargins = {
  bar: { top: 18, right: 12, left: 0, bottom: 4 },
  barVertical: { top: 8, left: 4, right: 16, bottom: 8 },
} as const

export const chartTick = {
  fontSize: 11,
  fill: 'var(--muted-foreground)',
}

export const chartYAxisWidth = 36

export const chartTooltipStyle = {
  contentStyle: {
    borderRadius: '0.75rem',
    border: '1px solid var(--border)',
    background: 'var(--popover)',
    color: 'var(--popover-foreground)',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
  },
  labelStyle: {
    color: 'var(--foreground)',
    fontWeight: 600,
    marginBottom: 4,
  },
  itemStyle: {
    color: 'var(--popover-foreground)',
    fontSize: '12px',
  },
} as const

export const chartLabelListStyle = {
  fontSize: 11,
  fontWeight: 600,
  fill: 'var(--foreground)',
}

export function formatChartMonth(month: string, locale: string): string {
  const [year, monthNum] = month.split('-')
  if (!year || !monthNum) return month
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CM' : 'en-CM', {
    month: 'short',
  }).format(new Date(Number(year), Number(monthNum) - 1))
}

export function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-md">
      {label != null && label !== '' && (
        <p className="mb-1 text-xs font-semibold text-foreground">{String(label)}</p>
      )}
      {payload.map((entry) => (
        <p key={String(entry.name ?? entry.dataKey)} className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{entry.value}</span>
          {entry.name ? ` · ${entry.name}` : ''}
        </p>
      ))}
    </div>
  )
}

export function pieLegendFormatter(value: string, entry: { payload?: { value?: number } }) {
  const count = entry.payload?.value
  return count != null ? `${value} (${count})` : value
}

interface PieSliceLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  value?: number
}

export function renderPieSliceValue({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  value = 0,
}: PieSliceLabelProps) {
  if (!value) return null

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const angle = (-midAngle * Math.PI) / 180
  const x = cx + radius * Math.cos(angle)
  const y = cy + radius * Math.sin(angle)

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {value}
    </text>
  )
}
