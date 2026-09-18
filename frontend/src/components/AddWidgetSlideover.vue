<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CATALOG_WIDGET_TYPES, WIDGET_TYPES, type Widget, type WidgetType } from '../api/types'
import { WIDGET_CATALOG, pickerSizes } from '../lib/widgetCatalog'
import { availableSources } from '../lib/widgetSources'

const props = defineProps<{ open: boolean; widgets: Widget[] }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  add: [{ type: WidgetType; source?: string; w: number; h: number }]
}>()

const { t } = useI18n()

// Step 1 is always "pick a type" — mirrors the design's own picker, which
// resets to this same blank state every time it's opened, never resuming
// mid-flow from a previous visit.
const pickedType = ref<WidgetType | null>(null)
const source = ref<string | null>(null)
const size = ref<[number, number] | null>(null)

function isCatalogType(type: WidgetType): type is (typeof CATALOG_WIDGET_TYPES)[number] {
  return (CATALOG_WIDGET_TYPES as readonly string[]).includes(type)
}

// Options a kind/source could still be added as — already-placed (type, source)
// pairs are excluded, since duplicates aren't allowed (see the backend's own check).
function remainingSources(type: WidgetType) {
  if (!isCatalogType(type)) return []
  return availableSources(type).filter((opt) => !props.widgets.some((w) => w.type === type && w.source === opt.value))
}

const availableTypes = computed(() =>
  WIDGET_TYPES.filter((type) =>
    isCatalogType(type) ? remainingSources(type).length > 0 : !props.widgets.some((w) => w.type === type),
  ),
)

const typeEntries = computed(() =>
  availableTypes.value.map((type) => {
    const catalog = WIDGET_CATALOG[type]
    return {
      type,
      icon: catalog.icon,
      name: t(catalog.addLabelKey ?? catalog.kickerKey),
      desc: t(catalog.descKey),
    }
  }),
)

const sourceOptions = computed(() => (pickedType.value ? remainingSources(pickedType.value) : []))
const sizeOptions = computed(() => (pickedType.value ? pickerSizes(pickedType.value) : []))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    pickedType.value = null
    source.value = null
    size.value = null
  },
)

function pickType(type: WidgetType) {
  pickedType.value = type
  source.value = remainingSources(type)[0]?.value ?? null
  size.value = pickerSizes(type)[0] ?? null
}

function back() {
  pickedType.value = null
  source.value = null
  size.value = null
}

function confirm() {
  if (!pickedType.value || !size.value) return
  emit('add', { type: pickedType.value, source: source.value ?? undefined, w: size.value[0], h: size.value[1] })
  emit('update:open', false)
}

function sizePreviewStyle(w: number, h: number) {
  return { width: `${5 + w * 1.6}px`, height: `${5 + h * 4}px` }
}
</script>

<template>
  <USlideover :open="open" side="right" :ui="{ content: 'sm:max-w-[440px]' }" @update:open="emit('update:open', $event)">
    <template #header="{ close }">
      <div class="flex flex-1 items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-[11.5px] font-bold tracking-wide text-muted uppercase">
            {{ pickedType ? t('dashboardGrid.pickerStep2Kicker', { kind: t(WIDGET_CATALOG[pickedType].kickerKey) }) : t('dashboardGrid.pickerStep1Kicker') }}
          </span>
          <span class="text-[22px] font-extrabold tracking-tight">
            {{ pickedType ? t('dashboardGrid.pickerStep2Title') : t('dashboardGrid.pickerStep1Title') }}
          </span>
        </div>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" class="flex-none rounded-full" @click="close" />
      </div>
    </template>

    <template #body>
      <div v-if="!pickedType" class="flex flex-col gap-2">
        <button
          v-for="entry in typeEntries"
          :key="entry.type"
          type="button"
          class="flex items-center gap-3.5 rounded-2xl border border-default bg-default p-4 text-left hover:bg-elevated"
          @click="pickType(entry.type)"
        >
          <span class="flex size-10 flex-none items-center justify-center rounded-xl bg-elevated text-primary">
            <UIcon :name="entry.icon" class="size-[19px]" />
          </span>
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-[14.5px] font-bold">{{ entry.name }}</span>
            <span class="text-[12.5px] text-muted [text-wrap:pretty]">{{ entry.desc }}</span>
          </span>
        </button>
      </div>

      <div v-else class="flex flex-col gap-5">
        <div v-if="sourceOptions.length" class="flex flex-col gap-2.5">
          <span class="text-[11.5px] font-bold tracking-wide text-muted uppercase">{{ t('dashboardGrid.pickerDataSource') }}</span>
          <div class="flex flex-col gap-1.5">
            <button
              v-for="opt in sourceOptions"
              :key="opt.value"
              type="button"
              class="flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold"
              :class="opt.value === source ? 'border-primary' : 'border-default'"
              @click="source = opt.value"
            >
              <span
                class="size-[15px] flex-none rounded-full border-2"
                :class="opt.value === source ? 'border-primary bg-primary' : 'border-default bg-transparent'"
              />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <span class="text-[11.5px] font-bold tracking-wide text-muted uppercase">{{ t('dashboardGrid.pickerSize') }}</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="[w, h] in sizeOptions"
              :key="`${w}x${h}`"
              type="button"
              class="flex h-10 items-center gap-2.5 rounded-xl border px-3.5 text-[13.5px] font-bold"
              :class="size && size[0] === w && size[1] === h ? 'border-primary' : 'border-default'"
              @click="size = [w, h]"
            >
              <span class="block rounded-[3px]" :class="size && size[0] === w && size[1] === h ? 'bg-primary' : 'bg-muted'" :style="sizePreviewStyle(w, h)" />
              {{ w }} × {{ h }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <template v-if="pickedType" #footer>
      <div class="flex flex-1 gap-2.5">
        <UButton variant="outline" color="neutral" :label="t('dashboardGrid.pickerBack')" @click="back" />
        <UButton class="flex-1 justify-center" :label="t('dashboardGrid.pickerAddToDashboard')" @click="confirm" />
      </div>
    </template>
  </USlideover>
</template>
