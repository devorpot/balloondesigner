<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title">Editar cluster</div>
        <button
          class="btn btn-sm btn-outline-secondary icon-btn"
          type="button"
          @click="collapsed = !collapsed"
          :title="collapsed ? 'Expandir' : 'Contraer'"
        >
          <i class="bi" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
        </button>
      </div>

      <div v-show="!collapsed" class="panel-content">
        <div v-if="!canEdit" class="text-muted panel-subtitle">
          Selecciona un cluster creado con el panel de clusters.
        </div>

        <template v-else>
          <div class="text-muted panel-subtitle">
            <template v-if="selectedClusterCount > 1">
              Clusters seleccionados: <span class="fw-semibold">{{ selectedClusterCount }}</span>
            </template>
            <template v-else>
              Cluster seleccionado: <span class="fw-semibold">{{ groupName }}</span>
            </template>
          </div>
          <div class="mode-row">
            <span class="mode-chip" :class="{ active: isEditingCluster }">Edicion de cluster</span>
            <span class="mode-chip" :class="{ active: isEditingElements }"
              >Edicion de elementos</span
            >
          </div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="emitOpen">
              Editar cluster
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="$emit('edit-elements')"
            >
              Editar elementos
            </button>
          </div>

          <div class="row g-2 mt-3">
            <div class="col-12">
              <label class="form-label small">Globo seleccionado</label>
              <select
                class="form-select form-select-sm"
                :value="selectedBubbleId"
                @change="$emit('select-bubble', $event.target.value)"
              >
                <option v-for="opt in bubbleOptions" :key="opt.id" :value="opt.id">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label small">Color relleno</label>
              <div class="d-flex align-items-center gap-2">
                <input
                  :value="selectedBubbleColor"
                  class="form-control form-control-sm"
                  type="text"
                  @change="emitBubbleColor($event.target.value)"
                />
                <input
                  :value="selectedBubbleColor"
                  type="color"
                  class="form-control form-control-color"
                  aria-label="Color de relleno"
                  @change="emitBubbleColor($event.target.value)"
                />
              </div>
            </div>
            <div class="col-12">
              <label class="form-label small">Opacidad relleno (%)</label>
              <div class="d-flex align-items-center gap-2">
                <input
                  class="form-range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="fillAlphaValue"
                  @input="emitFillAlpha($event.target.value)"
                />
                <input
                  class="form-control form-control-sm"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  :value="fillAlphaValue"
                  @input="emitFillAlpha($event.target.value)"
                />
              </div>
            </div>
            <div class="col-12" v-if="fillPalette.length">
              <label class="form-label xsmall">Colores usados</label>
              <div class="fill-palette">
                <button
                  v-for="color in fillPalette"
                  :key="color"
                  class="fill-swatch"
                  type="button"
                  :title="color"
                  :style="{ backgroundColor: color }"
                  @click="emitBubbleColor(color)"
                ></button>
              </div>
            </div>
          </div>

          <div class="row g-2 mt-2">
            <div class="col-12">
              <label class="form-label small">Balloon size (in)</label>
              <select
                class="form-select form-select-sm"
                :value="sizeIn"
                @change="emitUpdate('sizeIn', $event.target.value)"
              >
                <option v-for="opt in sizeOptions" :key="opt" :value="opt">{{ opt }}"</option>
              </select>
              <div class="text-muted xsmall mt-1">{{ sizeCmLabel }}</div>
            </div>
            <div class="col-12">
              <label class="form-label small">Globos por cluster</label>
              <select
                class="form-select form-select-sm"
                :value="perLayer"
                @change="emitUpdate('perLayer', $event.target.value)"
              >
                <option v-for="count in perLayerOptions" :key="count" :value="count">
                  {{ count }}
                </option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label small">Separacion (in)</label>
              <div class="d-flex align-items-center gap-2">
                <input
                  class="form-range"
                  type="range"
                  min="-3"
                  max="6"
                  step="0.1"
                  :value="gapIn"
                  @input="emitUpdate('gapIn', $event.target.value)"
                />
                <input
                  class="form-control form-control-sm"
                  type="number"
                  min="-3"
                  max="6"
                  step="0.1"
                  :value="gapIn"
                  @input="emitUpdate('gapIn', $event.target.value)"
                />
              </div>
              <div class="text-muted xsmall mt-1">{{ gapCmLabel }}</div>
            </div>
            <div class="col-12" v-if="layoutLabel === 'Circulo'">
              <label class="form-label small">Rotacion (grados)</label>
              <input
                :value="rotationDeg"
                class="form-control form-control-sm"
                type="number"
                step="1"
                @input="emitUpdate('rotationDeg', $event.target.value)"
              />
            </div>
            <div class="col-12">
              <div class="text-muted xsmall">Total: {{ totalCount }} · Tipo: {{ layoutLabel }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const collapsed = ref(false)

const props = defineProps({
  canEdit: { type: Boolean, default: false },
  groupName: { type: String, default: '' },
  nodes: { type: Array, default: () => [] },
  totalCount: { type: Number, default: 0 },
  layout: { type: String, default: 'wall' },
  sizeIn: { type: Number, default: 12 },
  perLayer: { type: Number, default: 6 },
  gapIn: { type: Number, default: 0 },
  rotationDeg: { type: Number, default: 0 },
  selectedBubbleId: { type: [String, Number], default: '' },
  fillPalette: { type: Array, default: () => [] },
  fillAlpha: { type: Number, default: 100 },
  isEditingElements: { type: Boolean, default: false },
  isEditingCluster: { type: Boolean, default: false },
  selectedClusterCount: { type: Number, default: 1 },
})

const emit = defineEmits([
  'update',
  'edit-elements',
  'update-bubble-color',
  'update-bubble-fill-alpha',
  'select-bubble',
  'open-edit-tab',
  'copy-config',
  'paste-config',
])

const sizeOptions = [5, 9, 12, 24, 36]
const perLayerOptions = [3, 4, 5, 6]
const sizeCmLabel = computed(() => {
  const inches = Number(sizeOptions.includes(Number(props.sizeIn)) ? props.sizeIn : 12)
  const cm = Math.round(inches * 2.54 * 100) / 100
  return `${cm} cm`
})
const gapCmLabel = computed(() => {
  const inches = Number(props.gapIn || 0)
  const cm = Math.round(inches * 2.54 * 100) / 100
  return `${cm} cm`
})
const layoutLabel = computed(() => (props.layout === 'circle' ? 'Circulo' : 'Pared'))
const bubbleOptions = computed(() =>
  (props.nodes || []).map((node, index) => ({
    id: String(node?.id || index),
    label: `Globo ${index + 1}`,
  })),
)
const selectedBubbleColor = computed(() => {
  const node = (props.nodes || []).find(
    (item) => String(item?.id) === String(props.selectedBubbleId),
  )
  return String(node?.meta?.guideFillColor || '#ffffff')
})
const fillAlphaValue = computed(() => {
  const next = Number(props.fillAlpha)
  if (!Number.isFinite(next)) return 100
  return Math.min(100, Math.max(0, Math.round(next)))
})

function emitUpdate(key, value) {
  emit('update', { [key]: Number(value) })
}

function emitBubbleColor(value) {
  const color = String(value || '').trim()
  if (!color || !props.selectedBubbleId) return
  emit('update-bubble-color', { id: props.selectedBubbleId, color })
}

function emitFillAlpha(value) {
  const next = Number(value)
  if (!Number.isFinite(next)) return
  emit('update-bubble-fill-alpha', { id: props.selectedBubbleId, alpha: next })
}

function emitOpen() {
  emit('open-edit-tab')
}

watch(
  () => props.nodes,
  (list) => {
    if (!Array.isArray(list) || !list.length) return
    const current = String(props.selectedBubbleId || '')
    const stillExists = list.some((node) => String(node?.id) === current)
    if (!stillExists) emit('select-bubble', String(list[0]?.id || ''))
  },
  { immediate: true },
)
</script>

<style scoped>
.fill-palette {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
}

.fill-swatch {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  background: #fff;
  padding: 0;
}

.fill-swatch:focus-visible {
  outline: 2px solid #0d6efd;
  outline-offset: 1px;
}

.mode-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.mode-chip {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: #edf1f7;
  color: #5c6370;
  font-weight: 600;
}

.mode-chip.active {
  background: #12a4b7;
  color: #fff;
}
</style>
