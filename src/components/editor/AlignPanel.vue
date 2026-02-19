<template>
  <div class="card border-0 shadow-sm align-panel">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="fw-bold">Organizar</div>
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
        <div class="section-label">Alinear</div>
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

      <div v-show="!collapsed" v-if="selectedCount < 2" class="text-muted small mt-2">
        Selecciona al menos 2 elementos.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()
const selectedCount = computed(() => store.selectedNodes.length)
const collapsed = ref(false)
const lastAlign = ref('')
const lastDistribute = ref('')
const stackPreviewActive = computed(() => !!store.ui?.stackSelection?.preview)

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_align')
    if (saved !== null) collapsed.value = saved === 'true'
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

function align(mode) {
  if (selectedCount.value < 2) return
  store.alignSelection(mode)
  lastAlign.value = mode
}

function distribute(axis) {
  if (selectedCount.value < 3) return
  store.distributeSelection(axis)
  lastDistribute.value = axis
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
