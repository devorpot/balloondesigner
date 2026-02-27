<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-layers me-2"></i>Clusters</div>
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
        <div class="text-muted panel-subtitle">
          Crea clusters desde el piso hacia arriba, con globos en pared o circulo.
        </div>

        <div class="row g-2 mt-2">
          <div class="col-12">
            <label class="form-label small"><i class="bi bi-shuffle me-1"></i>Disposicion</label>
            <div class="btn-group w-100" role="group">
              <button
                class="btn btn-sm"
                type="button"
                :class="layout === 'wall' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="updateField('layout', 'wall')"
              >
                Pared
              </button>
              <button
                class="btn btn-sm"
                type="button"
                :class="layout === 'circle' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="updateField('layout', 'circle')"
              >
                Circulo
              </button>
            </div>
          </div>
        </div>

        <div class="row g-2 mt-2">
          <div class="col">
            <label class="form-label small">Balloon size (in)</label>
            <select
              class="form-select form-select-sm"
              :value="size"
              @change="updateNumber('size', $event.target.value)"
            >
              <option v-for="opt in sizeOptions" :key="opt" :value="opt">{{ opt }}"</option>
            </select>
            <div class="text-muted xsmall mt-1">{{ sizeCmLabel }}</div>
          </div>
          <div class="col">
            <label class="form-label small">Clusters</label>
            <input
              :value="layers"
              class="form-control form-control-sm"
              type="number"
              min="1"
              step="1"
              @input="updateNumber('layers', $event.target.value)"
            />
          </div>
        </div>

        <div class="row g-2 mt-2">
          <div class="col">
            <label class="form-label small">Globos por cluster</label>
            <select
              class="form-select form-select-sm"
              :value="perLayer"
              @change="updateNumber('perLayer', $event.target.value)"
            >
              <option v-for="count in perLayerOptions" :key="count" :value="count">
                {{ count }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-check form-switch mt-2">
          <input
            id="guide-rows-gap"
            class="form-check-input"
            type="checkbox"
            :checked="showGapControls"
            @change="updateField('showGapControls', $event.target.checked)"
          />
          <label class="form-check-label" for="guide-rows-gap">Show gap controls</label>
        </div>

        <div v-if="showGapControls" class="mt-2">
          <label class="form-label small">Factor de separacion de cluster</label>
          <div class="d-flex align-items-center gap-2">
            <input
              class="form-range"
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              :value="layerGapFactor"
              @input="updateNumber('layerGapFactor', $event.target.value)"
            />
            <input
              class="form-control form-control-sm"
              type="number"
              min="0.5"
              max="3"
              step="0.05"
              :value="layerGapFactor"
              @input="updateNumber('layerGapFactor', $event.target.value)"
            />
          </div>
        </div>

        <div v-if="showGapControls" class="mt-2">
          <label class="form-label small">Balloon Gap ({{ unit }})</label>
          <div class="d-flex align-items-center gap-2">
            <input
              class="form-range"
              type="range"
              min="0"
              max="10"
              step="0.1"
              :value="balloonGap"
              @input="updateNumber('balloonGap', $event.target.value)"
            />
            <input
              class="form-control form-control-sm"
              type="number"
              min="0"
              max="10"
              step="0.1"
              :value="balloonGap"
              @input="updateNumber('balloonGap', $event.target.value)"
            />
          </div>
        </div>

        <button
          v-if="showGapControls"
          class="btn btn-sm btn-outline-secondary w-100 mt-2"
          type="button"
          @click="$emit('reset-gap')"
        >
          Reiniciar factor de separacion de cluster
        </button>

        <button class="btn btn-sm btn-primary w-100 mt-3" type="button" @click="$emit('apply')">
          <i class="bi bi-plus-circle me-1"></i>Crear clusters
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const collapsed = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem('guide_panel_rows_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_rows_collapsed', String(value))
  } catch {
    // ignore
  }
})

const props = defineProps({
  unit: { type: String, default: 'cm' },
  layout: { type: String, default: 'wall' },
  size: { type: Number, default: 5 },
  layers: { type: Number, default: 1 },
  perLayer: { type: Number, default: 3 },
  showGapControls: { type: Boolean, default: true },
  layerGapFactor: { type: Number, default: 1 },
  balloonGap: { type: Number, default: 0 },
})

const emit = defineEmits(['update', 'apply', 'reset-gap'])
const perLayerOptions = [3, 4, 5, 6]
const sizeOptions = [5, 9, 12, 24, 36]
const sizeCmLabel = computed(() => {
  const inches = Number(sizeOptions.includes(Number(props?.size)) ? props.size : 12)
  const cm = Math.round(inches * 2.54 * 100) / 100
  return `${cm} cm`
})

function updateField(key, value) {
  emit('update', { [key]: value })
}

function updateNumber(key, value) {
  emit('update', { [key]: Number(value) })
}
</script>
