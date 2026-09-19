import type { Component } from 'vue'
import { i18n } from '../i18n'
import type { Widget, WidgetType } from '../api/types'
import NetWorthRings from '../components/NetWorthRings.vue'
import CompositionChart from '../components/CompositionChart.vue'
import AssetsByClassWidget from '../components/widgets/AssetsByClassWidget.vue'
import LiabilitiesVsAssetsWidget from '../components/widgets/LiabilitiesVsAssetsWidget.vue'
import RecentValuationsWidget from '../components/widgets/RecentValuationsWidget.vue'
import StatTileWidget from '../components/widgets/StatTileWidget.vue'
import TrendChartWidget from '../components/widgets/TrendChartWidget.vue'
import TrendChartPeriodTabs from '../components/widgets/TrendChartPeriodTabs.vue'
import BreakdownDonutWidget from '../components/widgets/BreakdownDonutWidget.vue'
import ListWidget from '../components/widgets/ListWidget.vue'
import PayoffStatusWidget from '../components/widgets/PayoffStatusWidget.vue'
import { WIDGET_SIZE_BOUNDS } from './widgetGrid'
import { breakdownSubtitle, listSubtitle, payoffSubtitle, resolveSourceLabel } from './widgetSources'

export interface WidgetCatalogEntry {
  component: Component
  /** Small label above the card title — a fixed string for legacy widgets, the catalog kind's
   * name (e.g. "Stat tile") for catalog ones. */
  kickerKey: string
  /** The card's own heading. Legacy widgets have one fixed heading; catalog widgets' heading is
   * whatever their bound source resolves to (e.g. "Net worth", or an account's own name). */
  title: (widget: Widget) => string
  /** Short label used in the legacy one-click "Add widget" menu — absent for catalog kinds,
   * which go through the source/size picker modal instead. */
  addLabelKey?: string
  /** Which header treatment WidgetHeader.vue renders (see that component):
   * - 'editorial': the 5 legacy widgets' fixed kicker + large heading pair (real authored copy,
   *   e.g. "Net worth by year" / "One ring per year on record" — a headline, not a data label).
   * - 'label': the other 4 catalog kinds' single small-caps line (the bound source's own name,
   *   e.g. "NET WORTH") plus an optional detail line — an identifier, not a headline.
   * - 'compact': statTile only. A 1-row-tall tile has no room for a header row above its body, so
   *   its resolved title is passed into the tile itself instead (see widgetProps in WidgetGrid.vue)
   *   rather than rendered via WidgetHeader. */
  variant: 'editorial' | 'label' | 'compact'
  /** The shared header's small muted line under the kicker (design's own `hasSub`/`sub`) — only
   * breakdownDonut/list/payoffStatus have one; a stat tile and a trend chart don't. */
  subtitle?: (widget: Widget) => string
  /** Extra content rendered in the header's right side, before the edit controls — only the
   * trend chart uses this, for its period tabs (the design puts them in the header row next to
   * the kicker, not inside the chart body). */
  headerExtra?: Component
  /** Every widget resizes by free continuous drag, clamped to this box — min === max on an axis
   * (e.g. every chart-like catalog kind's height) just means that axis doesn't resize at all. */
  minW: number
  maxW: number
  minH: number
  maxH: number
  /** Icon + one-line description shown for this kind in the "Add widget" picker's first step. */
  icon: string
  descKey: string
}

/** The add-widget wizard's step-2 size list for any widget type: a synthesized min/mid/max trio
 * from its free-drag bounds. This only picks the widget's starting size — every widget stays
 * freely resizable afterward within those same bounds. */
export function pickerSizes(type: WidgetType): [number, number][] {
  const { minW, maxW, minH, maxH } = WIDGET_CATALOG[type]
  const presets: [number, number][] = [
    [minW, minH],
    [Math.round((minW + maxW) / 2), Math.round((minH + maxH) / 2)],
    [maxW, maxH],
  ]
  return presets.filter((size, i) => presets.findIndex(([w, h]) => w === size[0] && h === size[1]) === i)
}

