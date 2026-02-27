<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-tools me-2"></i>Edicion de guias</div>
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
        <div class="text-muted panel-subtitle">Crea guias y ajusta su trazo.</div>

        <div class="row g-2 mt-2">
          <div class="col">
            <label class="form-label small"><i class="bi bi-pen me-1"></i>Grosor linea</label>
            <input
              :value="lineWidth"
              class="form-control form-control-sm"
              type="number"
              min="1"
              max="10"
              @input="updateNumber('lineWidth', $event.target.value)"
            />
          </div>
          <div class="col">
            <label class="form-label small"><i class="bi bi-slash-square me-1"></i>Estilo</label>
            <select
              class="form-select form-select-sm"
              :value="lineStyle"
              @change="updateField('lineStyle', $event.target.value)"
            >
              <option value="dashed">Punteada</option>
              <option value="solid">Continua</option>
            </select>
          </div>
        </div>

        <div class="mt-2">
          <div class="text-muted xsmall">Circulo</div>
          <div class="row g-2 align-items-end">
            <div class="col">
              <label class="form-label small">
                <i class="bi bi-arrows-angle-expand me-1"></i>Balloon size (in)
              </label>
              <select
                class="form-select form-select-sm"
                :value="circleR"
                @change="updateNumber('circleR', $event.target.value)"
              >
                <option v-for="opt in sizeOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <div class="text-muted xsmall mt-1">{{ sizeCmLabel }}</div>
            </div>
            <div class="col-auto">
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                @click="$emit('add-circle')"
              >
                <i class="bi bi-plus-circle me-1"></i>Agregar circulo
              </button>
            </div>
          </div>
        </div>

        <div class="mt-2">
          <div class="text-muted xsmall">Ovalo</div>
          <div class="row g-2 align-items-end">
            <div class="col">
              <label class="form-label small">
                <i class="bi bi-arrows-horizontal me-1"></i>Ancho (in)
              </label>
              <input
                :value="ovalW"
                class="form-control form-control-sm"
                type="number"
                min="1"
                step="0.1"
                @input="updateNumber('ovalW', $event.target.value)"
              />
            </div>
            <div class="col">
              <label class="form-label small">
                <i class="bi bi-arrows-vertical me-1"></i>Alto (in)
              </label>
              <input
                :value="ovalH"
                class="form-control form-control-sm"
                type="number"
                min="1"
                step="0.1"
                @input="updateNumber('ovalH', $event.target.value)"
              />
            </div>
            <div class="col-auto">
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                @click="$emit('add-oval')"
              >
                <i class="bi bi-plus-circle me-1"></i>Agregar ovalo
              </button>
            </div>
          </div>
        </div>

        <div class="mt-2">
          <div class="text-muted xsmall"><i class="bi bi-layers me-1"></i>Apilado</div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="$emit('bring-forward')"
            >
              <i class="bi bi-layer-forward me-1"></i>Traer adelante
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="$emit('send-backward')"
            >
              <i class="bi bi-layer-backward me-1"></i>Enviar atras
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="$emit('bring-front')"
            >
              <i class="bi bi-front me-1"></i>Traer al frente
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="$emit('send-back')"
            >
              <i class="bi bi-back me-1"></i>Enviar al fondo
            </button>
          </div>
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
    const saved = localStorage.getItem('guide_panel_edit_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_edit_collapsed', String(value))
  } catch {
    // ignore
  }
})

const props = defineProps({
  guideRadiusUnit: { type: String, default: 'cm' },
  lineWidth: { type: Number, default: 2 },
  lineStyle: { type: String, default: 'dashed' },
  circleR: { type: Number, default: 0 },
  ovalW: { type: Number, default: 0 },
  ovalH: { type: Number, default: 0 },
})

const sizeOptions = [5, 9, 12, 24, 36]
const sizeCmLabel = computed(() => {
  const value = Number(props.circleR)
  const inches = Number(sizeOptions.includes(value) ? value : sizeOptions[0])
  const cm = Math.round(inches * 2.54 * 100) / 100
  return `${cm} cm`
})

const emit = defineEmits([
  'update',
  'add-circle',
  'add-oval',
  'bring-forward',
  'send-backward',
  'bring-front',
  'send-back',
])

function updateField(key, value) {
  emit('update', { [key]: value })
}

function updateNumber(key, value) {
  emit('update', { [key]: Number(value) })
}
</script>
