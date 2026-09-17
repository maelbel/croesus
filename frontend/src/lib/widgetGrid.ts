import type { LegacyWidgetType, Widget } from '../api/types'

export const GRID_COLS = 12

/** Per-type resize bounds (grid cells) — a widget's content dictates how small/large it can
 * reasonably go (e.g. a table needs more room than a bar), not a one-size-fits-all range.
 * Legacy widgets only: catalog widgets (statTile, trendChart, ...) resize by cycling their
 * catalog entry's `sizes` preset list instead of free continuous dragging — see widgetCatalog.ts. */
export const WIDGET_SIZE_BOUNDS: Record<LegacyWidgetType, { minW: number; maxW: number; minH: number; maxH: number }> = {
  netWorthRings: { minW: 6, maxW: 12, minH: 3, maxH: 6 },
  composition: { minW: 6, maxW: 12, minH: 2, maxH: 5 },
  assetsByClass: { minW: 6, maxW: 12, minH: 2, maxH: 5 },
  liabilitiesVsAssets: { minW: 4, maxW: 12, minH: 1, maxH: 3 },
  recentValuations: { minW: 6, maxW: 12, minH: 2, maxH: 6 },
}

/** Absolute floor below any per-type bound — mirrors the design's own minimum. */
const GLOBAL_MIN_W = 3
const GLOBAL_MIN_H = 1

export function clampSize(type: LegacyWidgetType, w: number, h: number): { w: number; h: number } {
  const bounds = WIDGET_SIZE_BOUNDS[type]
  return {
    w: Math.min(bounds.maxW, Math.max(bounds.minW, GLOBAL_MIN_W, w)),
    h: Math.min(bounds.maxH, Math.max(bounds.minH, GLOBAL_MIN_H, h)),
  }
}

/** Advances to the next size in a catalog widget's preset list (wrapping), or the first preset
 * if the widget's current size doesn't exactly match one (e.g. it was never resized yet). */
export function nextPresetSize(sizes: [number, number][], current: { w: number; h: number }): { w: number; h: number } {
  const index = sizes.findIndex(([w, h]) => w === current.w && h === current.h)
  const [w, h] = sizes[(index + 1) % sizes.length]
  return { w, h }
}

type Rect = { x: number; y: number; w: number; h: number }

export function hit(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Packs widgets so none overlap: sinks a widget down past collisions, then floats it back up
 * as far as it can go. `priorityId`'s widget is placed first so it keeps the cell the user just
 * dropped it on — everyone else flows around it, sorted top-to-bottom/left-to-right otherwise. */
export function settle(list: Widget[], priorityId?: string): Widget[] {
  const queue = list
    .map((w) => ({ ...w }))
    .sort(
      (a, b) =>
        (a.id === priorityId ? -1 : b.id === priorityId ? 1 : 0) || a.y - b.y || a.x - b.x,
    )
  const placed: Widget[] = []
  queue.forEach((w) => {
    let guard = 0
    while (placed.some((p) => hit(p, w)) && guard++ < 200) w.y += 1
    while (w.y > 0 && !placed.some((p) => hit(p, { ...w, y: w.y - 1 }))) w.y -= 1
    placed.push(w)
  })
  return placed
}

/** First free top-left-most cell that fits a new w×h widget. */
export function findSpot(list: Widget[], w: number, h: number): { x: number; y: number } {
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      const candidate = { x, y, w, h }
      if (!list.some((p) => hit(p, candidate))) return { x, y }
    }
  }
  return { x: 0, y: 40 }
}