export const WIDGET_CATALOG: Record<WidgetType, WidgetCatalogEntry> = {
  netWorthRings: {
    component: NetWorthRings,
    kickerKey: 'dashboard.netWorthByYearKicker',
    title: () => i18n.global.t('dashboard.netWorthByYearHeading'),
    variant: 'editorial',
    addLabelKey: 'dashboardGrid.widgetNetWorthRings',
    icon: 'i-lucide-circle-dot',
    descKey: 'dashboardGrid.descNetWorthRings',
    ...WIDGET_SIZE_BOUNDS.netWorthRings,
  },
  composition: {
    component: CompositionChart,
    kickerKey: 'dashboard.compositionKicker',
    title: () => i18n.global.t('dashboard.compositionHeading'),
    variant: 'editorial',
    addLabelKey: 'dashboardGrid.widgetComposition',
    icon: 'i-lucide-chart-area',
    descKey: 'dashboardGrid.descComposition',
    ...WIDGET_SIZE_BOUNDS.composition,
  },
  assetsByClass: {
    component: AssetsByClassWidget,
    kickerKey: 'dashboard.byAssetClassKicker',
    title: () => i18n.global.t('dashboard.byAssetClassHeading'),
    variant: 'editorial',
    addLabelKey: 'dashboardGrid.widgetAssetsByClass',
    icon: 'i-lucide-layers',
    descKey: 'dashboardGrid.descAssetsByClass',
    ...WIDGET_SIZE_BOUNDS.assetsByClass,
  },
  liabilitiesVsAssets: {
    component: LiabilitiesVsAssetsWidget,
    kickerKey: 'dashboard.liabilitiesVsAssetsKicker',
    title: () => i18n.global.t('dashboard.liabilitiesVsAssetsHeading'),
    variant: 'editorial',
    addLabelKey: 'dashboardGrid.widgetLiabilitiesVsAssets',
    icon: 'i-lucide-scale',
    descKey: 'dashboardGrid.descLiabilitiesVsAssets',
    ...WIDGET_SIZE_BOUNDS.liabilitiesVsAssets,
  },
  recentValuations: {
    component: RecentValuationsWidget,
    kickerKey: 'dashboard.recentValuationsKicker',
    title: () => i18n.global.t('dashboard.recentValuationsHeading'),
    variant: 'editorial',
    addLabelKey: 'dashboardGrid.widgetRecentValuations',
    icon: 'i-lucide-table',
    descKey: 'dashboardGrid.descRecentValuations',
    ...WIDGET_SIZE_BOUNDS.recentValuations,
  },
  statTile: {
    component: StatTileWidget,
    kickerKey: 'dashboardGrid.kindStatTile',
    title: (widget) => resolveSourceLabel(widget.source),
    variant: 'compact',
    icon: 'i-lucide-gauge',
    descKey: 'dashboardGrid.descStatTile',
    minW: 4,
    maxW: 6,
    minH: 1,
    maxH: 2,
  },
  trendChart: {
    component: TrendChartWidget,
    kickerKey: 'dashboardGrid.kindTrendChart',
    title: (widget) => resolveSourceLabel(widget.source),
    variant: 'label',
    headerExtra: TrendChartPeriodTabs,
    icon: 'i-lucide-trending-up',
    descKey: 'dashboardGrid.descTrendChart',
    minW: 6,
    maxW: 12,
    minH: 3,
    maxH: 3,
  },
  breakdownDonut: {
    component: BreakdownDonutWidget,
    kickerKey: 'dashboardGrid.kindBreakdownDonut',
    title: (widget) => resolveSourceLabel(widget.source),
    variant: 'label',
    subtitle: (widget) => breakdownSubtitle(widget.source),
    icon: 'i-lucide-chart-pie',
    descKey: 'dashboardGrid.descBreakdownDonut',
    minW: 4,
    maxW: 6,
    minH: 3,
    maxH: 3,
  },
  list: {
    component: ListWidget,
    kickerKey: 'dashboardGrid.kindList',
    title: (widget) => resolveSourceLabel(widget.source),
    variant: 'label',
    subtitle: (widget) => listSubtitle(widget.source),
    icon: 'i-lucide-list',
    descKey: 'dashboardGrid.descList',
    minW: 6,
    maxW: 12,
    minH: 3,
    maxH: 3,
  },
  payoffStatus: {
    component: PayoffStatusWidget,
    kickerKey: 'dashboardGrid.kindPayoffStatus',
    title: (widget) => resolveSourceLabel(widget.source),
    variant: 'label',
    subtitle: (widget) => payoffSubtitle(widget.source),
    icon: 'i-lucide-flag',
    descKey: 'dashboardGrid.descPayoffStatus',
    minW: 4,
    maxW: 6,
    minH: 3,
    maxH: 3,
  },
}
