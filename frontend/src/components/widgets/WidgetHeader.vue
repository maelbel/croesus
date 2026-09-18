<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Widget } from '../../api/types'
import { WIDGET_CATALOG } from '../../lib/widgetCatalog'

// Renders the two header styles that share the same "row above the widget's body" slot in
// WidgetGrid.vue — 'editorial' (5 legacy widgets: fixed kicker + real authored heading) and
// 'label' (4 catalog widgets: the bound source's own name + optional detail line). statTile's
// 'compact' variant has no row-above-body slot at all — its title is passed straight into the
// tile itself instead (see widgetProps in WidgetGrid.vue) — so it's never rendered here.
const props = defineProps<{ widget: Widget }>()

const { t } = useI18n()

const entry = computed(() => WIDGET_CATALOG[props.widget.type])
const title = computed(() => entry.value.title(props.widget))
const subtitle = computed(() => entry.value.subtitle?.(props.widget) ?? '')
</script>

<template>
  <template v-if="entry.variant === 'editorial'">
    <span class="text-sm text-muted">{{ t(entry.kickerKey) }}</span>
    <h2 class="text-[22px]">{{ title }}</h2>
  </template>
  <template v-else>
    <span class="truncate text-xs tracking-wide text-muted uppercase">{{ title }}</span>
    <span v-if="subtitle" class="truncate text-xs text-muted">{{ subtitle }}</span>
  </template>
</template>
