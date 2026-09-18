import { computed, reactive, type WritableComputedRef } from 'vue'

export const PERIODS = ['1D', '1W', '1M', 'YTD', '1Y', 'MAX'] as const
export type Period = (typeof PERIODS)[number]

// Keyed by widget id — shared between TrendChartPeriodTabs (rendered in the widget's shared
// header, see WidgetGrid.vue) and TrendChartWidget (the chart body), which are siblings rather
// than parent/child, so a local ref in either one can't reach the other.
const periodByWidget = reactive(new Map<string, Period>())

export function useTrendPeriod(widgetId: string): WritableComputedRef<Period> {
  return computed({
    get: () => periodByWidget.get(widgetId) ?? '1Y',
    set: (value) => periodByWidget.set(widgetId, value),
  })
}

export function clearTrendPeriod(widgetId: string): void {
  periodByWidget.delete(widgetId)
}
