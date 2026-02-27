<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-columns-gap me-2"></i>Cluster y rejilla</div>
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
          Crea clusters o columnas con tamano real y activa la rejilla de globos.
        </div>

        <div class="row g-2 mt-2">
          <div class="col-12">
            <label class="form-label small"
              ><i class="bi bi-layout-three-columns me-1"></i>Modo</label
            >
            <div class="btn-group w-100" role="group">
              <button
                class="btn btn-sm"
                type="button"
                :class="mode === 'row' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="updateField('mode', 'row')"
              >
                Cluster
              </button>
              <button
                class="btn btn-sm"
                type="button"
                :class="mode === 'col' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="updateField('mode', 'col')"
              >
                Columna
              </button>
            </div>
          </div>
        </div>

        <div class="row g-2 mt-2">
          <div class="col">
            <label class="form-label small">
              <i class="bi bi-arrows-horizontal me-1"></i>Radio X ({{ unit }})
            </label>
            <input
              :value="radiusX"
              class="form-control form-control-sm"
              type="number"
              min="0.5"
              step="0.1"
              @input="updateNumber('radiusX', $event.target.value)"
            />
          </div>
          <div class="col">
            <label class="form-label small">
              <i class="bi bi-arrows-vertical me-1"></i>Radio Y ({{ unit }})
            </label>
            <input
              :value="radiusY"
              class="form-control form-control-sm"
              type="number"
              min="0.5"
              step="0.1"
              @input="updateNumber('radiusY', $event.target.value)"
            />
          </div>
        </div>

        <div class="row g-2 mt-2">
          <div class="col">
            <label class="form-label small">
              <i class="bi bi-distribute-horizontal me-1"></i>Separacion ({{ unit }})
            </label>
            <input
              :value="gap"
              class="form-control form-control-sm"
              type="number"
              min="0"
              step="0.1"
              @input="updateNumber('gap', $event.target.value)"
            />
          </div>
          <div class="col">
            <label class="form-label small"><i class="bi bi-hash me-1"></i>Cantidad</label>
            <input
              :value="count"
              class="form-control form-control-sm"
              type="number"
              min="1"
              step="1"
              :disabled="autoFill"
              @input="updateNumber('count', $event.target.value)"
            />
          </div>
        </div>

        <div class="form-check form-switch mt-2">
          <input
            id="guide-grid-auto"
            class="form-check-input"
            type="checkbox"
            :checked="autoFill"
            @change="updateField('autoFill', $event.target.checked)"
          />
          <label class="form-check-label" for="guide-grid-auto">Auto llenar pared</label>
        </div>
        <div v-if="autoFill && maxCountLabel" class="text-muted xsmall mt-1">
          {{ maxCountLabel }}
        </div>

        <div class="row g-2 mt-2">
          <div class="col">
            <label class="form-label small"
              ><i class="bi bi-geo me-1"></i>Inicio X ({{ unit }})</label
            >
            <input
              :value="startX"
              class="form-control form-control-sm"
              type="number"
              min="0"
              step="0.1"
              @input="updateNumber('startX', $event.target.value)"
            />
          </div>
          <div class="col">
            <label class="form-label small"
              ><i class="bi bi-geo-alt me-1"></i>Inicio Y ({{ unit }})</label
            >
            <input
              :value="startY"
              class="form-control form-control-sm"
              type="number"
              min="0"
              step="0.1"
              @input="updateNumber('startY', $event.target.value)"
            />
          </div>
        </div>

        <button class="btn btn-sm btn-primary w-100 mt-2" type="button" @click="$emit('apply')">
          <i class="bi bi-plus-circle me-1"></i
          >{{ mode === 'col' ? 'Crear columna' : 'Crear cluster' }}
        </button>

        <div class="mt-3">
          <div class="fw-bold small"><i class="bi bi-grid-3x3-gap me-1"></i>Rejilla de globos</div>
          <div class="text-muted panel-subtitle">
            Encaja el arrastre usando el diametro mas separacion.
          </div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button
              class="btn btn-sm"
              type="button"
              :class="snapEnabled ? 'btn-primary' : 'btn-outline-secondary'"
              @click="$emit('apply-snap')"
            >
              <i class="bi bi-magnet me-1"></i>Activar rejilla
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              :disabled="!snapEnabled"
              @click="$emit('disable-snap')"
            >
              <i class="bi bi-x-circle me-1"></i>Desactivar
            </button>
          </div>
          <div v-if="snapSuggestedLabel" class="text-muted xsmall mt-1">
            Paso sugerido: {{ snapSuggestedLabel }}
            <span v-if="snapStepLabel">· Actual: {{ snapStepLabel }}</span>
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
    const saved = localStorage.getItem('guide_panel_balloon_grid_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_balloon_grid_collapsed', String(value))
  } catch {
    // ignore
  }
})

defineProps({
  unit: { type: String, default: 'cm' },
  mode: { type: String, default: 'row' },
  autoFill: { type: Boolean, default: true },
  count: { type: Number, default: 1 },
  radiusX: { type: Number, default: 0 },
  radiusY: { type: Number, default: 0 },
  gap: { type: Number, default: 0 },
  startX: { type: Number, default: 0 },
  startY: { type: Number, default: 0 },
  maxCountLabel: { type: String, default: '' },
  snapEnabled: { type: Boolean, default: false },
  snapStepLabel: { type: String, default: '' },
  snapSuggestedLabel: { type: String, default: '' },
})

const emit = defineEmits(['update', 'apply', 'apply-snap', 'disable-snap'])

function updateField(key, value) {
  emit('update', { [key]: value })
}

function updateNumber(key, value) {
  emit('update', { [key]: Number(value) })
}
</script>
