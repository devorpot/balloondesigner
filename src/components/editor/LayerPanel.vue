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

      <div v-else v-show="!collapsed" ref="listEl" class="list">
        <!-- Top-level rows (draggables) -->
        <div
          v-for="row in rows"
          :key="row.key"
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
                  {{ row.name }}
                  <span class="text-muted small">· {{ row.childCount }}</span>
                </div>
                <div class="text-muted small text-truncate">
                  {{ row.lockedInfo }} · {{ row.visibleInfo }}
                </div>
              </div>
            </template>

            <template v-else>
              <span class="dot" :style="{ background: row.color }"></span>

              <div class="flex-grow-1 minw0">
                <div class="fw-semibold text-truncate">{{ row.name }}</div>
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
        </div>

        <!-- Group children (not draggable yet) -->
        <template v-for="row in rows" :key="row.key + '_children'">
          <div v-if="row.type === 'group' && isGroupOpen(row.groupId)" class="group-children">
            <button
              v-for="child in row.children"
              :key="child.id"
              class="child-item"
              :class="{ active: child.id === store.selectedId }"
              type="button"
              :data-id="String(child.id)"
              :data-group="String(row.groupId)"
              @click="store.select(child.id)"
            >
              <span class="dot dot-child" :style="{ background: child.color }"></span>

              <div class="flex-grow-1 minw0">
                <div class="fw-semibold text-truncate">{{ child.name }}</div>
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
          </div>
        </template>
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

function isGroupOpen(groupId) {
  return openGroups.value.has(groupId)
}

function toggleGroup(groupId) {
  const set = new Set(openGroups.value)
  if (set.has(groupId)) set.delete(groupId)
  else set.add(groupId)
  openGroups.value = set
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

const nodeById = computed(() => {
  const m = new Map()
  for (const n of store.nodes) m.set(String(n.id), n)
  return m
})

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
      .map((n, idx, arr) => ({
        id: n.id,
        name: `Globo ${arr.length - idx}`,
        x: n.x,
        y: n.y,
        color: n.color || 'rgba(0,0,0,.08)',
        visible: n.visible !== false,
        locked: !!n.locked,
      }))
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
      type: 'node',
      key: `node_${n.id}`,
      dataId: String(n.id),
      id: n.id,
      name: `Globo ${arr.length - idx}`,
      x: n.x,
      y: n.y,
      color: n.color || 'rgba(0,0,0,.08)',
      visible: n.visible !== false,
      locked: !!n.locked,
      active: n.id === store.selectedId,
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

.group-children {
  margin-left: 18px;
  padding-left: 12px;
  border-left: 2px dashed rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 6px;
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
