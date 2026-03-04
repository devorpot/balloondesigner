<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title">Color y opacidad</div>
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
        <div>
          <label class="form-label small">Color relleno</label>
          <div class="d-flex align-items-center gap-2">
            <input
              :value="color"
              class="form-control form-control-sm"
              type="text"
              @change="$emit('update-color', $event.target.value)"
            />
            <input
              :value="color"
              type="color"
              class="form-control form-control-color"
              aria-label="Color de relleno"
              @change="$emit('update-color', $event.target.value)"
            />
          </div>
        </div>

        <div>
          <label class="form-label small">Opacidad relleno (%)</label>
          <div class="d-flex align-items-center gap-2">
            <input
              class="form-range"
              type="range"
              min="0"
              max="100"
              step="1"
              :value="alphaValue"
              @input="$emit('update-alpha', $event.target.value)"
            />
            <input
              class="form-control form-control-sm"
              type="number"
              min="0"
              max="100"
              step="1"
              :value="alphaValue"
              @input="$emit('update-alpha', $event.target.value)"
            />
          </div>
        </div>

        <div v-if="palette.length" class="mt-2">
          <label class="form-label small">Colores usados</label>
          <div class="fill-palette">
            <button
              v-for="swatch in palette"
              :key="swatch"
              class="fill-swatch"
              type="button"
              :title="swatch"
              :style="{ background: swatch }"
              @click="$emit('pick-palette', swatch)"
            ></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const collapsed = ref(false)

const props = defineProps({
  color: { type: String, default: '#ffffff' },
  alpha: { type: Number, default: 100 },
  palette: { type: Array, default: () => [] },
})

const alphaValue = computed(() => {
  const next = Number(props.alpha)
  if (!Number.isFinite(next)) return 100
  return Math.min(100, Math.max(0, Math.round(next)))
})

defineEmits(['update-color', 'update-alpha', 'pick-palette'])
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
