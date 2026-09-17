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
import ListWidget from '../components/widgets/ListWidget.vue'
import PayoffStatusWidget from '../components/widgets/PayoffStatusWidget.vue'
import { WIDGET_SIZE_BOUNDS } from './widgetGrid'
import { resolveSourceLabel } from './widgetSources'

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
  /** True only for statTile: a 1-row-tall tile has no room for the shared kicker/title header,
   * so it renders its own label and fills the whole card instead. */
  compact?: boolean
  /** Legacy widgets resize by free continuous drag, clamped to this box. */
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  /** Catalog widgets resize by cycling through this preset list instead (see the roadmap's own
   * "size preset" wording, and the design's own per-kind `sizes` list this mirrors). */
  sizes?: [number, number][]
}

export const WIDGET_CATALOG: Record<WidgetType, WidgetCatalogEntry> = {
  netWorthRings: {
    component: NetWorthRings,
    kickerKey: 'dashboard.netWorthByYearKicker',
    title: () => i18n.global.t('dashboard.netWorthByYearHeading'),
    addLabelKey: 'dashboardGrid.widgetNetWorthRings',
    ...WIDGET_SIZE_BOUNDS.netWorthRings,
  },
  composition: {
    component: CompositionChart,
    kickerKey: 'dashboard.compositionKicker',
    title: () => i18n.global.t('dashboard.compositionHeading'),
    addLabelKey: 'dashboardGrid.widgetComposition',
    ...WIDGET_SIZE_BOUNDS.composition,
  },
  assetsByClass: {
    component: AssetsByClassWidget,
    kickerKey: 'dashboard.byAssetClassKicker',
    title: () => i18n.global.t('dashboard.byAssetClassHeading'),
    addLabelKey: 'dashboardGrid.widgetAssetsByClass',
    ...WIDGET_SIZE_BOUNDS.assetsByClass,
  },
  liabilitiesVsAssets: {
    component: LiabilitiesVsAssetsWidget,
    kickerKey: 'dashboard.liabilitiesVsAssetsKicker',
    title: () => i18n.global.t('dashboard.liabilitiesVsAssetsHeading'),
    addLabelKey: 'dashboardGrid.widgetLiabilitiesVsAssets',
    ...WIDGET_SIZE_BOUNDS.liabilitiesVsAssets,
  },
  recentValuations: {
    component: RecentValuationsWidget,
    kickerKey: 'dashboard.recentValuationsKicker',
    title: () => i18n.global.t('dashboard.recentValuationsHeading'),
    addLabelKey: 'dashboardGrid.widgetRecentValuations',
    ...WIDGET_SIZE_BOUNDS.recentValuations,
  },
  statTile: {
    component: StatTileWidget,
    kickerKey: 'dashboardGrid.kindStatTile',
    title: (widget) => resolveSourceLabel(widget.source),
    compact: true,
    sizes: [
      [4, 1],
      [6, 1],
      [6, 2],
    ],
  },
  trendChart: {
    component: TrendChartWidget,
    kickerKey: 'dashboardGrid.kindTrendChart',
    title: (widget) => resolveSourceLabel(widget.source),
    sizes: [
      [6, 3],
      [8, 3],
      [12, 3],
    ],
  },
  breakdownDonut: {
    component: AssetsByClassWidget,
    kickerKey: 'dashboardGrid.kindBreakdownDonut',
    title: (widget) => resolveSourceLabel(widget.source),
    sizes: [
      [4, 3],
      [6, 3],
    ],
  },
  list: {
    component: ListWidget,
    kickerKey: 'dashboardGrid.kindList',
    title: (widget) => resolveSourceLabel(widget.source),
    sizes: [
      [6, 3],
      [7, 3],
      [12, 3],
    ],
  },
  payoffStatus: {
    component: PayoffStatusWidget,
    kickerKey: 'dashboardGrid.kindPayoffStatus',
    title: (widget) => resolveSourceLabel(widget.source),
    sizes: [
      [5, 3],
      [6, 3],
    ],
  },
}
