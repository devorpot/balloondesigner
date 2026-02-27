<template>
  <div class="card border-0 shadow-sm panel-card guide-panel">
    <div class="card-body panel-body">
      <div class="panel-head">
        <div class="panel-title"><i class="bi bi-layers me-2"></i>Objetos</div>
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
        <div v-if="symbolEditActive" class="text-muted panel-subtitle">
          Editando simbolo: {{ symbolEditName }}
        </div>

        <div v-if="!symbolEditActive && groupItems.length" class="object-section">
          <div class="object-section__title">Grupos</div>
          <div class="object-list">
            <div v-for="group in groupItems" :key="group.id" class="object-group">
              <div class="object-row group" @click="selectGroup(group.id)">
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  @click.stop="toggleGroup(group.id)"
                >
                  <i
                    class="bi"
                    :class="groupOpen(group.id) ? 'bi-chevron-down' : 'bi-chevron-right'"
                  ></i>
                </button>
                <div class="object-label">
                  {{ group.name }}
                  <span class="text-muted xsmall">({{ group.nodes.length }})</span>
                </div>
                <div class="object-actions">
                  <button
                    class="btn btn-sm btn-outline-secondary icon-btn"
                    type="button"
                    title="Traer adelante"
                    :disabled="reorderDisabled"
                    @click.stop="bringGroupForward(group)"
                  >
                    <i class="bi bi-layer-forward"></i>
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary icon-btn"
                    type="button"
                    title="Enviar atras"
                    :disabled="reorderDisabled"
                    @click.stop="sendGroupBackward(group)"
                  >
                    <i class="bi bi-layer-backward"></i>
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary icon-btn"
                    type="button"
                    title="Traer al frente"
                    :disabled="reorderDisabled"
                    @click.stop="bringGroupToFront(group)"
                  >
                    <i class="bi bi-front"></i>
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary icon-btn"
                    type="button"
                    title="Enviar al fondo"
                    :disabled="reorderDisabled"
                    @click.stop="sendGroupToBack(group)"
                  >
                    <i class="bi bi-back"></i>
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary icon-btn"
                    type="button"
                    :title="groupLocked(group) ? 'Desbloquear grupo' : 'Bloquear grupo'"
                    @click.stop="toggleGroupLock(group)"
                  >
                    <i class="bi" :class="groupLocked(group) ? 'bi-lock-fill' : 'bi-unlock'"></i>
                  </button>
                </div>
              </div>
              <div v-show="groupOpen(group.id)" class="object-children">
                <div
                  v-for="node in group.nodes"
                  :key="node.id"
                  class="object-row node"
                  :class="{ active: isSelected(node), muted: node.visible === false }"
                  @click="selectNode(node)"
                >
                  <div class="object-label" @dblclick.stop="startEdit(node)">
                    <template v-if="editingId === node.id">
                      <input
                        v-model.trim="editingValue"
                        class="form-control form-control-sm"
                        type="text"
                        @click.stop
                        @keydown.enter.prevent="commitEdit(node)"
                        @keydown.esc.prevent="cancelEdit"
                        @blur="commitEdit(node)"
                      />
                    </template>
                    <template v-else>
                      {{ nodeLabel(node) }}
                    </template>
                  </div>
                  <div class="object-actions">
                    <button
                      class="btn btn-sm btn-outline-secondary icon-btn"
                      type="button"
                      title="Traer adelante"
                      :disabled="reorderDisabled"
                      @click.stop="bringNodeForward(node)"
                    >
                      <i class="bi bi-layer-forward"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary icon-btn"
                      type="button"
                      title="Enviar atras"
                      :disabled="reorderDisabled"
                      @click.stop="sendNodeBackward(node)"
                    >
                      <i class="bi bi-layer-backward"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary icon-btn"
                      type="button"
                      title="Traer al frente"
                      :disabled="reorderDisabled"
                      @click.stop="bringNodeToFront(node)"
                    >
                      <i class="bi bi-front"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary icon-btn"
                      type="button"
                      title="Enviar al fondo"
                      :disabled="reorderDisabled"
                      @click.stop="sendNodeToBack(node)"
                    >
                      <i class="bi bi-back"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary icon-btn"
                      type="button"
                      :title="node.visible === false ? 'Mostrar' : 'Ocultar'"
                      @click.stop="toggleNodeVisibility(node)"
                    >
                      <i class="bi" :class="node.visible === false ? 'bi-eye-slash' : 'bi-eye'"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary icon-btn"
                      type="button"
                      title="Renombrar"
                      @click.stop="startEdit(node)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary icon-btn"
                      type="button"
                      :title="node.locked ? 'Desbloquear' : 'Bloquear'"
                      @click.stop="toggleNodeLock(node)"
                    >
                      <i class="bi" :class="node.locked ? 'bi-lock-fill' : 'bi-unlock'"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="ungroupedNodes.length" class="object-section">
          <div class="object-section__title">
            {{ symbolEditActive ? 'Capas del simbolo' : 'Objetos' }}
          </div>
          <div class="object-list">
            <div
              v-for="node in ungroupedNodes"
              :key="node.id"
              class="object-row node"
              :class="{ active: isSelected(node), muted: node.visible === false }"
              @click="selectNode(node)"
            >
              <div class="object-label" @dblclick.stop="startEdit(node)">
                <template v-if="editingId === node.id">
                  <input
                    v-model.trim="editingValue"
                    class="form-control form-control-sm"
                    type="text"
                    @click.stop
                    @keydown.enter.prevent="commitEdit(node)"
                    @keydown.esc.prevent="cancelEdit"
                    @blur="commitEdit(node)"
                  />
                </template>
                <template v-else>
                  {{ nodeLabel(node) }}
                </template>
              </div>
              <div class="object-actions">
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  title="Traer adelante"
                  :disabled="reorderDisabled"
                  @click.stop="bringNodeForward(node)"
                >
                  <i class="bi bi-layer-forward"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  title="Enviar atras"
                  :disabled="reorderDisabled"
                  @click.stop="sendNodeBackward(node)"
                >
                  <i class="bi bi-layer-backward"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  title="Traer al frente"
                  :disabled="reorderDisabled"
                  @click.stop="bringNodeToFront(node)"
                >
                  <i class="bi bi-front"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  title="Enviar al fondo"
                  :disabled="reorderDisabled"
                  @click.stop="sendNodeToBack(node)"
                >
                  <i class="bi bi-back"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  :title="node.visible === false ? 'Mostrar' : 'Ocultar'"
                  @click.stop="toggleNodeVisibility(node)"
                >
                  <i class="bi" :class="node.visible === false ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  title="Renombrar"
                  @click.stop="startEdit(node)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary icon-btn"
                  type="button"
                  :title="node.locked ? 'Desbloquear' : 'Bloquear'"
                  @click.stop="toggleNodeLock(node)"
                >
                  <i class="bi" :class="node.locked ? 'bi-lock-fill' : 'bi-unlock'"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!groupItems.length && !ungroupedNodes.length" class="text-muted small">
          Sin objetos.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useActiveEditorStore } from '@/stores/editor-context'

