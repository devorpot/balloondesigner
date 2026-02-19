<template>
  <div class="card border-0 shadow-sm symbols-panel">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-1">
        <div>
          <div class="fw-bold">Simbolos</div>
          <div class="text-muted panel-subtitle">Instancias reutilizables</div>
        </div>
        <button
          class="btn btn-sm btn-outline-secondary icon-btn"
          type="button"
          @click="collapsed = !collapsed"
          :title="collapsed ? 'Expandir' : 'Contraer'"
        >
          <i class="bi" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
        </button>
      </div>

      <div v-if="!symbols.length" v-show="!collapsed" class="text-muted small">
        No hay simbolos.
      </div>

      <div
        v-else
        v-show="!collapsed"
        class="list"
        tabindex="0"
        @keydown="onListKeyDown"
        @click="$event.currentTarget?.focus?.()"
      >
        <div
          v-for="symbol in symbols"
          :key="symbol.id"
          class="row-item"
          :class="{ active: symbol.id === activeSymbolId }"
        >
          <button class="row-main" type="button" @click="selectSymbol(symbol)">
            <span class="dot dot-symbol"></span>
            <div class="flex-grow-1 minw0">
              <div class="fw-semibold text-truncate">
                <template v-if="editingId === symbol.id">
                  <input
                    :data-edit-id="`symbol-${symbol.id}`"
                    v-model="editingValue"
                    class="form-control form-control-sm"
                    type="text"
                    @keydown.enter.prevent="commitEdit(true)"
                    @keydown.esc.prevent="cancelEdit"
                    @blur="commitEdit"
                  />
                </template>
                <template v-else>
                  <span @dblclick.stop="startEdit(symbol)">{{ symbol.name }}</span>
                  <span class="text-muted small">· {{ symbol.count }}</span>
                </template>
              </div>
              <div class="text-muted small text-truncate">
                {{ symbol.count ? 'Instancias activas' : 'Sin instancias' }}
              </div>
            </div>
          </button>

          <button
            class="icon-btn"
            type="button"
            :disabled="!symbol.count"
            title="Editar simbolo"
            @click.stop="editSymbol(symbol)"
          >
            <i class="bi bi-pen"></i>
          </button>

          <button class="icon-btn" type="button" title="Renombrar" @click.stop="startEdit(symbol)">
            <i class="bi bi-pencil"></i>
          </button>

          <button
            class="icon-btn"
            type="button"
            title="Agregar instancia"
            @click.stop="addInstance(symbol)"
          >
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()
const collapsed = ref(false)

const symbols = computed(() => {
  const list = Array.isArray(store.symbols) ? store.symbols : []
  const instances = Array.isArray(store.nodes) ? store.nodes.filter((n) => n.kind === 'symbol') : []
  return list.map((s) => ({
    id: s.id,
    name: s.name || 'Simbolo',
    count: instances.filter((n) => String(n.symbolId) === String(s.id)).length,
  }))
})

const editingId = ref(null)
const editingValue = ref('')

const activeSymbolId = computed(() => {
  if (store.ui?.symbolEdit?.active) return store.ui.symbolEdit.symbolId
  if (store.selectedNode?.kind === 'symbol') return store.selectedNode.symbolId
  return null
})

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_symbols')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('panel_collapsed_symbols', String(value))
  } catch {
    // ignore
  }
})

function getStageSize(stage) {
  try {
    const width = typeof stage.width === 'function' ? stage.width() : stage.width
    const height = typeof stage.height === 'function' ? stage.height() : stage.height
    return { w: Number(width || 0), h: Number(height || 0) }
  } catch {
    return { w: 0, h: 0 }
  }
}

function getAddPoint() {
  const stage = store.stage
  const view = store.view || { x: 0, y: 0, scale: 1 }
  if (!stage) return { x: 200, y: 200 }

  const { w, h } = getStageSize(stage)
  const displayScale = Number(store.canvas?.displayScale || 1)
  const scale = Number(view.scale || 0) * displayScale
  if (!w || !h || !scale) return { x: 200, y: 200 }

  const dx = Number(view.x || 0) * displayScale
  const dy = Number(view.y || 0) * displayScale
  return { x: (w / 2 - dx) / scale, y: (h / 2 - dy) / scale }
}

function selectSymbol(symbol) {
  if (store.ui?.symbolEdit?.active) return
  const instance = (store.nodes || []).find(
    (n) => n.kind === 'symbol' && String(n.symbolId) === String(symbol.id),
  )
  if (instance) store.select(instance.id, { append: false })
}

function editSymbol(symbol) {
  if (store.ui?.symbolEdit?.active) return
  const instance = (store.nodes || []).find(
    (n) => n.kind === 'symbol' && String(n.symbolId) === String(symbol.id),
  )
  if (instance) store.enterSymbolEdit(instance.id)
}

function addInstance(symbol) {
  const p = getAddPoint()
  store.addSymbolInstance?.(symbol.id, { x: p.x, y: p.y })
}

function startEdit(symbol) {
  editingId.value = symbol.id
  editingValue.value = symbol.name || ''
  nextTick(() => {
    const el = document.querySelector(`[data-edit-id="symbol-${symbol.id}"]`)
    el?.focus?.()
    el?.select?.()
  })
}

function cancelEdit() {
  editingId.value = null
  editingValue.value = ''
}

function commitEdit(advance = false) {
  const id = editingId.value
  if (!id) return
  store.updateSymbolName?.(id, editingValue.value)
  const order = symbols.value
  const idx = order.findIndex((s) => String(s.id) === String(id))
  cancelEdit()
  if (advance && idx >= 0) {
    const next = order[idx + 1]
    if (next) startEdit(next)
  }
}

function onListKeyDown(e) {
  if (isTypingTarget(e)) return
  if (e.key !== 'F2') return
  e.preventDefault()
  const id = activeSymbolId.value
  if (!id) return
  const symbol = symbols.value.find((s) => String(s.id) === String(id))
  if (symbol) startEdit(symbol)
}

function isTypingTarget(e) {
  const el = e?.target
  if (!el) return false
  const tag = (el.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}
</script>

<style lang="less" scoped>
.symbols-panel {
  border-radius: 16px;
}

.panel-subtitle {
  font-size: 0.72rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.row-item.active {
  border-color: rgba(18, 164, 183, 0.4);
  background: rgba(18, 164, 183, 0.08);
}

.row-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 4px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot-symbol {
  background: #12a4b7;
  box-shadow: 0 0 0 2px rgba(18, 164, 183, 0.15);
}

.icon-btn {
  border: 0;
  background: transparent;
  color: #6c7a89;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: rgba(18, 164, 183, 0.12);
  color: #0b7f8d;
}

.minw0 {
  min-width: 0;
}
</style>
