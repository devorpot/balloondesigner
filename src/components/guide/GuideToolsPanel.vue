<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-bezier2 me-2"></i>Herramientas de guia</div>
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
          Agrega circulos u ovalos y acomodalos manualmente.
        </div>
        <div v-if="guideWallSummary" class="text-muted panel-subtitle">
          {{ guideWallSummary }}
        </div>

        <div class="mt-2">
          <label class="form-label xsmall"><i class="bi bi-palette me-1"></i>Color de guia</label>
          <div class="d-flex align-items-center gap-2">
            <input
              :value="color"
              class="form-control form-control-sm"
              type="text"
              @input="updateField('color', $event.target.value)"
            />
            <input
              :value="color"
              type="color"
              class="form-control form-control-color"
              aria-label="Color de guia"
              @input="updateField('color', $event.target.value)"
            />
          </div>
        </div>

        <div class="mt-2">
          <label class="form-label xsmall">Alpha (0-100)</label>
          <div class="d-flex align-items-center gap-2">
            <input
              class="form-range"
              type="range"
              min="0"
              max="100"
              step="1"
              :value="alpha"
              @input="updateField('alpha', Number($event.target.value))"
            />
            <input
              class="form-control form-control-sm"
              type="number"
              min="0"
              max="100"
              step="1"
              :value="alpha"
              @input="updateField('alpha', Number($event.target.value))"
            />
          </div>
        </div>

        <div class="mt-2 d-flex flex-wrap gap-2 align-items-end">
          <button
            class="btn btn-sm btn-outline-primary"
            type="button"
            @click="$emit('export-guide')"
          >
            <i class="bi bi-download me-1"></i>Exportar guia JSON
          </button>
          <button
            class="btn btn-sm btn-outline-secondary"
            type="button"
            @click="$emit('export-selection')"
          >
            <i class="bi bi-download me-1"></i>Exportar seleccion JSON
          </button>
          <button
            class="btn btn-sm btn-outline-secondary"
            type="button"
            @click="$emit('export-symbol')"
          >
            <i class="bi bi-download me-1"></i>Exportar simbolo JSON
          </button>
          <label class="btn btn-sm btn-outline-secondary mb-0">
            <i class="bi bi-upload me-1"></i>Importar guia JSON
            <input
              type="file"
              accept="application/json"
              class="d-none"
              @change="$emit('import-guide', $event)"
            />
          </label>
          <div class="form-check form-switch">
            <input
              id="guide-export-visible"
              class="form-check-input"
              type="checkbox"
              :checked="exportVisibleOnly"
              @change="updateField('exportVisibleOnly', $event.target.checked)"
            />
            <label class="form-check-label" for="guide-export-visible">Solo visibles</label>
          </div>
          <div class="form-check form-switch">
            <input
              id="guide-export-lock"
              class="form-check-input"
              type="checkbox"
              :checked="lockClusters"
              @change="updateField('lockClusters', $event.target.checked)"
            />
            <label class="form-check-label" for="guide-export-lock"> Bloquear clusters </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const collapsed = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem('guide_panel_tools_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_tools_collapsed', String(value))
  } catch {
    // ignore
  }
})
defineProps({
  guideWallSummary: { type: String, default: '' },
  color: { type: String, default: '' },
  alpha: { type: Number, default: 100 },
  exportVisibleOnly: { type: Boolean, default: false },
  lockClusters: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update',
  'export-guide',
  'export-selection',
  'export-symbol',
  'import-guide',
])

function updateField(key, value) {
  emit('update', { [key]: value })
}
</script>
