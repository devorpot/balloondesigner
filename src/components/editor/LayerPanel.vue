<template>
  <div class="card border-0 shadow-sm">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-1">
        <div>
          <div class="fw-bold">Capas</div>
          <div class="text-muted panel-subtitle">Arrastra para reordenar</div>
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

      <div v-if="rows.length === 0" v-show="!collapsed" class="text-muted small">
        No hay elementos.
      </div>

      <div
        v-else
        v-show="!collapsed"
        ref="listEl"
        class="list"
        tabindex="0"
        @keydown="onListKeyDown"
        @click="listEl?.focus?.()"
      >
        <!-- Top-level rows (draggables) -->
        <template v-for="row in rows" :key="row.key">
          <div
            class="row-item"
            :class="{ active: row.active }"
            :data-id="row.dataId"
            :data-type="row.type"
          >
            <!-- Row main button (selection) -->
            <button class="row-main" type="button" @click="onRowClick(row)">
              <template v-if="row.type === 'group'">
                <button
                  class="chev-btn"
                  type="button"
                  @click.stop="toggleGroup(row.groupId)"
                  :title="isGroupOpen(row.groupId) ? 'Contraer' : 'Expandir'"
                >
                  <i
                    class="bi"
                    :class="isGroupOpen(row.groupId) ? 'bi-caret-down-fill' : 'bi-caret-right-fill'"
                  ></i>
                </button>

                <span class="dot dot-group"></span>

                <div class="flex-grow-1 minw0">
                  <div class="fw-semibold text-truncate">
                    <template v-if="editing.type === 'group' && editing.id === String(row.groupId)">
                      <input
                        :data-edit-id="`group-${row.groupId}`"
                        v-model="editingValue"
                        class="form-control form-control-sm"
                        type="text"
                        @keydown.enter.prevent="commitEdit(true)"
                        @keydown.esc.prevent="cancelEdit"
                        @blur="commitEdit"
                      />
                    </template>
                    <template v-else>
                      <span @dblclick.stop="startEdit('group', row.groupId, row.name)">{{
                        row.name
                      }}</span>
                      <span class="text-muted small">· {{ row.childCount }}</span>
                    </template>
                  </div>
                  <div class="text-muted small text-truncate">
                    {{ row.lockedInfo }} · {{ row.visibleInfo }}
                  </div>
                </div>
              </template>

              <template v-else-if="row.type === 'symbol'">
                <button
                  class="chev-btn"
                  type="button"
                  @click.stop="toggleSymbol(row.id)"
                  :title="isSymbolOpen(row.id) ? 'Contraer' : 'Expandir'"
                >
                  <i
                    class="bi"
                    :class="isSymbolOpen(row.id) ? 'bi-caret-down-fill' : 'bi-caret-right-fill'"
                  ></i>
                </button>

                <span class="dot dot-symbol"></span>

                <div class="flex-grow-1 minw0">
                  <div class="fw-semibold text-truncate">
                    <template v-if="editing.type === 'symbol' && editing.id === String(row.id)">
                      <input
                        :data-edit-id="`symbol-${row.id}`"
                        v-model="editingValue"
                        class="form-control form-control-sm"
                        type="text"
                        @keydown.enter.prevent="commitEdit(true)"
                        @keydown.esc.prevent="cancelEdit"
                        @blur="commitEdit"
                      />
                    </template>
                    <template v-else>
                      <i class="bi me-1" :class="iconForKind('symbol')"></i>
                      <span @dblclick.stop="startEdit('symbol', row.id, row.name)">{{
                        row.name
                      }}</span>
                      <span class="text-muted small">· {{ row.childCount }}</span>
                    </template>
                  </div>
                  <div class="text-muted small text-truncate">
                    {{ row.lockedInfo }} · {{ row.visibleInfo }}
                  </div>
                </div>
              </template>

              <template v-else>
                <span class="dot" :style="{ background: row.color }"></span>

                <div class="flex-grow-1 minw0">
                  <div class="fw-semibold text-truncate">
                    <template v-if="editing.type === 'node' && editing.id === String(row.id)">
                      <input
                        :data-edit-id="`node-${row.id}`"
                        v-model="editingValue"
                        class="form-control form-control-sm"
                        type="text"
                        @keydown.enter.prevent="commitEdit(true)"
                        @keydown.esc.prevent="cancelEdit"
                        @blur="commitEdit"
                      />
                    </template>
                    <template v-else>
                      <i class="bi me-1" :class="iconForKind(row.kind)"></i>
                      <span @dblclick.stop="startEdit('node', row.id, row.name)">{{
                        row.name
                      }}</span>
                    </template>
                  </div>
                  <div class="text-muted small text-truncate">
                    x:{{ round1(row.x) }} y:{{ round1(row.y) }}
                  </div>
                </div>
              </template>
            </button>

            <!-- Actions -->
            <button
              class="icon-btn"
              type="button"
              @click.stop="toggleVisibleRow(row)"
              :title="row.type === 'group' ? 'Mostrar/ocultar grupo' : 'Mostrar/ocultar'"
            >
              <i class="bi" :class="row.visible ? 'bi-eye' : 'bi-eye-slash'"></i>
            </button>

            <button
              class="icon-btn"
              type="button"
              @click.stop="toggleLockRow(row)"
              :title="row.type === 'group' ? 'Bloquear/desbloquear grupo' : 'Bloquear/desbloquear'"
            >
              <i class="bi" :class="row.locked ? 'bi-lock-fill' : 'bi-unlock'"></i>
            </button>

            <button
              class="icon-btn"
              type="button"
              title="Renombrar"
              @click.stop="
                startEdit(row.type, row.type === 'group' ? row.groupId : row.id, row.name)
              "
            >
              <i class="bi bi-pencil"></i>
            </button>
          </div>

          <!-- Group children (inline) -->
          <div v-if="row.type === 'group' && isGroupOpen(row.groupId)" class="group-children">
            <template v-for="child in row.children" :key="child.key">
              <button
                v-if="child.type !== 'symbol'"
                class="child-item"
                :class="{ active: child.id === store.selectedId }"
                type="button"
                :data-id="String(child.id)"
                :data-group="String(row.groupId)"
                @click="store.select(child.id)"
              >
                <span class="dot dot-child" :style="{ background: child.color }"></span>

                <div class="flex-grow-1 minw0">
                  <div class="fw-semibold text-truncate">
                    <template v-if="editing.type === 'node' && editing.id === String(child.id)">
                      <input
                        :data-edit-id="`node-${child.id}`"
                        v-model="editingValue"
                        class="form-control form-control-sm"
                        type="text"
                        @keydown.enter.prevent="commitEdit(true)"
                        @keydown.esc.prevent="cancelEdit"
                        @blur="commitEdit"
                      />
                    </template>
                    <template v-else>
                      <i class="bi me-1" :class="iconForKind(child.kind)"></i>
                      <span @dblclick.stop="startEdit('node', child.id, child.name)">{{
                        child.name
                      }}</span>
                    </template>
                  </div>
                  <div class="text-muted small text-truncate">
                    x:{{ round1(child.x) }} y:{{ round1(child.y) }}
                  </div>
                </div>

                <button
                  class="icon-btn icon-btn-sm"
                  type="button"
                  @click.stop="store.toggleVisible(child.id)"
                >
                  <i class="bi" :class="child.visible ? 'bi-eye' : 'bi-eye-slash'"></i>
                </button>

                <button
                  class="icon-btn icon-btn-sm"
                  type="button"
                  @click.stop="store.toggleLock(child.id)"
                >
                  <i class="bi" :class="child.locked ? 'bi-lock-fill' : 'bi-unlock'"></i>
                </button>
              </button>

              <div v-else class="symbol-child">
                <button
                  class="child-item"
                  :class="{ active: child.id === store.selectedId }"
                  type="button"
                  @click="onSymbolRowClick(child)"
                >
                  <button
                    class="chev-btn"
                    type="button"
                    @click.stop="toggleSymbol(child.id)"
                    :title="isSymbolOpen(child.id) ? 'Contraer' : 'Expandir'"
                  >
                    <i
                      class="bi"
                      :class="isSymbolOpen(child.id) ? 'bi-caret-down-fill' : 'bi-caret-right-fill'"
                    ></i>
                  </button>
                  <span class="dot dot-symbol"></span>
                  <div class="flex-grow-1 minw0">
                    <div class="fw-semibold text-truncate">
                      <i class="bi me-1" :class="iconForKind('symbol')"></i>
                      <span @dblclick.stop="startEdit('symbol', child.id, child.name)">{{
                        child.name
                      }}</span>
                      <span class="text-muted small">· {{ child.childCount }}</span>
                    </div>
                    <div class="text-muted small text-truncate">
                      x:{{ round1(child.x) }} y:{{ round1(child.y) }}
                    </div>
                  </div>
                </button>

                <div v-if="isSymbolOpen(child.id)" class="symbol-children">
                  <button
                    v-for="symbolChild in child.children"
                    :key="symbolChild.id"
                    class="child-item child-symbol"
                    type="button"
                    @click="onSymbolChildClick(child, symbolChild)"
                  >
                    <span class="dot dot-child" :style="{ background: symbolChild.color }"></span>
                    <div class="flex-grow-1 minw0">
                      <div class="fw-semibold text-truncate">
                        <template
                          v-if="
                            editing.type === 'symbol-child' && editing.id === String(symbolChild.id)
                          "
                        >
                          <input
                            :data-edit-id="`symbol-child-${symbolChild.id}`"
                            v-model="editingValue"
                            class="form-control form-control-sm"
                            type="text"
                            @keydown.enter.prevent="commitEdit(true)"
                            @keydown.esc.prevent="cancelEdit"
                            @blur="commitEdit"
                          />
                        </template>
                        <template v-else>
                          <i class="bi me-1" :class="iconForKind(symbolChild.kind)"></i>
                          <span
                            @dblclick.stop="
                              startEdit('symbol-child', symbolChild.id, symbolChild.name)
                            "
                          >
                            {{ symbolChild.name }}
                          </span>
                        </template>
                      </div>
                      <div class="text-muted small text-truncate">
                        x:{{ round1(symbolChild.x) }} y:{{ round1(symbolChild.y) }}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- Symbol children (inline) -->
          <div v-else-if="row.type === 'symbol' && isSymbolOpen(row.id)" class="group-children">
            <button
              v-for="child in row.children"
              :key="child.id"
              class="child-item"
              type="button"
              @click="onSymbolChildClick(row, child)"
            >
              <span class="dot dot-child" :style="{ background: child.color }"></span>
              <div class="flex-grow-1 minw0">
                <div class="fw-semibold text-truncate">
                  <template
                    v-if="editing.type === 'symbol-child' && editing.id === String(child.id)"
                  >
                    <input
                      :data-edit-id="`symbol-child-${child.id}`"
                      v-model="editingValue"
                      class="form-control form-control-sm"
                      type="text"
                      @keydown.enter.prevent="commitEdit(true)"
                      @keydown.esc.prevent="cancelEdit"
                      @blur="commitEdit"
                    />
                  </template>
                  <template v-else>
                    <i class="bi me-1" :class="iconForKind(child.kind)"></i>
                    <span @dblclick.stop="startEdit('symbol-child', child.id, child.name)">
                      {{ child.name }}
                    </span>
                  </template>
                </div>
                <div class="text-muted small text-truncate">
                  x:{{ round1(child.x) }} y:{{ round1(child.y) }}
                </div>
              </div>
            </button>
          </div>
        </template>
      </div>

      <div v-show="!collapsed" class="mt-3 d-grid">
        <button
          class="btn btn-sm btn-outline-danger"
          type="button"
          :disabled="!canDelete"
          @click="deleteSelection"
        >
          <i class="bi bi-trash me-1"></i> Eliminar seleccion
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
const collapsed = ref(false)
let sortable = null

