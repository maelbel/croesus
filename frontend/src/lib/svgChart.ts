export interface LinePoint {
  x: number
  y: number
  value: number
}

export interface LineChart {
  line: string
  area: string
  points: LinePoint[]
}

/** Shared by TrendChartWidget (full chart) and StatTileWidget (sparkline) — same x/y scaling math,
 * previously copy-pasted independently in both. `includeZeroBaseline` mirrors the difference
 * between the two: the trend chart always shows 0 in view (a net-worth chart shouldn't visually
 * exaggerate a small dip), while a sparkline is a pure shape and should use its own value range.
 * `padX` insets the first/last point from the SVG's horizontal edges — needed by any caller whose
 * line can render past its own endpoint (a round stroke-linecap, or a hover dot), since an SVG
 * clips its own content to the viewBox by default and a point sitting exactly on x=0 or x=width
 * would have that overflow cut off. */
export function buildLineChart(
  values: number[],
  { width, top, base, includeZeroBaseline = true, padX = 0 }: { width: number; top: number; base: number; includeZeroBaseline?: boolean; padX?: number },
): LineChart | null {
  const n = values.length
  if (n < 2) return null

  const max = includeZeroBaseline ? Math.max(...values, 1) : Math.max(...values)
  const min = includeZeroBaseline ? Math.min(...values, 0) : Math.min(...values)
  const span = Math.max(max - min, includeZeroBaseline ? 1 : 1e-9)

  const drawWidth = width - 2 * padX
  const x = (i: number) => padX + (i * drawWidth) / (n - 1)
  const y = (v: number) => base - ((v - min) / span) * (base - top)

  const points = values.map((v, i) => ({ x: x(i), y: y(v), value: v }))
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${padX},${base} ${line} ${width - padX},${base}`
  return { line, area, points }
}

export interface DonutSegment {
  dash: number
  gap: number
  offset: number
}

/** The stroke-dasharray/dashoffset accumulation shared by every donut-style ring — pure geometry,
 * kept separate from color/label so callers can apply their own palette. */
export function donutSegments(pcts: number[], radius: number): DonutSegment[] {
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return pcts.map((pct) => {
    const dash = pct * circumference
    const segment = { dash, gap: circumference - dash, offset: -offset }
    offset += dash
    return segment
  })
}
