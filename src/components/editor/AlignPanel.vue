<template>
  <div class="card border-0 shadow-sm align-panel">
    <div class="card-body">
      <div class="fw-bold mb-2">Alinear / Distribuir</div>

      <div class="grid">
        <!-- Horizontal -->
        <button @click="align('left')" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-align-start"></i>
        </button>

        <button @click="align('center-x')" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-align-center"></i>
        </button>

        <button @click="align('right')" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-align-end"></i>
        </button>

        <!-- Vertical -->
        <button @click="align('top')" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-align-top"></i>
        </button>

        <button @click="align('center-y')" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-align-middle"></i>
        </button>

        <button @click="align('bottom')" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-align-bottom"></i>
        </button>

        <!-- Distribution -->
        <button @click="distribute('x')" class="btn btn-sm btn-outline-primary">
          <i class="bi bi-distribute-horizontal"></i>
        </button>

        <button @click="distribute('y')" class="btn btn-sm btn-outline-primary">
          <i class="bi bi-distribute-vertical"></i>
        </button>
      </div>

      <div v-if="selectedCount < 2" class="text-muted small mt-2">
        Selecciona al menos 2 elementos.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()
const selectedCount = computed(() => store.selectedIds.length)

function align(mode) {
  if (selectedCount.value < 2) return
  store.alignSelection(mode)
}

function distribute(axis) {
  if (selectedCount.value < 3) return
  store.distributeSelection(axis)
}
</script>

<style lang="less" scoped>
.align-panel {
  border-radius: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
</style>
