<template>
  <div class="card border-0 shadow-sm">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div>
          <div class="fw-bold">Historial</div>
          <div class="text-muted panel-subtitle">Ultimas acciones</div>
        </div>
        <div class="btn-group btn-group-sm" role="group">
          <button
            class="btn btn-outline-secondary"
            type="button"
            :disabled="!canUndo"
            @click="store.undo()"
            title="Deshacer"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <button
            class="btn btn-outline-secondary"
            type="button"
            :disabled="!canRedo"
            @click="store.redo()"
            title="Rehacer"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <div v-if="!items.length" class="text-muted small">Sin historial.</div>

      <div v-else class="history-list">
        <button
          v-for="item in items"
          :key="item.index"
          class="history-item"
          :class="{ active: item.index === currentIndex }"
          type="button"
          :disabled="item.index === currentIndex"
          @click="store.goToHistoryIndex(item.index)"
        >
          <div class="fw-semibold">{{ item.label }}</div>
          <div class="text-muted xsmall">{{ item.time || '—' }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()

const past = computed(() => store.history?.past || [])
const currentIndex = computed(() => Math.max(0, past.value.length - 1))
const items = computed(() => {
  return past.value
    .map((snap, idx) => {
      const ts = snap?.meta?.timestamp
      const time = ts ? new Date(ts).toLocaleTimeString() : ''
      return {
        index: idx,
        label: snap?.meta?.label || `Paso ${idx + 1}`,
        time,
      }
    })
    .reverse()
})

const canUndo = computed(() => past.value.length > 1)
const canRedo = computed(() => (store.history?.future || []).length > 0)
</script>

<style scoped>
.panel-subtitle {
  font-size: 0.72rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow: auto;
}

.history-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 8px 10px;
  text-align: left;
  background: #fff;
}

.history-item.active {
  border-color: rgba(13, 110, 253, 0.3);
  background: rgba(13, 110, 253, 0.06);
}
</style>
