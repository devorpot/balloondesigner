<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-moon-stars me-2"></i>Arcos</div>
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
          Selecciona clusters para armar un arco y ajustar su tamano.
        </div>

        <div class="mt-2">
          <div v-if="selectedCount" class="text-muted xsmall">
            Clusters seleccionados: {{ selectedCount }}
          </div>
          <div v-else class="text-muted xsmall">
            Selecciona clusters en el canvas para usarlos como patron.
          </div>
          <div v-if="arcActive" class="badge text-bg-primary mt-1">
            Arco activo - {{ arcCount }} clusters
          </div>
        </div>

        <div class="row g-2 mt-2 align-items-end">
          <div class="col">
            <label class="form-label small">Ancho</label>
            <input
              :value="width"
              class="form-control form-control-sm"
              type="number"
              min="1"
              step="0.1"
              @input="updateNumber('width', $event.target.value)"
            />
          </div>
          <div class="col">
            <label class="form-label small">Alto</label>
            <input
              :value="height"
              class="form-control form-control-sm"
              type="number"
              min="1"
              step="0.1"
              @input="updateNumber('height', $event.target.value)"
            />
          </div>
          <div class="col-auto">
            <label class="form-label small">Unidad</label>
            <select
              class="form-select form-select-sm"
              :value="unit"
              @change="updateField('unit', $event.target.value)"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>

        <div class="row g-2 mt-2">
          <div class="col">
            <label class="form-label small">Balloon size (in)</label>
            <select
              class="form-select form-select-sm"
              :value="sizeIn"
              @change="updateNumber('sizeIn', $event.target.value)"
            >
              <option v-for="opt in sizeOptions" :key="opt" :value="opt">{{ opt }}"</option>
            </select>
            <div class="text-muted xsmall mt-1">{{ sizeCmLabel }}</div>
          </div>
        </div>

        <div class="d-flex flex-column gap-2 mt-3">
          <button
            class="btn btn-sm btn-primary"
            type="button"
            :disabled="!canCreate"
            @click="$emit('create')"
          >
            <i class="bi bi-plus-circle me-1"></i>Crear arco
          </button>
          <button
            v-if="arcActive"
            class="btn btn-sm btn-outline-secondary"
            type="button"
            :disabled="!canUpdate"
            @click="$emit('update-arc')"
          >
            <i class="bi bi-arrow-repeat me-1"></i>Actualizar arco
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const collapsed = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem('guide_panel_arc_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_arc_collapsed', String(value))
  } catch {
    // ignore
  }
})

const props = defineProps({
  selectedCount: { type: Number, default: 0 },
  arcActive: { type: Boolean, default: false },
  arcCount: { type: Number, default: 0 },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  unit: { type: String, default: 'cm' },
  sizeIn: { type: Number, default: 9 },
  canCreate: { type: Boolean, default: false },
  canUpdate: { type: Boolean, default: false },
})

const emit = defineEmits(['update', 'create', 'update-arc'])

const sizeOptions = [5, 9, 12, 24, 36]
const sizeCmLabel = computed(() => {
  const inches = Number(sizeOptions.includes(Number(props.sizeIn)) ? props.sizeIn : 9)
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