// UI: frente arriba => invertimos array (asumiendo que final del array = frente)
const nodesFrontToBack = computed(() => [...store.nodes].reverse())
const groupSortables = new Map()
// grupos abiertos (por UI)
const openGroups = ref(new Set())
const openSymbols = ref(new Set())
const editing = ref({ type: null, id: null })
const editingValue = ref('')

const canDelete = computed(() => {
  if (store.ui?.symbolEdit?.active) return (store.selectedNodes?.length || 0) > 0
  if (store.selectedGroupId) return true
  return (store.selectedIds?.length || 0) > 0
})

function isGroupOpen(groupId) {
  return openGroups.value.has(groupId)
}

function toggleGroup(groupId) {
  const set = new Set(openGroups.value)
  if (set.has(groupId)) set.delete(groupId)
  else set.add(groupId)
  openGroups.value = set
}

function isSymbolOpen(id) {
  return openSymbols.value.has(String(id))
}

function toggleSymbol(id) {
  const set = new Set(openSymbols.value)
  const key = String(id)
  if (set.has(key)) set.delete(key)
  else set.add(key)
  openSymbols.value = set
}

function isTypingTarget(e) {
  const el = e?.target
  if (!el) return false
  const tag = (el.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

function startEdit(type, id, currentName = '') {
  editing.value = { type, id: String(id) }
  editingValue.value = String(currentName || '')
  nextTick(() => {
    const el = document.querySelector(`[data-edit-id="${type}-${id}"]`)
    el?.focus?.()
    el?.select?.()
  })
}

function cancelEdit() {
  editing.value = { type: null, id: null }
  editingValue.value = ''
}

function commitEdit(advance = false) {
  const type = editing.value.type
  const id = editing.value.id
  const name = String(editingValue.value || '').trim()
  if (!type || !id) return cancelEdit()

  if (type === 'group') store.updateGroupName?.(id, name)
  if (type === 'node') store.updateNodeName?.(id, name)
  if (type === 'symbol') store.updateSymbolName?.(id, name)
  if (type === 'symbol-child') store.updateNodeName?.(id, name)

  const order = renameOrder.value
  const idx = order.findIndex((entry) => entry.type === type && String(entry.id) === String(id))
  cancelEdit()
  if (advance && idx >= 0) {
    const next = order[idx + 1]
    if (next) startEdit(next.type, next.id, next.name)
  }
}

const childIdsByGroup = computed(() => {
  // source of truth: store.groups[].childIds
  const m = new Map()
  for (const g of store.groups || []) {
    const ids = Array.isArray(g.childIds) ? g.childIds.slice() : []
    m.set(g.id, ids)
  }
  return m
})

const symbolsById = computed(() => new Map((store.symbols || []).map((s) => [String(s.id), s])))

const nodeById = computed(() => {
  const m = new Map()
  for (const n of store.nodes) m.set(String(n.id), n)
  return m
})

function iconForKind(kind) {
  if (kind === 'text') return 'bi-fonts'
  if (kind === 'image') return 'bi-image'
  if (kind === 'symbol') return 'bi-stars'
  return 'bi-circle-fill'
}

function labelForNode(n, fallback) {
  if (n?.kind === 'symbol') {
    const symbol = symbolsById.value.get(String(n.symbolId))
    return symbol?.name || fallback || 'Simbolo'
  }
  const custom = typeof n?.name === 'string' ? n.name.trim() : ''
  return custom || fallback
}

function colorForNode(n) {
  if (n?.kind === 'symbol') return '#12a4b7'
  return n?.color || 'rgba(0,0,0,.08)'
}

// top-level rows: grupos + elementos no agrupados
const rows = computed(() => {
  const rows = []

  // 1) calcular ids agrupados
  const groupedIds = new Set()
  for (const [, ids] of childIdsByGroup.value.entries()) {
    for (const id of ids) groupedIds.add(String(id))
  }

  // 2) construir grupos (mostrados como bloque)
  // Orden de grupo: lo deducimos por el primer hijo en el stack front->back
  const groups = (store.groups || []).map((g) => {
    const ids = childIdsByGroup.value.get(g.id) || []
    const childrenNodes = ids.map((id) => nodeById.value.get(String(id))).filter(Boolean)

    const anyVisible = childrenNodes.some((n) => n.visible !== false)
    const allVisible = childrenNodes.length ? childrenNodes.every((n) => n.visible !== false) : true
    const anyLocked = childrenNodes.some((n) => !!n.locked)
    const allLocked = childrenNodes.length ? childrenNodes.every((n) => !!n.locked) : false

    // name
    const name = g.name || `Grupo`

    // children list in front->back order (same as UI)
    const orderedIds = (ids || []).map(String)
    const childrenFrontToBack = orderedIds
      .map((id) => nodeById.value.get(String(id)))
      .filter(Boolean)
      .map((n, idx, arr) => {
        if (n.kind === 'symbol') {
          return {
            type: 'symbol',
            key: `child_${n.id}`,
            id: n.id,
            kind: n.kind,
            name: labelForNode(n, `Simbolo ${arr.length - idx}`),
            x: n.x,
            y: n.y,
            color: colorForNode(n),
            visible: n.visible !== false,
            locked: !!n.locked,
            childCount: symbolChildrenForInstance(n).length,
            children: symbolChildrenForInstance(n),
          }
        }
        return {
          type: 'node',
          key: `child_${n.id}`,
          id: n.id,
          kind: n.kind,
          name: labelForNode(n, `Globo ${arr.length - idx}`),
          x: n.x,
          y: n.y,
          color: colorForNode(n),
          visible: n.visible !== false,
          locked: !!n.locked,
        }
      })
    return {
      type: 'group',
      key: `group_${g.id}`,
      dataId: `group:${g.id}`,
      groupId: g.id,
      name,
      childCount: childrenNodes.length,
      visible: anyVisible, // para icono (si alguno visible, mostramos eye)
      locked: allLocked, // para icono (si todos locked, lock-fill)
      lockedInfo: allLocked ? 'Bloqueado' : anyLocked ? 'Parcial' : 'Libre',
      visibleInfo: allVisible ? 'Visible' : anyVisible ? 'Parcial' : 'Oculto',
      active: String(store.selectedGroupId) === String(g.id),
      childIds: ids.map(String),
      children: childrenFrontToBack,
    }
  })

  // 3) elementos no agrupados (front->back)
  const ungrouped = nodesFrontToBack.value
    .filter((n) => !groupedIds.has(String(n.id)) && !n.groupId)
    .map((n, idx, arr) => ({
      type: n.kind === 'symbol' ? 'symbol' : 'node',
      key: `node_${n.id}`,
      dataId: String(n.id),
      id: n.id,
      kind: n.kind,
      name: labelForNode(n, `Globo ${arr.length - idx}`),
      x: n.x,
      y: n.y,
      color: colorForNode(n),
      visible: n.visible !== false,
      locked: !!n.locked,
      active: n.id === store.selectedId,
      childCount: n.kind === 'symbol' ? symbolChildrenForInstance(n).length : 0,
      lockedInfo: n.locked ? 'Bloqueado' : 'Libre',
      visibleInfo: n.visible !== false ? 'Visible' : 'Oculto',
      children: n.kind === 'symbol' ? symbolChildrenForInstance(n) : [],
    }))

  // 4) combinar rows en el orden del stack (front->back)
  // Para que los grupos aparezcan en el lugar “aprox” correcto, los insertamos
  // donde aparezca el primer hijo en el stack front->back.
  const frontIds = nodesFrontToBack.value.map((n) => String(n.id))

  // calcular posición front->back de cada grupo (min index de sus hijos)
  const groupPos = new Map()
  for (const g of groups) {
    const indices = g.childIds.map((id) => frontIds.indexOf(String(id))).filter((i) => i >= 0)
    groupPos.set(String(g.groupId), indices.length ? Math.min(...indices) : 999999)
  }

  // armar “slots” con grupos + ungrouped, luego ordenar por posición
  const merged = []

  for (const g of groups) {
    merged.push({ pos: groupPos.get(String(g.groupId)) ?? 999999, row: g })
  }

  // para ungrouped, pos es su index en stack front->back
  for (const r of ungrouped) {
    const p = frontIds.indexOf(String(r.id))
    merged.push({ pos: p >= 0 ? p : 999999, row: r })
  }

  merged.sort((a, b) => a.pos - b.pos)

  for (const it of merged) rows.push(it.row)

  return rows
})

const renameOrder = computed(() => {
  const list = []
  for (const row of rows.value) {
    if (row.type === 'group') {
      list.push({ type: 'group', id: row.groupId, name: row.name })
      if (isGroupOpen(row.groupId)) {
        for (const child of row.children || []) {
          if (child.type === 'symbol') {
            list.push({ type: 'symbol', id: child.id, name: child.name })
            if (isSymbolOpen(child.id)) {
              for (const sub of child.children || []) {
                list.push({ type: 'symbol-child', id: sub.id, name: sub.name })
              }
            }
          } else {
            list.push({ type: 'node', id: child.id, name: child.name })
          }
        }
      }
      continue
    }

    if (row.type === 'symbol') {
      list.push({ type: 'symbol', id: row.id, name: row.name })
      if (isSymbolOpen(row.id)) {
        for (const sub of row.children || []) {
          list.push({ type: 'symbol-child', id: sub.id, name: sub.name })
        }
      }
      continue
    }

    list.push({ type: 'node', id: row.id, name: row.name })
  }
  return list
})

function onListKeyDown(e) {
  if (isTypingTarget(e)) return
  if (e.key !== 'F2') return
  e.preventDefault()

  if (store.ui?.symbolEdit?.active && store.selectedNode) {
    startEdit('symbol-child', store.selectedNode.id, store.selectedNode.name)
    return
  }

  if (store.selectedGroupId) {
    const group = (store.groups || []).find((g) => String(g.id) === String(store.selectedGroupId))
    if (group) startEdit('group', group.id, group.name)
    return
  }

  if (store.selectedNode?.kind === 'symbol') {
    startEdit('symbol', store.selectedNode.id, store.selectedNode.name)
    return
  }

  if (store.selectedId) {
    startEdit('node', store.selectedId, store.selectedNode?.name || '')
  }
}

function deleteSelection() {
  store.deleteLayerSelection?.()
}

function symbolChildrenForInstance(instance) {
  const symbol = symbolsById.value.get(String(instance.symbolId))
  if (!symbol || !Array.isArray(symbol.nodes)) return []
  return symbol.nodes.map((n, idx, arr) => ({
    id: n.id,
    kind: n.kind,
    name: labelForNode(
      n,
      n.kind === 'text' ? 'Texto' : n.kind === 'image' ? 'Imagen' : `Globo ${arr.length - idx}`,
    ),
    x: n.x,
    y: n.y,
    color: colorForNode(n),
  }))
}

function onSymbolRowClick(row) {
  store.select(row.id, { append: false })
}

function onSymbolChildClick(row, child) {
  if (!row?.id || !child?.id) return
  store.enterSymbolEdit?.(row.id)
  store.selectSymbolNode?.(child.id, { append: false })
}

function setupSortable() {
  if (!listEl.value) return

  if (sortable) {
    sortable.destroy()
    sortable = null
  }

  sortable = new Sortable(listEl.value, {
    animation: 150,
    draggable: '.row-item', // solo top-level
    ghostClass: 'row-ghost',
    onEnd() {
      // Top-level order (front->back) from DOM
      const els = [...listEl.value.querySelectorAll('.row-item')]
      const order = els.map((el) => ({
        type: el.dataset.type,
        id: el.dataset.id,
      }))

      // Convert top-level (front->back) -> ids (back->front) for store
      // Expand groups into their child ids (manteniendo el orden actual en store)
      const idsFrontToBack = []

      for (const it of order) {
        if (it.type === 'group' && String(it.id || '').startsWith('group:')) {
          const gid = String(it.id).split(':')[1]
          const childIds = (childIdsByGroup.value.get(gid) || []).map(String)

          // usar el orden actual del stack (back->front o front->back) sin inventar:
          // aquí necesitamos ids en front->back, así que lo sacamos de nodesFrontToBack
          const childFrontToBack = nodesFrontToBack.value
            .filter((n) => childIds.includes(String(n.id)))
            .map((n) => String(n.id))

          idsFrontToBack.push(...childFrontToBack)
        } else {
          // node
          idsFrontToBack.push(String(it.id))
        }
      }

      // store wants back-to-front
      const idsBackToFront = [...idsFrontToBack].reverse()
      store.reorderByIds(idsBackToFront)
    },
  })
}

function setupGroupSortables() {
  // destruir existentes
  for (const s of groupSortables.values()) s.destroy()
  groupSortables.clear()

  // solo cuando hay grupos expandidos renderizados
  const containers = document.querySelectorAll('.group-children')

  containers.forEach((container) => {
    const first = container.querySelector('.child-item')
    const gid = first?.dataset?.group
    if (!gid) return

    const s = new Sortable(container, {
      animation: 150,
      draggable: '.child-item',
      ghostClass: 'row-ghost',
      onEnd() {
        const ids = [...container.querySelectorAll('.child-item')].map((el) =>
          String(el.dataset.id),
        )
        // ids viene front->back
        store.reorderGroupChildIds(gid, ids)
      },
    })

    groupSortables.set(String(gid), s)
  })
}

onMounted(async () => {
  await nextTick()
  setupSortable()
  setupGroupSortables()
})

onBeforeUnmount(() => {
  if (sortable) sortable.destroy()
  sortable = null
  for (const s of groupSortables.values()) s.destroy()
  groupSortables.clear()
})

onMounted(() => {
  try {
    const saved = localStorage.getItem('panel_collapsed_layers')
    if (saved !== null) collapsed.value = saved === 'true'
  } catch {
    // ignore
  }
})

watch(collapsed, (value) => {
  try {
    localStorage.setItem('panel_collapsed_layers', String(value))
  } catch {
    // ignore
  }
})

// Cuando cambie el número de nodos o grupos, refresca Sortable
watch(
  () => [store.nodes.length, (store.groups || []).length, rows.value.length, openGroups.value.size],
  async () => {
    await nextTick()
    setupSortable()
    setupGroupSortables()
  },
)

function onRowClick(row) {
  if (row.type === 'group') {
    // Selección de grupo
    store.selectGroup(row.groupId)
    return
  }

  // Node
  store.select(row.id)
}

function toggleVisibleRow(row) {
  if (row.type === 'node') {
    store.toggleVisible(row.id)
    return
  }

  // Group: togglear a todos los hijos
  const ids = row.childIds || []
  if (!ids.length) return

  // si cualquiera está visible => ocultar todos; si todos ocultos => mostrar todos
  const nodes = ids.map((id) => nodeById.value.get(String(id))).filter(Boolean)
  const anyVisible = nodes.some((n) => n.visible !== false)
  const target = !anyVisible // si alguno visible, target=false; si ninguno, target=true

  for (const n of nodes) {
    const isVisible = n.visible !== false
    if (isVisible !== target) store.toggleVisible(n.id)
  }
}

function toggleLockRow(row) {
  if (row.type === 'node') {
    store.toggleLock(row.id)
    return
  }

  // Group lock toggle: si todos locked => unlock all, si no => lock all
  const ids = row.childIds || []
  if (!ids.length) return

  const nodes = ids.map((id) => nodeById.value.get(String(id))).filter(Boolean)
  const allLocked = nodes.length ? nodes.every((n) => !!n.locked) : false
  const targetLocked = !allLocked

  for (const n of nodes) {
    if (!!n.locked !== targetLocked) store.toggleLock(n.id)
  }
}

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
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  border-radius: 14px;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;

  &:hover {
    border-color: rgba(0, 0, 0, 0.16);
    background: rgba(0, 0, 0, 0.01);
  }

  &.active {
    border-color: rgba(13, 110, 253, 0.35);
    background: rgba(13, 110, 253, 0.05);
  }
}

.panel-subtitle {
  font-size: 0.72rem;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.row-main {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
}

.chev-btn {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  border-radius: 10px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: rgba(0, 0, 0, 0.16);
    background: rgba(0, 0, 0, 0.03);
  }
}

.dot {
  width: 18px;
  height: 18px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex: 0 0 auto;
}

.dot-group {
  background: rgba(13, 110, 253, 0.12);
}

.dot-child {
  width: 14px;
  height: 14px;
  border-radius: 6px;
}

.dot-symbol {
  background: #12a4b7;
  box-shadow: 0 0 0 2px rgba(18, 164, 183, 0.15);
}

.group-children {
  margin-left: 18px;
  padding-left: 12px;
  border-left: 2px dashed rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.symbol-children {
  margin-left: 12px;
  padding-left: 10px;
  border-left: 2px dashed rgba(18, 164, 183, 0.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.child-item {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;

  &:hover {
    border-color: rgba(0, 0, 0, 0.14);
    background: rgba(0, 0, 0, 0.01);
  }

  &.active {
    border-color: rgba(13, 110, 253, 0.28);
    background: rgba(13, 110, 253, 0.04);
  }
}

.symbol-child .child-item {
  padding-left: 6px;
}

.child-symbol {
  padding-left: 8px;
}

.minw0 {
  min-width: 0;
}

.icon-btn {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  border-radius: 12px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: rgba(0, 0, 0, 0.16);
    background: rgba(0, 0, 0, 0.03);
  }
}

.icon-btn-sm {
  width: 30px;
  height: 30px;
  border-radius: 10px;
}

:deep(.row-ghost) {
  opacity: 0.55;
}
</style>
