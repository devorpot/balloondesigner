<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-sliders me-2"></i>Propiedades de guia</div>
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
        <div class="text-muted panel-subtitle">Edita tamano y escala.</div>

        <div v-if="selectedGuide" class="mt-2">
          <div class="row g-2">
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">
                <i class="bi bi-arrows-angle-expand me-1"></i>Radio X ({{ unit }})
              </label>
              <input
                :value="guideRadiusX"
                class="form-control form-control-sm"
                type="number"
                min="0.5"
                step="0.1"
                @input="$emit('update-radius-x', Number($event.target.value))"
              />
              <div class="text-muted xsmall mt-1">{{ guideRadiusXLabel }}</div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">
                <i class="bi bi-arrows-angle-expand me-1"></i>Radio Y ({{ unit }})
              </label>
              <input
                :value="guideRadiusY"
                class="form-control form-control-sm"
                type="number"
                min="0.5"
                step="0.1"
                @input="$emit('update-radius-y', Number($event.target.value))"
              />
              <div class="text-muted xsmall mt-1">{{ guideRadiusYLabel }}</div>
            </div>
          </div>

          <div class="row g-2 mt-2">
            <div class="col-12 col-md-6">
              <label class="form-label xsmall"> <i class="bi bi-pen me-1"></i>Grosor linea </label>
              <input
                :value="guideLineWidth"
                class="form-control form-control-sm"
                type="number"
                min="1"
                max="10"
                @input="$emit('update-line-width', Number($event.target.value))"
              />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">
                <i class="bi bi-slash-square me-1"></i>Estilo linea
              </label>
              <select
                class="form-select form-select-sm"
                :value="guideLineStyle"
                @change="$emit('update-line-style', $event.target.value)"
              >
                <option value="dashed">Punteada</option>
                <option value="solid">Continua</option>
              </select>
            </div>
          </div>

          <div class="row g-2 mt-2">
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">
                <i class="bi bi-palette me-1"></i>Color de guia
              </label>
              <div class="d-flex align-items-center gap-2">
                <input
                  :value="guideColor"
                  class="form-control form-control-sm"
                  type="text"
                  @input="$emit('preview-color', $event.target.value)"
                  @change="$emit('update-color', $event.target.value)"
                />
                <input
                  :value="guideColor"
                  type="color"
                  class="form-control form-control-color"
                  aria-label="Color de guia"
                  @input="$emit('preview-color', $event.target.value)"
                  @change="$emit('update-color', $event.target.value)"
                />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">Alpha (0-100)</label>
              <div class="d-flex align-items-center gap-2">
                <input
                  class="form-range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="guideAlpha"
                  @input="$emit('preview-alpha', Number($event.target.value))"
                  @change="$emit('update-alpha', Number($event.target.value))"
                />
                <input
                  class="form-control form-control-sm"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  :value="guideAlpha"
                  @input="$emit('preview-alpha', Number($event.target.value))"
                  @change="$emit('update-alpha', Number($event.target.value))"
                />
              </div>
            </div>
          </div>

          <div class="row g-2 mt-2">
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">
                <i class="bi bi-paint-bucket me-1"></i>Color de relleno
              </label>
              <div class="d-flex align-items-center gap-2">
                <input
                  :value="guideFillColor"
                  class="form-control form-control-sm"
                  type="text"
                  @input="$emit('preview-fill-color', $event.target.value)"
                  @change="$emit('update-fill-color', $event.target.value)"
                />
                <input
                  :value="guideFillColor"
                  type="color"
                  class="form-control form-control-color"
                  aria-label="Color de relleno"
                  @input="$emit('preview-fill-color', $event.target.value)"
                  @change="$emit('update-fill-color', $event.target.value)"
                />
              </div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">Alpha relleno (0-100)</label>
              <div class="d-flex align-items-center gap-2">
                <input
                  class="form-range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="guideFill"
                  @input="$emit('preview-fill', Number($event.target.value))"
                  @change="$emit('update-fill', Number($event.target.value))"
                />
                <input
                  class="form-control form-control-sm"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  :value="guideFill"
                  @input="$emit('preview-fill', Number($event.target.value))"
                  @change="$emit('update-fill', Number($event.target.value))"
                />
              </div>
            </div>
          </div>

          <div v-if="fillPalette.length" class="row g-2 mt-2">
            <div class="col-12">
              <label class="form-label xsmall">Colores usados</label>
              <div class="fill-palette">
                <button
                  v-for="color in fillPalette"
                  :key="color"
                  class="fill-swatch"
                  type="button"
                  :title="color"
                  :style="{ backgroundColor: color }"
                  @click="$emit('apply-fill-palette', color)"
                ></button>
              </div>
            </div>
          </div>

          <div class="row g-2 mt-2">
            <div class="col-12 col-md-6">
              <label class="form-label xsmall">
                <i class="bi bi-aspect-ratio me-1"></i>Escala
              </label>
              <input
                :value="guideScale"
                class="form-control form-control-sm"
                type="number"
                step="0.05"
                min="0.2"
                max="4"
                @input="$emit('update-scale', Number($event.target.value))"
              />
            </div>
          </div>
        </div>
        <div v-else class="text-muted small mt-2">Selecciona una guia.</div>

        <div class="mt-2 d-flex justify-content-end">
          <button
            class="btn btn-sm btn-outline-secondary icon-btn"
            type="button"
            :title="unit === 'in' ? 'Unidad: in (cambiar a cm)' : 'Unidad: cm (cambiar a in)'"
            :aria-label="unit === 'in' ? 'Cambiar a cm' : 'Cambiar a in'"
            @click="$emit('toggle-unit')"
          >
            <i class="bi bi-rulers"></i>
          </button>
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
    const saved = localStorage.getItem('guide_panel_properties_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_properties_collapsed', String(value))
  } catch {
    // ignore
  }
})

defineProps({
  selectedGuide: { type: Object, default: null },
  unit: { type: String, default: 'cm' },
  guideRadiusX: { type: Number, default: 0 },
  guideRadiusY: { type: Number, default: 0 },
  guideRadiusXLabel: { type: String, default: '' },
  guideRadiusYLabel: { type: String, default: '' },
  guideLineWidth: { type: Number, default: 2 },
  guideLineStyle: { type: String, default: 'dashed' },
  guideScale: { type: Number, default: 1 },
  guideColor: { type: String, default: '' },
  guideAlpha: { type: Number, default: 100 },
  guideFillColor: { type: String, default: '#ffffff' },
  guideFill: { type: Number, default: 0 },
  fillPalette: { type: Array, default: () => [] },
})

defineEmits([
  'update-radius-x',
  'update-radius-y',
  'update-line-width',
  'update-line-style',
  'update-scale',
  'update-color',
  'update-alpha',
  'preview-color',
  'preview-alpha',
  'toggle-unit',
  'update-fill',
  'preview-fill',
  'update-fill-color',
  'preview-fill-color',
  'apply-fill-palette',
])
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
</style>
