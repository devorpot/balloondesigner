<template>
  <div class="card border-0 shadow-sm">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-1">
        <div>
          <div class="fw-bold">Capas</div>
          <div class="text-muted small">Arrastra para reordenar</div>
        </div>
      </div>

      <div v-if="items.length === 0" class="text-muted small">
        No hay elementos.
      </div>

      <div v-else ref="listEl" class="list">
        <button
          v-for="it in items"
          :key="it.id"
          class="row-item"
          :class="{ active: it.id === store.selectedId }"
          type="button"
          :data-id="it.id"
          @click="store.select(it.id)"
        >
          <span class="dot" :style="{ background: it.color }"></span>

          <div class="flex-grow-1 minw0">
            <div class="fw-semibold text-truncate">{{ it.name }}</div>
            <div class="text-muted small text-truncate">
              x:{{ round1(it.x) }} y:{{ round1(it.y) }}
            </div>
          </div>

          <button class="icon-btn" type="button" @click.stop="store.toggleVisible(it.id)">
            <i class="bi" :class="it.visible ? 'bi-eye' : 'bi-eye-slash'"></i>
          </button>

          <button class="icon-btn" type="button" @click.stop="store.toggleLock(it.id)">
            <i class="bi" :class="it.locked ? 'bi-lock-fill' : 'bi-unlock'"></i>
          </button>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Sortable from 'sortablejs'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()
const listEl = ref(null)
let sortable = null

// UI: frente arriba => invertimos array (asumiendo que final del array = frente)
const items = computed(() => {
  const arr = [...store.nodes].reverse()
  return arr.map((n, idx) => ({
    id: n.id,
    name: `Globo ${arr.length - idx}`,
    x: n.x,
    y: n.y,
    color: n.color || 'rgba(0,0,0,.08)',
    visible: n.visible !== false,
    locked: !!n.locked,
  }))
})

function setupSortable() {
  if (!listEl.value) return

  if (sortable) {
    sortable.destroy()
    sortable = null
  }

  sortable = new Sortable(listEl.value, {
    animation: 150,
    draggable: '.row-item',
    ghostClass: 'row-ghost',
    onEnd() {
      const idsFrontToBack = [...listEl.value.querySelectorAll('.row-item')]
        .map((el) => el.dataset.id)
        .filter(Boolean)

      // store wants back-to-front
      const idsBackToFront = [...idsFrontToBack].reverse()
      store.reorderByIds(idsBackToFront)
    },
  })
}

onMounted(async () => {
  await nextTick()
  setupSortable()
})

onBeforeUnmount(() => {
  if (sortable) sortable.destroy()
  sortable = null
})

// Cuando cambie el número de nodos, refresca Sortable
watch(
  () => store.nodes.length,
  async () => {
    await nextTick()
    setupSortable()
  }
)

function round1(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 10) / 10
}
</script>

<style lang="less" scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-item {
  width: 100%;
  border: 1px solid rgba(0,0,0,.08);
  background: #fff;
  border-radius: 14px;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;

  &:hover {
    border-color: rgba(0,0,0,.16);
    background: rgba(0,0,0,.01);
  }

  &.active {
    border-color: rgba(13,110,253,.35);
    background: rgba(13,110,253,.05);
  }
}

.dot {
  width: 18px;
  height: 18px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,.08);
  flex: 0 0 auto;
}

.minw0 {
  min-width: 0;
}

.icon-btn {
  border: 1px solid rgba(0,0,0,.08);
  background: #fff;
  border-radius: 12px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: rgba(0,0,0,.16);
    background: rgba(0,0,0,.03);
  }
}

:deep(.row-ghost) {
  opacity: 0.55;
}
</style>
