<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CATALOG_WIDGET_TYPES, type CatalogWidgetType, type Widget } from '../api/types'
import { WIDGET_CATALOG } from '../lib/widgetCatalog'
import { availableSources } from '../lib/widgetSources'
import EntityFormModal from './EntityFormModal.vue'

const props = defineProps<{ open: boolean; widgets: Widget[]; initialKind?: CatalogWidgetType | null }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  add: [{ type: CatalogWidgetType; source: string; w: number; h: number }]
}>()

const { t } = useI18n()

const kind = ref<CatalogWidgetType | null>(null)
const source = ref<string | null>(null)
const size = ref<[number, number] | null>(null)

// Options a kind/source could still be added as — already-placed (type, source)
// pairs are excluded, since duplicates aren't allowed (see the backend's own check).
function remainingSources(type: CatalogWidgetType) {
  return availableSources(type).filter((opt) => !props.widgets.some((w) => w.type === type && w.source === opt.value))
}

const kindOptions = computed(() =>
  CATALOG_WIDGET_TYPES.filter((type) => remainingSources(type).length > 0).map((type) => ({
    label: t(WIDGET_CATALOG[type].kickerKey),
    value: type,
  })),
)

const sourceOptions = computed(() => (kind.value ? remainingSources(kind.value) : []))
const sizeOptions = computed(() => {
  const sizes = kind.value ? (WIDGET_CATALOG[kind.value].sizes ?? []) : []
  return sizes.map(([w, h]) => ({ label: `${w} × ${h}`, value: `${w}x${h}` }))
})

watch(kind, () => {
  source.value = sourceOptions.value[0]?.value ?? null
  const sizes = kind.value ? (WIDGET_CATALOG[kind.value].sizes ?? []) : []
  size.value = sizes[0] ?? null
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    kind.value = props.initialKind ?? kindOptions.value[0]?.value ?? null
  },
)

function submit() {
  if (!kind.value || !source.value || !size.value) return
  emit('add', { type: kind.value, source: source.value, w: size.value[0], h: size.value[1] })
  emit('update:open', false)
}

function sizeModel(): string | undefined {
  return size.value ? `${size.value[0]}x${size.value[1]}` : undefined
}
function setSize(value: string) {
  const [w, h] = value.split('x').map(Number)
  size.value = [w, h]
}
</script>

<template>
  <EntityFormModal
    :open="open"
    :title="t('dashboardGrid.addWidget')"
    :submit-label="t('common.add')"
    @update:open="emit('update:open', $event)"
    @submit="submit"
  >
    <UFormField :label="t('dashboardGrid.addWidgetKind')" class="sm:col-span-2">
      <USelect v-model="kind" :items="kindOptions" class="w-full" />
    </UFormField>
    <UFormField v-if="sourceOptions.length > 1" :label="t('dashboardGrid.addWidgetSource')" class="sm:col-span-2">
      <USelect v-model="source" :items="sourceOptions" class="w-full" />
    </UFormField>
    <UFormField :label="t('dashboardGrid.addWidgetSize')" class="sm:col-span-2">
      <USelect :model-value="sizeModel()" :items="sizeOptions" class="w-full" @update:model-value="setSize($event as string)" />
    </UFormField>
  </EntityFormModal>
</template>