const store = useActiveEditorStore()
const collapsed = ref(false)
const openGroups = ref({})
const editingId = ref(null)
const editingValue = ref('')

const symbolEditActive = computed(() => !!store.ui?.symbolEdit?.active)
const reorderDisabled = computed(() => false)
const symbolEditName = computed(() => {
  const edit = store.ui?.symbolEdit
  if (!edit?.active) return ''
  const symbol = (store.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
  return symbol?.name || 'Simbolo'
})

const rawNodes = computed(() => {
  if (!symbolEditActive.value) return store.nodes || []
  const edit = store.ui?.symbolEdit
  const symbol = (store.symbols || []).find((s) => String(s.id) === String(edit?.symbolId))
  return symbol?.nodes || []
})

const groupList = computed(() => (symbolEditActive.value ? [] : store.groups || []))
const nodesById = computed(() => new Map(rawNodes.value.map((n) => [String(n.id), n])))
const groupedIds = computed(() => {
  const set = new Set()
  for (const group of groupList.value) {
    for (const id of group?.childIds || []) set.add(String(id))
  }
  return set
})

const groupItems = computed(() => {
  return (groupList.value || [])
    .map((group, index) => {
      const nodes = (group.childIds || [])
        .map((id) => nodesById.value.get(String(id)))
        .filter(Boolean)
      return {
        id: group.id,
        name: group.name || `Grupo ${index + 1}`,
        nodes,
      }
    })
    .filter((group) => group.nodes.length)
})

const ungroupedNodes = computed(() => {
  return (rawNodes.value || []).filter((n) => !groupedIds.value.has(String(n.id)))
})

const selectedSet = computed(() => {
  if (symbolEditActive.value) return new Set(store.ui?.symbolEdit?.selectedIds || [])
  return new Set(store.selectedIds || [])
})

onMounted(() => {
  try {
    const saved = localStorage.getItem('guide_panel_objects_collapsed')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('guide_panel_objects_collapsed', String(value))
  } catch {
    // ignore
  }
})

function nodeLabel(node) {
  if (node?.name) return node.name
  if (node?.kind === 'symbol') return 'Simbolo'
  if (node?.kind === 'text') return 'Texto'
  if (node?.kind === 'image') return 'Imagen'
  return node?.meta?.guideLine ? 'Guia' : 'Globo'
}

function isSelected(node) {
  return selectedSet.value.has(node.id)
}

function selectNode(node) {
  if (!node) return
  if (editingId.value === node.id) return
  if (symbolEditActive.value) {
    store.selectSymbolNode?.(node.id, { append: false })
    return
  }
  store.select(node.id, { append: false })
}

function selectGroup(groupId) {
  if (!groupId || symbolEditActive.value) return
  store.selectGroup?.(groupId)
}

function toggleNodeLock(node) {
  if (!node) return
  store.updateNode(node.id, { locked: !node.locked })
}

function toggleNodeVisibility(node) {
  if (!node) return
  const next = node.visible === false
  store.updateNode(node.id, { visible: next })
}

function toggleGroup(id) {
  openGroups.value = {
    ...openGroups.value,
    [id]: !openGroups.value[id],
  }
}

function groupOpen(id) {
  return !!openGroups.value[id]
}

function groupLocked(group) {
  return group.nodes.every((n) => n.locked)
}

function toggleGroupLock(group) {
  const next = !groupLocked(group)
  store.beginHistoryBatch()
  try {
    for (const node of group.nodes) {
      store.updateNode(node.id, { locked: next })
    }
  } finally {
    store.endHistoryBatch()
  }
}

function bringNodeToFront(node) {
  if (!node) return
  if (symbolEditActive.value) {
    store.selectSymbolNode?.(node.id, { append: false })
  } else {
    store.select(node.id, { append: false })
  }
  store.bringToFrontSelected?.()
}

function sendNodeToBack(node) {
  if (!node) return
  if (symbolEditActive.value) {
    store.selectSymbolNode?.(node.id, { append: false })
  } else {
    store.select(node.id, { append: false })
  }
  store.sendToBackSelected?.()
}

function bringNodeForward(node) {
  if (!node) return
  if (symbolEditActive.value) {
    store.selectSymbolNode?.(node.id, { append: false })
  } else {
    store.select(node.id, { append: false })
  }
  store.bringForwardSelected?.()
}

function sendNodeBackward(node) {
  if (!node) return
  if (symbolEditActive.value) {
    store.selectSymbolNode?.(node.id, { append: false })
  } else {
    store.select(node.id, { append: false })
  }
  store.sendBackwardSelected?.()
}

function bringGroupToFront(group) {
  if (!group?.nodes?.length) return
  const ids = group.nodes.map((n) => n.id)
  store.setSelection(ids)
  store.bringToFrontSelected?.()
}

function sendGroupToBack(group) {
  if (!group?.nodes?.length) return
  const ids = group.nodes.map((n) => n.id)
  store.setSelection(ids)
  store.sendToBackSelected?.()
}

function bringGroupForward(group) {
  if (!group?.nodes?.length) return
  const ids = group.nodes.map((n) => n.id)
  store.setSelection(ids)
  store.bringForwardSelected?.()
}

function sendGroupBackward(group) {
  if (!group?.nodes?.length) return
  const ids = group.nodes.map((n) => n.id)
  store.setSelection(ids)
  store.sendBackwardSelected?.()
}

function startEdit(node) {
  if (!node) return
  editingId.value = node.id
  editingValue.value = String(node.name || '')
}

function cancelEdit() {
  editingId.value = null
  editingValue.value = ''
}

function commitEdit(node) {
  if (!node || editingId.value !== node.id) {
    cancelEdit()
    return
  }
  const next = String(editingValue.value || '').trim()
  store.updateNode(node.id, { name: next })
  cancelEdit()
}
</script>

<style scoped>
.object-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.object-section__title {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.object-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.object-row {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  cursor: pointer;
}

.object-row.group {
  background: #f7f8fb;
}

.object-row.active {
  border-color: rgba(13, 110, 253, 0.35);
  background: rgba(13, 110, 253, 0.06);
}

.object-row.muted {
  opacity: 0.6;
}

.object-label {
  flex: 1;
  font-size: 0.78rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.object-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.object-label .form-control {
  height: 28px;
  font-size: 0.75rem;
  padding: 0 6px;
}

.object-children {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  margin-left: 18px;
}
</style>
