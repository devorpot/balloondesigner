<template>
  <div class="card border-0 shadow-sm align-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title">Organizar</div>
        <button
          class="btn btn-sm btn-outline-secondary icon-btn"
          type="button"
          @click="collapsed = !collapsed"
          :title="collapsed ? 'Expandir' : 'Contraer'"
        >
          <i class="bi" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
        </button>
      </div>

      <div v-show="!collapsed" class="section">
        <div class="d-flex align-items-center justify-content-between">
          <div class="section-label">Alinear</div>
          <div class="form-check form-switch">
            <input
              id="align-to-canvas"
              v-model="alignToCanvas"
              class="form-check-input"
              type="checkbox"
              :disabled="symbolEditActive"
            />
            <label class="form-check-label small" for="align-to-canvas">
              <i class="bi bi-bounding-box me-1"></i>Canvas
            </label>
          </div>
        </div>
        <div class="row g-2 align-grid">
          <button
            @click="align('left')"
            class="btn btn-sm btn-outline-secondary"
            :class="{ active: lastAlign === 'left' }"
          >
            <i class="bi bi-align-start"></i>
          </button>
          <button
            @click="align('center-x')"
            class="btn btn-sm btn-outline-secondary"
            :class="{ active: lastAlign === 'center-x' }"
          >
            <i class="bi bi-align-center"></i>
          </button>
          <button
            @click="align('right')"
            class="btn btn-sm btn-outline-secondary"
            :class="{ active: lastAlign === 'right' }"
          >
            <i class="bi bi-align-end"></i>
          </button>
          <button
            @click="align('top')"
            class="btn btn-sm btn-outline-secondary"
            :class="{ active: lastAlign === 'top' }"
          >
            <i class="bi bi-align-top"></i>
          </button>
          <button
            @click="align('center-y')"
            class="btn btn-sm btn-outline-secondary"
            :class="{ active: lastAlign === 'center-y' }"
          >
            <i class="bi bi-align-middle"></i>
          </button>
          <button
            @click="align('bottom')"
            class="btn btn-sm btn-outline-secondary"
            :class="{ active: lastAlign === 'bottom' }"
          >
            <i class="bi bi-align-bottom"></i>
          </button>
        </div>
        <div class="text-muted small mt-2" v-if="!symbolEditActive">
          <span v-if="alignToCanvas">Alinea contra el canvas.</span>
          <span v-else>Alinea entre elementos.</span>
        </div>
      </div>

      <div v-show="!collapsed" class="section mt-3">
        <div class="section-label">Distribuir</div>
        <div class="row g-2 distribute-grid">
          <button
            @click="distribute('x')"
            class="btn btn-sm btn-outline-primary"
            :class="{ active: lastDistribute === 'x' }"
          >
            <i class="bi bi-distribute-horizontal"></i>
          </button>
          <button
            @click="distribute('y')"
            class="btn btn-sm btn-outline-primary"
            :class="{ active: lastDistribute === 'y' }"
          >
            <i class="bi bi-distribute-vertical"></i>
          </button>
        </div>
      </div>

      <div v-show="!collapsed" class="section mt-3">
        <div class="section-label">Transformar</div>
        <div class="row g-2 distribute-grid">
          <button
            @click="flip('x')"
            class="btn btn-sm btn-outline-secondary"
            :disabled="selectedCount < 1"
          >
            <i class="bi bi-arrow-left-right"></i>
          </button>
          <button
            @click="flip('y')"
            class="btn btn-sm btn-outline-secondary"
            :disabled="selectedCount < 1"
          >
            <i class="bi bi-arrow-up-down"></i>
          </button>
        </div>
      </div>

      <div v-show="!collapsed" class="section mt-3">
        <div class="section-label">Apilar seleccion</div>
        <div class="row g-2 align-grid">
          <button
            @click="toggleStackPreview"
            class="btn btn-sm btn-outline-secondary"
            :class="{ active: stackPreviewActive }"
          >
            Preview
          </button>
          <button
            @click="applyStackSelection"
            class="btn btn-sm btn-outline-primary"
            :disabled="selectedCount < 2"
          >
            Aplicar
          </button>
        </div>
        <div class="text-muted small mt-2">Usa la configuracion del apilado del canvas.</div>
      </div>

      <div v-show="!collapsed" class="text-muted small mt-2">
        <span v-if="symbolEditActive">Alinear a canvas desactivado en edicion de simbolo.</span>
        <span v-else-if="alignToCanvas && selectedCount < 1">Selecciona al menos 1 elemento.</span>
        <span v-else-if="!alignToCanvas && selectedCount < 2"
          >Selecciona al menos 2 elementos.</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useActiveEditorStore } from '@/stores/editor-context'

const store = useActiveEditorStore()
const selectedCount = computed(() => store.selectedNodes.length)
const collapsed = ref(false)
const lastAlign = ref('')
const lastDistribute = ref('')
const stackPreviewActive = computed(() => !!store.ui?.stackSelection?.preview)
const symbolEditActive = computed(() => !!store.ui?.symbolEdit?.active)
const alignToCanvas = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_align')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }

  try {
    const saved = localStorage.getItem('align_to_canvas')
    if (saved !== null) alignToCanvas.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('panel_collapsed_align', String(value))
  } catch {
    // ignore
  }
})

watch(alignToCanvas, (value) => {
  try {
    localStorage.setItem('align_to_canvas', String(value))
  } catch {
    // ignore
  }
})

function align(mode) {
  if (symbolEditActive.value) {
    if (selectedCount.value < 2) return
    store.alignSelection(mode)
    lastAlign.value = mode
    return
  }
  const minCount = alignToCanvas.value ? 1 : 2
  if (selectedCount.value < minCount) return
  store.alignSelection(mode, { alignToCanvas: alignToCanvas.value })
  lastAlign.value = mode
}

function distribute(axis) {
  if (selectedCount.value < 3) return
  store.distributeSelection(axis)
  lastDistribute.value = axis
}

function flip(axis) {
  if (selectedCount.value < 1) return
  store.flipSelection?.({ axis })
}

function toggleStackPreview() {
  store.setStackSelectionPreview?.(!stackPreviewActive.value)
}

function applyStackSelection() {
  if (selectedCount.value < 2) return
  const applied = store.stackSelectionGrid?.()
  if (applied) store.setStackSelectionPreview?.(false)
}
</script>

<style lang="less" scoped>
.align-panel {
  border-radius: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(0, 0, 0, 0.65);
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-outline-secondary.active,
.btn-outline-primary.active {
  background: #12a4b7;
  border-color: #12a4b7;
  color: #fff;
}

.align-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.distribute-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
</style>
