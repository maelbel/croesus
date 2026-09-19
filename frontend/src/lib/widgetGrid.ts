import type { LegacyWidgetType } from '../api/types'

/** Per-type resize bounds (grid cells) — a widget's content dictates how small/large it can
 * reasonably go (e.g. a table needs more room than a bar), not a one-size-fits-all range.
 * Legacy widgets only — catalog widgets (statTile, trendChart, ...) declare their own bounds
 * directly on their WIDGET_CATALOG entry instead, since they have no shared `LegacyWidgetType`
 * key to index this map by. GridStack (see WidgetGrid.vue) enforces these natively during
 * drag/resize — this is config, not something applied by hand. */
export const WIDGET_SIZE_BOUNDS: Record<LegacyWidgetType, { minW: number; maxW: number; minH: number; maxH: number }> = {
  netWorthRings: { minW: 6, maxW: 12, minH: 3, maxH: 6 },
  composition: { minW: 6, maxW: 12, minH: 2, maxH: 5 },
  assetsByClass: { minW: 6, maxW: 12, minH: 4, maxH: 5 },
  liabilitiesVsAssets: { minW: 4, maxW: 12, minH: 2, maxH: 3 },
  recentValuations: { minW: 6, maxW: 12, minH: 2, maxH: 6 },
}
