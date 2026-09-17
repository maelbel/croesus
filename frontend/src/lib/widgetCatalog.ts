import type { Component } from 'vue'
import type { WidgetType } from '../api/types'
import NetWorthRings from '../components/NetWorthRings.vue'
import CompositionChart from '../components/CompositionChart.vue'
import AssetsByClassWidget from '../components/widgets/AssetsByClassWidget.vue'
import LiabilitiesVsAssetsWidget from '../components/widgets/LiabilitiesVsAssetsWidget.vue'
import RecentValuationsWidget from '../components/widgets/RecentValuationsWidget.vue'
import { WIDGET_SIZE_BOUNDS } from './widgetGrid'

export interface WidgetCatalogEntry {
  component: Component
  /** Small label above the card title, e.g. "Composition over time". */
  kickerKey: string
  /** The card's own heading, e.g. "Where the money sits, valuation by valuation". */
  titleKey: string
  /** Short label used in the "Add widget" picker — distinct from kicker/title, which read
   * naturally as a two-line card header but are too long for a single menu row. */
  addLabelKey: string
  minW: number
  maxW: number
  minH: number
  maxH: number
}

export const WIDGET_CATALOG: Record<WidgetType, WidgetCatalogEntry> = {
  netWorthRings: {
    component: NetWorthRings,
    kickerKey: 'dashboard.netWorthByYearKicker',
    titleKey: 'dashboard.netWorthByYearHeading',
    addLabelKey: 'dashboardGrid.widgetNetWorthRings',
    ...WIDGET_SIZE_BOUNDS.netWorthRings,
  },
  composition: {
    component: CompositionChart,
    kickerKey: 'dashboard.compositionKicker',
    titleKey: 'dashboard.compositionHeading',
    addLabelKey: 'dashboardGrid.widgetComposition',
    ...WIDGET_SIZE_BOUNDS.composition,
  },
  assetsByClass: {
    component: AssetsByClassWidget,
    kickerKey: 'dashboard.byAssetClassKicker',
    titleKey: 'dashboard.byAssetClassHeading',
    addLabelKey: 'dashboardGrid.widgetAssetsByClass',
    ...WIDGET_SIZE_BOUNDS.assetsByClass,
  },
  liabilitiesVsAssets: {
    component: LiabilitiesVsAssetsWidget,
    kickerKey: 'dashboard.liabilitiesVsAssetsKicker',
    titleKey: 'dashboard.liabilitiesVsAssetsHeading',
    addLabelKey: 'dashboardGrid.widgetLiabilitiesVsAssets',
    ...WIDGET_SIZE_BOUNDS.liabilitiesVsAssets,
  },
  recentValuations: {
    component: RecentValuationsWidget,
    kickerKey: 'dashboard.recentValuationsKicker',
    titleKey: 'dashboard.recentValuationsHeading',
    addLabelKey: 'dashboardGrid.widgetRecentValuations',
    ...WIDGET_SIZE_BOUNDS.recentValuations,
  },
}
