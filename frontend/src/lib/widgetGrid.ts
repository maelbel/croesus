import type { LegacyWidgetType } from '../api/types'

/** Per-type resize bounds (grid cells) — a widget's content dictates how small/large it can
 * reasonably go (e.g. a table needs more room than a bar), not a one-size-fits-all range.
 * Legacy widgets only: catalog widgets (statTile, trendChart, ...) free-drag resize too, but
 * within their catalog entry's `sizes` preset list (see nearestPresetSize below) rather than this
 * continuous range — see widgetCatalog.ts. GridStack (see WidgetGrid.vue) enforces these natively
 * during drag/resize — this is config, not something applied by hand anymore. */
export const WIDGET_SIZE_BOUNDS: Record<LegacyWidgetType, { minW: number; maxW: number; minH: number; maxH: number }> = {
  netWorthRings: { minW: 6, maxW: 12, minH: 3, maxH: 6 },
  composition: { minW: 6, maxW: 12, minH: 2, maxH: 5 },
  assetsByClass: { minW: 6, maxW: 12, minH: 2, maxH: 5 },
  liabilitiesVsAssets: { minW: 4, maxW: 12, minH: 1, maxH: 3 },
  recentValuations: { minW: 6, maxW: 12, minH: 2, maxH: 6 },
}

/** Snaps a catalog widget's just-finished free-drag resize to whichever preset in its `sizes`
 * list is closest, since GridStack itself only knows a continuous min/max range (see
 * WidgetGrid.vue's itemOptions), not a discrete preset list. Presets wider than the columns left
 * from the widget's `x` are excluded first, unless that would leave nothing to snap to.
 *
 * `current` (the preset the widget was on before this drag) is excluded from the candidates
 * whenever the raw size actually moved away from it — otherwise a preset list with uneven
 * per-axis steps gets stuck. E.g. statTile's [[4,1],[6,1],[6,2]]: dragging only the width in from
 * [6,2] leaves the raw height pinned at 2 the whole time, so [6,2] stays nearest by raw distance
 * (it differs by width alone) right up to the edge of the grid — the resize visibly happens but
 * always snaps back on release. Once *any* drag has moved the raw size off the current preset,
 * the user is clearly not aiming to stay put, so the current preset shouldn't still win. */
export function nearestPresetSize(
  sizes: [number, number][],
  rawW: number,
  rawH: number,
  maxW: number,
  current?: { w: number; h: number },
): { w: number; h: number } {
  const fitting = sizes.filter(([w]) => w <= maxW)
  let candidates = fitting.length > 0 ? fitting : sizes
  if (current && (rawW !== current.w || rawH !== current.h)) {
    const withoutCurrent = candidates.filter(([w, h]) => w !== current.w || h !== current.h)
    if (withoutCurrent.length > 0) candidates = withoutCurrent
  }
  let best = candidates[0]
  let bestDist = Infinity
  for (const size of candidates) {
    const dist = (size[0] - rawW) ** 2 + (size[1] - rawH) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = size
    }
  }
  return { w: best[0], h: best[1] }
}
