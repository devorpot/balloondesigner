// editor.store.js
import { defineStore } from 'pinia'
import { toRaw } from 'vue'

function uid() {
  return 'node_' + Math.random().toString(36).slice(2, 10)
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

const STORAGE_KEY = 'ballon_designer_autosave_v1'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    nodes: [],

    // selección
    selectedId: null,
    selectedIds: [],
        // grupos (lógico)
    groups: [], // { id, name, childIds: [] }
    selectedGroupId: null,


    // vista
    view: { x: 0, y: 0, scale: 1 },

   settings: {
  grid: true,
  snap: false,      // snap al grid
  snapStep: 10,

  snapGuides: true, // snap a guías (otros globos / canvas)
  snapTolerance: 8, // px (en coords del canvas)
  snapGuidePriority: 'center-first', // 'center-first' | 'edges-first'
},


    // runtime (no se serializa)
    stage: null,
    _beforeUnloadHandler: null,

    // autosave
    autosave: {
      enabled: false,
      isRestoring: false,
      isDirty: false,
      lastSavedAt: null, // timestamp
      timerId: null,
      debounceMs: 600,
    },

    // clipboard
    clipboard: {
      node: null, // legacy
      nodes: null, // array de nodos copiados
      bbox: null, // bbox del grupo copiado
    },

   pasteSession: {
  active: false,
  count: 0,
  baseX: null,
  baseY: null,
  startedAt: null,
  lastPasteAt: null,
  timeoutMs: 4000, // auto-cierra si no pegas en 4s
},


    // history
    history: {
      past: [],
      future: [],
      max: 80,
      lock: false,
      timer: null,
      debounceMs: 250,
      batching: 0,
      batchDirty: false,
    },
  }),

  getters: {
    selectedNode(state) {
      return state.nodes.find(n => n.id === state.selectedId) || null
    },

    selectedNodes(state) {
      const set = new Set(state.selectedIds || [])
      return state.nodes.filter(n => set.has(n.id))
    },

    visibleNodes(state) {
      return state.nodes.filter(n => n.visible !== false)
    },

    canRestore() {
      try {
        return !!localStorage.getItem(STORAGE_KEY)
      } catch {
        return false
      }
    },

    materialsSummary(state) {
      const nodes = state.nodes.filter(n => n.visible !== false)
      const total = nodes.length

      const byColorMap = new Map()
      const byTypeMap = new Map()
      const byTypeColorMap = new Map()

      for (const n of nodes) {
        const color = typeof n.color === 'string' ? n.color.toLowerCase() : '#000000'
        const typeId = String(n.typeId || 'round-11')

        byColorMap.set(color, (byColorMap.get(color) || 0) + 1)
        byTypeMap.set(typeId, (byTypeMap.get(typeId) || 0) + 1)

        if (!byTypeColorMap.has(typeId)) byTypeColorMap.set(typeId, new Map())
        const cmap = byTypeColorMap.get(typeId)
        cmap.set(color, (cmap.get(color) || 0) + 1)
      }

      const byColor = [...byColorMap.entries()]
        .map(([color, qty]) => ({ color, qty }))
        .sort((a, b) => b.qty - a.qty)

      const byType = [...byTypeMap.entries()]
        .map(([typeId, qty]) => ({ typeId, qty }))
        .sort((a, b) => b.qty - a.qty)

      const byTypeColor = [...byTypeColorMap.entries()].map(([typeId, cmap]) => ({
        typeId,
        total: [...cmap.values()].reduce((a, b) => a + b, 0),
        colors: [...cmap.entries()]
          .map(([color, qty]) => ({ color, qty }))
          .sort((a, b) => b.qty - a.qty),
      }))
      byTypeColor.sort((a, b) => b.total - a.total)

      return { total, byColor, byType, byTypeColor }
    },
  },

  actions: {
    // ===== Stage =====
    setStage(stage) {
      this.stage = stage || null
    },

    // ===== Dirty: autosave + history =====
    markDirty() {
      if (this.history?.lock) return
      this.autosave.isDirty = true
      this.scheduleAutosave()
      this.scheduleHistoryCommit()
    },

    // ===== Core =====
    addNode({ x = 100, y = 100, color = '#ff3b30', typeId = 'round-11', meta = {} } = {}) {
      const node = {
        id: uid(),
        typeId,
        x: Number.isFinite(Number(x)) ? Number(x) : 100,
        y: Number.isFinite(Number(y)) ? Number(y) : 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        color,
        locked: false,
        visible: true,
        zIndex: this.nodes.length,

        groupId: null,

        meta: {
          radiusX: meta.radiusX ?? 46,
          radiusY: meta.radiusY ?? 60,
          knot: meta.knot ?? true,
          shape: meta.shape ?? 'ellipse',
        },
      }

      this.nodes.push(node)
      this.select(node.id, { append: false })
      this.markDirty()
      return node.id
    },

    updateNode(id, patch) {
      const node = this.nodes.find(n => n.id === id)
      if (!node) return
      Object.assign(node, patch || {})
      this.markDirty()
    },

    updateNodes(patchById = {}) {
      if (!patchById || typeof patchById !== 'object') return

      this.beginHistoryBatch()
      try {
        for (const [id, patch] of Object.entries(patchById)) {
          const node = this.nodes.find(n => n.id === id)
          if (!node) continue
          Object.assign(node, patch || {})
        }
      } finally {
        this.endHistoryBatch()
      }

      this.markDirty()
    },

    setNodeType(id, { typeId, metaDefaults = null, replaceMeta = true } = {}) {
      const node = this.nodes.find(n => n.id === id)
      if (!node) return

      node.typeId = String(typeId || node.typeId || 'round-11')

      if (metaDefaults && typeof metaDefaults === 'object') {
        if (replaceMeta) node.meta = { ...metaDefaults }
        else node.meta = { ...(node.meta || {}), ...metaDefaults }
      } else {
        node.meta = node.meta || {}
      }

      this.markDirty()
    },

    updateNodeMeta(id, metaPatch = {}) {
      const node = this.nodes.find(n => n.id === id)
      if (!node) return
      node.meta = { ...(node.meta || {}), ...(metaPatch || {}) }
      this.markDirty()
    },

    // ===== Selección =====
    select(id, { append = false } = {}) {
      const exists = this.nodes.some(n => n.id === id)
      if (!exists) return

      if (!append) {
        this.selectedId = id
        this.selectedIds = [id]
        return
      }

      const set = new Set(this.selectedIds || [])
      set.add(id)
      this.selectedIds = [...set]
      this.selectedId = id
    },

    toggleSelect(id) {
      const exists = this.nodes.some(n => n.id === id)
      if (!exists) return

      const set = new Set(this.selectedIds || [])
      if (set.has(id)) set.delete(id)
      else set.add(id)

      const arr = [...set]
      this.selectedIds = arr
      this.selectedId = arr.length ? arr[arr.length - 1] : null
    },

    setSelection(ids = []) {
      const set = new Set(ids)
      const valid = this.nodes.map(n => n.id).filter(id => set.has(id))
      this.selectedIds = valid
      this.selectedId = valid.length ? valid[valid.length - 1] : null
    },

   clearSelection() {
    this.selectedId = null
    this.selectedIds = []
    this.selectedGroupId = null
    if (this.pasteSession?.active) this.endPasteSession()
  },


    // ===== Delete =====
    deleteSelected() {
      const ids = new Set(this.selectedIds || [])
      if (!ids.size) return
      this.nodes = this.nodes.filter(n => !ids.has(n.id))
      this.clearSelection()
      this._cleanupGroups?.()
      this.reindexZ()
      this.markDirty()
    },

    // ===== Box select =====
    boxSelect(rect, { append = false } = {}) {
      if (!rect || rect.width <= 0 || rect.height <= 0) return

      const hit = []
      for (const n of this.nodes) {
        if (n.visible === false) continue

        const rx = Number(n?.meta?.radiusX ?? 46) * Math.abs(Number(n.scaleX ?? 1))
        const ry = Number(n?.meta?.radiusY ?? 60) * Math.abs(Number(n.scaleY ?? 1))

        const bx = Number(n.x ?? 0) - rx
        const by = Number(n.y ?? 0) - ry
        const bw = rx * 2
        const bh = ry * 2

        if (rectsIntersect(rect, { x: bx, y: by, width: bw, height: bh })) {
          hit.push(n.id)
        }
      }

      if (!append) {
        this.setSelection(hit)
        return
      }

      const set = new Set(this.selectedIds || [])
      for (const id of hit) set.add(id)
      this.selectedIds = [...set]
      this.selectedId = this.selectedIds.length ? this.selectedIds[this.selectedIds.length - 1] : null
    },

    // ===== Grid =====
    toggleGrid() {
      this.settings.grid = !this.settings.grid
      this.markDirty()
    },

    // ===== Lock/Visible =====
    toggleLock(id) {
      const node = this.nodes.find(n => n.id === id)
      if (!node) return
      node.locked = !node.locked
      this.markDirty()
    },

    toggleVisible(id) {
      const node = this.nodes.find(n => n.id === id)
      if (!node) return
      node.visible = !(node.visible !== false)
      this.markDirty()
    },

    setLockedForSelection(locked) {
      const ids = new Set(this.selectedIds || [])
      if (!ids.size) return
      const value = !!locked

      this.beginHistoryBatch()
      try {
        for (const n of this.nodes) {
          if (!ids.has(n.id)) continue
          n.locked = value
        }
      } finally {
        this.endHistoryBatch()
      }

      this.markDirty()
    },

    toggleLockSelection() {
      const sel = this.selectedNodes
      if (!sel.length) return
      const anyUnlocked = sel.some(n => !n.locked)
      this.setLockedForSelection(anyUnlocked)
    },

    setVisibleForSelection(visible) {
      const ids = new Set(this.selectedIds || [])
      if (!ids.size) return
      const value = !!visible

      this.beginHistoryBatch()
      try {
        for (const n of this.nodes) {
          if (!ids.has(n.id)) continue
          n.visible = value
        }
      } finally {
        this.endHistoryBatch()
      }

      this.markDirty()
    },

    // ===== Grouping (lógico) =====
    _groupUid() {
      return 'group_' + Math.random().toString(36).slice(2, 10)
    },

    _cleanupGroups() {
      const existing = new Set(this.nodes.map(n => n.id))
      const groups = Array.isArray(this.groups) ? this.groups : []

      for (const g of groups) {
        g.childIds = (g.childIds || []).filter(id => existing.has(id))
      }

      this.groups = groups.filter(g => (g.childIds || []).length >= 2)

      const groupIds = new Set(this.groups.map(g => g.id))
      for (const n of this.nodes) {
        if (n.groupId && !groupIds.has(n.groupId)) n.groupId = null
      }

      if (this.selectedGroupId && !groupIds.has(this.selectedGroupId)) this.selectedGroupId = null
    },

    groupSelection({ name = '' } = {}) {
      const ids = (this.selectedIds || []).filter(Boolean)
      const nodes = this.nodes.filter(n => ids.includes(n.id)).filter(n => !n.locked)
      if (nodes.length < 2) return null

      const groupId = this._groupUid()
      const label = String(name || '').trim() || `Grupo ${this.groups.length + 1}`

      this.beginHistoryBatch()
      try {
        for (const n of nodes) n.groupId = groupId
        this.groups.push({ id: groupId, name: label, childIds: nodes.map(n => n.id) })
        this.selectedGroupId = groupId
      } finally {
        this.endHistoryBatch()
      }

      this._cleanupGroups()
      this.markDirty()
      return groupId
    },

    ungroupSelection() {
      const ids = new Set(this.selectedIds || [])
      if (!ids.size) return false

      const affected = new Set()
      for (const n of this.nodes) {
        if (!ids.has(n.id)) continue
        if (n.groupId) affected.add(n.groupId)
      }
      if (!affected.size) return false

      this.beginHistoryBatch()
      try {
        for (const n of this.nodes) {
          if (!ids.has(n.id)) continue
          n.groupId = null
        }

        for (const g of this.groups) {
          if (!affected.has(g.id)) continue
          g.childIds = (g.childIds || []).filter(id => !ids.has(id))
        }
      } finally {
        this.endHistoryBatch()
      }

      this._cleanupGroups()
      this.markDirty()
      return true
    },

    selectGroup(groupId) {
      const id = String(groupId || '').trim()
      if (!id) return
      const g = (this.groups || []).find(x => x.id === id)
      if (!g) return
      this.selectedGroupId = id
      this.setSelection(g.childIds || [])
    },

    // ===== View =====
    setView(patch) {
      this.view = {
        x: Number.isFinite(patch?.x) ? patch.x : this.view.x,
        y: Number.isFinite(patch?.y) ? patch.y : this.view.y,
        scale: Number.isFinite(patch?.scale) ? clamp(patch.scale, 0.2, 4) : this.view.scale,
      }
      this.markDirty()
    },

    resetView() {
      this.view = { x: 0, y: 0, scale: 1 }
      this.markDirty()
    },

    // ===== Z order =====
    reindexZ() {
      this.nodes.forEach((n, i) => (n.zIndex = i))
    },

    reorderByIds(orderedIds) {
      const map = new Map(this.nodes.map(n => [n.id, n]))
      const next = []
      for (const id of orderedIds) {
        const node = map.get(id)
        if (node) next.push(node)
      }
      for (const n of this.nodes) if (!next.includes(n)) next.push(n)

      this.nodes = next
      this.reindexZ()
      this.markDirty()
    },

    reorderGroupChildIds(groupId, orderedChildIdsFrontToBack) {
  groupId = String(groupId)
  const g = (this.groups || []).find(x => String(x.id) === groupId)
  if (!g) return

  // Guardar orden del grupo (útil para UI y persistencia)
  g.childIds = (orderedChildIdsFrontToBack || []).map(String)

  // Stack actual (front -> back)
  const prevFront = [...this.nodes].reverse().map(n => String(n.id))

  // Posición actual aproximada del bloque del grupo (según el primer hijo encontrado)
  const indices = g.childIds
    .map(id => prevFront.indexOf(String(id)))
    .filter(i => i >= 0)

  const insertPos = indices.length ? Math.min(...indices) : prevFront.length

  // Quitamos del stack los hijos del grupo
  const set = new Set(g.childIds.map(String))
  const frontWithoutGroup = prevFront.filter(id => !set.has(String(id)))

  // Insertamos el grupo en la misma zona, pero con el nuevo orden
  const nextFront = [
    ...frontWithoutGroup.slice(0, insertPos),
    ...g.childIds.map(String),
    ...frontWithoutGroup.slice(insertPos),
  ]

  // reorderByIds espera back -> front
  this.reorderByIds([...nextFront].reverse())

  this.markDirty()
},


    // ===== Export PNG =====
    exportPng({ pixelRatio = 2, cropToContent = false, fileName = 'diseno.png' } = {}) {
      const stage = this.stage
      if (!stage) {
        window.alert('Stage no está listo para exportar.')
        return
      }

      let dataUrl = null

      if (cropToContent) {
        const box = this.getContentBoundingBox()
        if (!box) {
          window.alert('No hay contenido para exportar.')
          return
        }

        dataUrl = stage.toDataURL({
          pixelRatio,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        })
      } else {
        dataUrl = stage.toDataURL({ pixelRatio })
      }

      downloadDataUrl(dataUrl, fileName)
    },

    getPngDataUrl({ pixelRatio = 2, cropToContent = true } = {}) {
      const stage = this.stage
      if (!stage) return null

      if (cropToContent) {
        const box = this.getContentBoundingBox()
        if (!box) return null

        return stage.toDataURL({
          pixelRatio,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        })
      }

      return stage.toDataURL({ pixelRatio })
    },

    getContentBoundingBox(padding = 40) {
      const stage = this.stage
      if (!stage) return null

      const groups = stage.find('Group').filter(g => {
        const id = g.id?.()
        return typeof id === 'string' && id.startsWith('node_') && g.visible()
      })

      if (!groups.length) return null

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const g of groups) {
        const rect = g.getClientRect({ skipTransform: false })
        minX = Math.min(minX, rect.x)
        minY = Math.min(minY, rect.y)
        maxX = Math.max(maxX, rect.x + rect.width)
        maxY = Math.max(maxY, rect.y + rect.height)
      }

      minX = Math.max(0, minX - padding)
      minY = Math.max(0, minY - padding)
      maxX = maxX + padding
      maxY = maxY + padding

      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      }
    },

    // ===== Autosave =====
    initAutosave() {
      this.restoreFromStorage({ silent: true })
      this.initHistory()

      // handler estable (para removerlo después)
      if (!this._beforeUnloadHandler) {
        this._beforeUnloadHandler = () => {
          this.flushAutosaveNow()
        }
      }
      window.addEventListener('beforeunload', this._beforeUnloadHandler)
    },

    destroyAutosave() {
      if (this._beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      }
      this._beforeUnloadHandler = null
      this.clearAutosaveTimer()
    },

    scheduleAutosave() {
      this.clearAutosaveTimer()
      this.autosave.timerId = window.setTimeout(() => {
        this.flushAutosaveNow()
      }, this.autosave.debounceMs)
    },

    clearAutosaveTimer() {
      if (!this.autosave.timerId) return
      clearTimeout(this.autosave.timerId)
      this.autosave.timerId = null
    },

    flushAutosaveNow() {
      // safe si se llama como event handler
      const store = this?.$id ? this : useEditorStore()

      if (!store.autosave.enabled) return
      if (!store.autosave.isDirty) return

      const payload = store.serializeDesign()

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        store.autosave.isDirty = false
        store.autosave.lastSavedAt = Date.now()
      } catch (err) {
        console.warn('Autosave failed:', err)
      }
    },

    serializeDesign() {
      return {
        version: 1,
        savedAt: Date.now(),
        nodes: this.nodes.map(n => ({
          id: n.id,
          x: n.x,
          y: n.y,
          rotation: n.rotation,
          scaleX: n.scaleX,
          scaleY: n.scaleY,
          opacity: n.opacity,
          color: n.color,
          locked: !!n.locked,
          visible: n.visible !== false,
          zIndex: n.zIndex ?? 0,
          typeId: n.typeId || 'round-11',
          meta: n.meta || {},
          groupId: n.groupId || null,
        })),
        groups: (this.groups || []).map(g => ({
          id: String(g.id),
          name: String(g.name || ''),
          childIds: Array.isArray(g.childIds) ? g.childIds.map(String) : [],
        })),
        view: { ...this.view },
        settings: { ...this.settings },
      }
    },

    restoreFromStorage({ silent = false } = {}) {
      let raw = null
      try {
        raw = localStorage.getItem(STORAGE_KEY)
      } catch {
        raw = null
      }

      if (!raw) return false

      let data = null
      try {
        data = JSON.parse(raw)
      } catch {
        return false
      }

      if (!data || !Array.isArray(data.nodes)) return false

      this.autosave.isRestoring = true

      this.nodes = data.nodes.map(n => ({
        id: String(n.id || uid()),
        x: Number.isFinite(Number(n.x)) ? Number(n.x) : 0,
        y: Number.isFinite(Number(n.y)) ? Number(n.y) : 0,
        rotation: Number.isFinite(Number(n.rotation)) ? Number(n.rotation) : 0,
        scaleX: Number.isFinite(Number(n.scaleX)) ? Number(n.scaleX) : 1,
        scaleY: Number.isFinite(Number(n.scaleY)) ? Number(n.scaleY) : 1,
        opacity: Number.isFinite(Number(n.opacity)) ? Number(n.opacity) : 1,
        color: typeof n.color === 'string' ? n.color : '#ff3b30',
        locked: !!n.locked,
        visible: n.visible !== false,
        zIndex: Number.isFinite(Number(n.zIndex)) ? Number(n.zIndex) : 0,
        typeId: String(n.typeId || 'round-11'),
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
        groupId: n.groupId ? String(n.groupId) : null,
      }))

      this.groups = Array.isArray(data.groups)
        ? data.groups.map(g => ({
            id: String(g.id || this._groupUid()),
            name: String(g.name || ''),
            childIds: Array.isArray(g.childIds) ? g.childIds.map(String) : [],
          }))
        : []

      this.nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      this.reindexZ()

      if (data.view) {
        this.view = {
          x: Number.isFinite(Number(data.view.x)) ? Number(data.view.x) : 0,
          y: Number.isFinite(Number(data.view.y)) ? Number(data.view.y) : 0,
          scale: clamp(Number(data.view.scale || 1), 0.2, 4),
        }
      }

      if (data.settings) {
        this.settings.grid = !!data.settings.grid
        this.settings.snap = !!data.settings.snap
        this.settings.snapStep = Number(data.settings.snapStep || 10)
      }

      this.clearSelection()
      this._cleanupGroups()
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = Number(data.savedAt || Date.now())

      this.autosave.isRestoring = false

      if (!silent) {
        // feedback opcional
      }

      return true
    },

    clearSavedDesign() {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    },

    newDesign() {
      const ok = window.confirm('¿Crear un diseño nuevo? Se perderá el estado actual (autosave).')
      if (!ok) return

      this.nodes = []
      this.clearSelection()
      this.view = { x: 0, y: 0, scale: 1 }
      this.settings = { ...this.settings, grid: true, snap: false, snapStep: 10 }

      this.clearSavedDesign()
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = null

      this.initHistory()
    },

    restoreDesignPrompt() {
      const ok = window.confirm('¿Restaurar el último autosave? Esto reemplaza el estado actual.')
      if (!ok) return
      this.restoreFromStorage({ silent: true })
      this.initHistory()
    },

    // ===== Export/Import JSON =====
    exportJson({ fileName = 'diseno.json' } = {}) {
      const payload = this.serializeDesign()
      downloadJson(payload, fileName)
    },

    importJsonObject(data) {
      if (!data || !Array.isArray(data.nodes)) {
        window.alert('Archivo inválido: no contiene nodos.')
        return false
      }

      const ok = window.confirm('¿Importar este diseño? Esto reemplaza el estado actual.')
      if (!ok) return false

      this.autosave.isRestoring = true

      this.nodes = data.nodes.map(n => ({
        id: String(n.id || uid()),
        x: Number.isFinite(Number(n.x)) ? Number(n.x) : 0,
        y: Number.isFinite(Number(n.y)) ? Number(n.y) : 0,
        rotation: Number.isFinite(Number(n.rotation)) ? Number(n.rotation) : 0,
        scaleX: Number.isFinite(Number(n.scaleX)) ? Number(n.scaleX) : 1,
        scaleY: Number.isFinite(Number(n.scaleY)) ? Number(n.scaleY) : 1,
        opacity: Number.isFinite(Number(n.opacity)) ? Number(n.opacity) : 1,
        color: typeof n.color === 'string' ? n.color : '#ff3b30',
        locked: !!n.locked,
        visible: n.visible !== false,
        zIndex: Number.isFinite(Number(n.zIndex)) ? Number(n.zIndex) : 0,
        typeId: String(n.typeId || 'round-11'),
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
        groupId: n.groupId ? String(n.groupId) : null,
      }))

      this.groups = Array.isArray(data.groups)
        ? data.groups.map(g => ({
            id: String(g.id || this._groupUid()),
            name: String(g.name || ''),
            childIds: Array.isArray(g.childIds) ? g.childIds.map(String) : [],
          }))
        : []

      this.nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      this.reindexZ()

      if (data.view) {
        this.view = {
          x: Number.isFinite(Number(data.view.x)) ? Number(data.view.x) : 0,
          y: Number.isFinite(Number(data.view.y)) ? Number(data.view.y) : 0,
          scale: clamp(Number(data.view.scale || 1), 0.2, 4),
        }
      } else {
        this.view = { x: 0, y: 0, scale: 1 }
      }

      if (data.settings) {
        this.settings.grid = !!data.settings.grid
        this.settings.snap = !!data.settings.snap
        this.settings.snapStep = Number(data.settings.snapStep || 10)
      }

      this.clearSelection()
      this._cleanupGroups()
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = Date.now()
      this.autosave.isRestoring = false

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serializeDesign()))
        this.autosave.lastSavedAt = Date.now()
      } catch {
        // ignore
      }

      this.initHistory()
      return true
    },

    // ===== Materiales =====
    computeMaterials({ includeHidden = false, includeLocked = true, catalogTypes = [] } = {}) {
      const types = Array.isArray(catalogTypes) ? catalogTypes : []
      const typeMap = new Map(types.map(t => [t.id, t]))

      const nodes = this.nodes.filter(n => {
        const isHidden = n.visible === false
        const isLocked = !!n.locked
        if (!includeHidden && isHidden) return false
        if (!includeLocked && isLocked) return false
        return true
      })

      const total = nodes.length

      const byColorMap = new Map()
      const byTypeMap = new Map()
      const byTypeColorMap = new Map()

      let estimatedCost = 0

      for (const n of nodes) {
        const color = typeof n.color === 'string' ? n.color.toLowerCase() : '#000000'
        const typeId = String(n.typeId || 'round-11')

        byColorMap.set(color, (byColorMap.get(color) || 0) + 1)
        byTypeMap.set(typeId, (byTypeMap.get(typeId) || 0) + 1)

        if (!byTypeColorMap.has(typeId)) byTypeColorMap.set(typeId, new Map())
        const cmap = byTypeColorMap.get(typeId)
        cmap.set(color, (cmap.get(color) || 0) + 1)
      }

      const byColor = [...byColorMap.entries()]
        .map(([color, qty]) => ({ color, qty }))
        .sort((a, b) => b.qty - a.qty)

      const byType = [...byTypeMap.entries()]
        .map(([typeId, qty]) => {
          const t = typeMap.get(typeId)
          const cost = Number(t?.cost || 0)
          const subtotal = cost > 0 ? qty * cost : 0
          estimatedCost += subtotal
          return {
            typeId,
            qty,
            typeName: t?.name || `Tipo: ${typeId}`,
            unitCost: cost,
            subtotal,
          }
        })
        .sort((a, b) => b.qty - a.qty)

      const byTypeColor = [...byTypeColorMap.entries()].map(([typeId, cmap]) => {
        const t = typeMap.get(typeId)
        const colors = [...cmap.entries()]
          .map(([color, qty]) => ({ color, qty }))
          .sort((a, b) => b.qty - a.qty)

        const qty = colors.reduce((acc, x) => acc + x.qty, 0)
        const cost = Number(t?.cost || 0)
        const subtotal = cost > 0 ? qty * cost : 0

        return {
          typeId,
          typeName: t?.name || `Tipo: ${typeId}`,
          qty,
          unitCost: cost,
          subtotal,
          colors,
        }
      })

      byTypeColor.sort((a, b) => b.qty - a.qty)

      const hasCosts = byType.some(x => x.unitCost > 0)

      return {
        filters: { includeHidden, includeLocked },
        total,
        byColor,
        byType,
        byTypeColor,
        hasCosts,
        estimatedCost: hasCosts ? estimatedCost : 0,
      }
    },

    exportMaterialsJson({
      fileName = 'materiales.json',
      includeHidden = false,
      includeLocked = true,
      catalogTypes = [],
    } = {}) {
      const summary = this.computeMaterials({ includeHidden, includeLocked, catalogTypes })

      const payload = {
        version: 2,
        createdAt: Date.now(),
        summary,
        nodes: this.nodes.map(n => ({
          id: n.id,
          typeId: n.typeId || 'round-11',
          color: n.color || '#000000',
          visible: n.visible !== false,
          locked: !!n.locked,
        })),
      }

      downloadJson(payload, fileName)
    },

    // ===== Clipboard (multi) =====
    copySelected() {
      const nodes = this.selectedNodes
      if (!nodes.length) return false

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      for (const n of nodes) {
        const rx = Number(n?.meta?.radiusX ?? 46) * Math.abs(Number(n.scaleX ?? 1))
        const ry = Number(n?.meta?.radiusY ?? 60) * Math.abs(Number(n.scaleY ?? 1))
        const left = Number(n.x ?? 0) - rx
        const top = Number(n.y ?? 0) - ry
        const right = Number(n.x ?? 0) + rx
        const bottom = Number(n.y ?? 0) + ry

        minX = Math.min(minX, left)
        minY = Math.min(minY, top)
        maxX = Math.max(maxX, right)
        maxY = Math.max(maxY, bottom)
      }

      const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

      this.clipboard.nodes = nodes.map(n => ({
        dx: Number(n.x ?? 0) - bbox.x,
        dy: Number(n.y ?? 0) - bbox.y,

        typeId: n.typeId || 'round-11',
        color: n.color || '#000000',
        rotation: Number(n.rotation || 0),
        scaleX: Number.isFinite(Number(n.scaleX)) ? Number(n.scaleX) : 1,
        scaleY: Number.isFinite(Number(n.scaleY)) ? Number(n.scaleY) : 1,
        opacity: Number.isFinite(Number(n.opacity)) ? Number(n.opacity) : 1,
        locked: !!n.locked,
        visible: n.visible !== false,
        meta: typeof n.meta === 'object' && n.meta ? { ...n.meta } : {},
      }))

      this.clipboard.bbox = bbox
      this.clipboard.node = this.clipboard.nodes[0] || null

      return true
    },

pasteFromClipboard({ x = null, y = null, offset = 18, multi = false } = {}) {
  const clips = Array.isArray(this.clipboard?.nodes) ? this.clipboard.nodes : null
  if (!clips || !clips.length) return null

  const now = Date.now()

  // iniciar sesión multi
  if (multi) {
    if (!this.pasteSession.active) {
      this.pasteSession.active = true
      this.pasteSession.count = 0
      this.pasteSession.baseX = Number.isFinite(x) ? x : 200
      this.pasteSession.baseY = Number.isFinite(y) ? y : 200
      this.pasteSession.startedAt = now
      this.pasteSession.lastPasteAt = now
    } else {
      // si ya estaba activa, actualizamos lastPasteAt (no movemos base)
      this.pasteSession.lastPasteAt = now
    }
  } else {
    // paste normal: no usa sesión
    this.pasteSession.lastPasteAt = now
  }

  const session = this.pasteSession
  const baseX = multi ? session.baseX : (Number.isFinite(x) ? x : 200)
  const baseY = multi ? session.baseY : (Number.isFinite(y) ? y : 200)

  const i = multi ? session.count : 1
  const ox = offset * i
  const oy = offset * i

  this.beginHistoryBatch()
  try {
    const newIds = []

    for (const c of clips) {
      const newId = this.addNode({
        x: baseX + c.dx + ox,
        y: baseY + c.dy + oy,
        color: c.color,
        typeId: c.typeId,
        meta: { ...(c.meta || {}) },
      })

      if (newId) {
        this.updateNode(newId, {
          rotation: c.rotation,
          scaleX: c.scaleX,
          scaleY: c.scaleY,
          opacity: c.opacity,
          locked: c.locked,
          visible: c.visible,
        })
        newIds.push(newId)
      }
    }

    this.setSelection(newIds)

    if (multi) session.count += 1
    return newIds.length ? newIds[0] : null
  } finally {
    this.endHistoryBatch()
  }
},


endPasteSession() {
  this.pasteSession.active = false
  this.pasteSession.count = 0
  this.pasteSession.baseX = null
  this.pasteSession.baseY = null
  this.pasteSession.startedAt = null
  this.pasteSession.lastPasteAt = null
},

tickPasteSession() {
  if (!this.pasteSession?.active) return false
  const last = Number(this.pasteSession.lastPasteAt || 0)
  const timeoutMs = Number(this.pasteSession.timeoutMs || 0)

  if (!timeoutMs || timeoutMs <= 0) return false
  if (!last) return false

  const expired = (Date.now() - last) > timeoutMs
  if (expired) {
    this.endPasteSession()
    return true
  }
  return false
},



    duplicateSelected({ offset = 18 } = {}) {
      if (!this.selectedIds?.length) return null
      const ok = this.copySelected()
      if (!ok) return null
      return this.pasteFromClipboard({ offset, multi: false })
    },

    duplicateSelectedMany({ count = 3, stepX = 18, stepY = 18, inPlace = false } = {}) {
      const n = Number(count)
      const times = Number.isFinite(n) ? Math.max(1, Math.min(200, Math.floor(n))) : 3

      const ok = this.copySelected()
      if (!ok) return []

      const clips = Array.isArray(this.clipboard?.nodes) ? this.clipboard.nodes : []
      const bbox = this.clipboard?.bbox || null
      if (!clips.length || !bbox) return []

      const createdAll = []

      // base: esquina superior izquierda del grupo original
      const baseX = Number.isFinite(Number(bbox.x)) ? Number(bbox.x) : 200
      const baseY = Number.isFinite(Number(bbox.y)) ? Number(bbox.y) : 200

      this.beginHistoryBatch()
      try {
        for (let i = 0; i < times; i++) {
          const k = i + 1
          const ox = inPlace ? 0 : Number(stepX || 0) * k
          const oy = inPlace ? 0 : Number(stepY || 0) * k

          const newIds = []
          for (const c of clips) {
            const newId = this.addNode({
              x: baseX + Number(c.dx || 0) + ox,
              y: baseY + Number(c.dy || 0) + oy,
              color: c.color,
              typeId: c.typeId,
              meta: { ...(c.meta || {}) },
            })

            if (newId) {
              this.updateNode(newId, {
                rotation: c.rotation,
                scaleX: c.scaleX,
                scaleY: c.scaleY,
                opacity: c.opacity,
                locked: c.locked,
                visible: c.visible,
              })
              newIds.push(newId)
            }
          }

          if (newIds.length) {
            createdAll.push(...newIds)
            this.setSelection(newIds)
          }
        }
      } finally {
        this.endHistoryBatch()
      }

      return createdAll
    },

    // ===== Align / Distribute =====
    alignSelection(mode) {
      const nodes = this.selectedNodes.filter(n => !n.locked)
      if (nodes.length < 2) return

      this.beginHistoryBatch()
      try {
        const boxes = nodes.map(n => {
          const rx = Number(n?.meta?.radiusX ?? 46) * Math.abs(Number(n.scaleX ?? 1))
          const ry = Number(n?.meta?.radiusY ?? 60) * Math.abs(Number(n.scaleY ?? 1))
          return {
            id: n.id,
            left: n.x - rx,
            right: n.x + rx,
            top: n.y - ry,
            bottom: n.y + ry,
            width: rx * 2,
            height: ry * 2,
            cx: n.x,
            cy: n.y,
          }
        })

        const minLeft = Math.min(...boxes.map(b => b.left))
        const maxRight = Math.max(...boxes.map(b => b.right))
        const minTop = Math.min(...boxes.map(b => b.top))
        const maxBottom = Math.max(...boxes.map(b => b.bottom))

        const centerX = (minLeft + maxRight) / 2
        const centerY = (minTop + maxBottom) / 2

        for (const b of boxes) {
          let nx = b.cx
          let ny = b.cy

          if (mode === 'left') nx = minLeft + b.width / 2
          if (mode === 'right') nx = maxRight - b.width / 2
          if (mode === 'center-x') nx = centerX

          if (mode === 'top') ny = minTop + b.height / 2
          if (mode === 'bottom') ny = maxBottom - b.height / 2
          if (mode === 'center-y') ny = centerY

          this.updateNode(b.id, { x: nx, y: ny })
        }
      } finally {
        this.endHistoryBatch()
      }
    },

    distributeSelection(axis) {
      const nodes = this.selectedNodes
        .filter(n => !n.locked)
        .sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y))

      if (nodes.length < 3) return

      this.beginHistoryBatch()
      try {
        const first = nodes[0]
        const last = nodes[nodes.length - 1]

        const start = axis === 'x' ? first.x : first.y
        const end = axis === 'x' ? last.x : last.y

        const gap = (end - start) / (nodes.length - 1)

        nodes.forEach((n, i) => {
          if (i === 0 || i === nodes.length - 1) return
          const value = start + gap * i
          if (axis === 'x') this.updateNode(n.id, { x: value })
          else this.updateNode(n.id, { y: value })
        })
      } finally {
        this.endHistoryBatch()
      }
    },

    // ===== History =====
    initHistory() {
      this.history.past = [this._captureSnapshot()]
      this.history.future = []
    },

    _captureSnapshot() {
      // IMPORTANTE: usar toRaw para no clonar Proxies
      return {
        nodes: deepClone(toRaw(this.nodes)),
        view: deepClone(toRaw(this.view)),
        settings: deepClone(toRaw(this.settings)),
      }
    },

    _restoreSnapshot(snap) {
      if (!snap) return
      this.history.lock = true
      try {
        this.nodes = deepClone(snap.nodes || [])
        this.view = deepClone(snap.view || { x: 0, y: 0, scale: 1 })
        this.settings = deepClone(snap.settings || this.settings)
        this.clearSelection()
      } finally {
        this.history.lock = false
      }
    },

    _pushHistory() {
      if (this.history.lock) return

      const snap = this._captureSnapshot()
      const past = this.history.past
      const last = past[past.length - 1]

      // evita duplicados idénticos
      if (last && JSON.stringify(last) === JSON.stringify(snap)) return

      past.push(snap)

      if (past.length > this.history.max) {
        past.splice(0, past.length - this.history.max)
      }

      this.history.future = []
    },

    scheduleHistoryCommit() {
      if (this.history.lock) return

      if (this.history.batching > 0) {
        this.history.batchDirty = true
        return
      }

      if (this.history.timer) clearTimeout(this.history.timer)
      this.history.timer = window.setTimeout(() => {
        this.history.timer = null
        this._pushHistory()
      }, this.history.debounceMs)
    },

    beginHistoryBatch() {
      this.history.batching += 1
    },

    endHistoryBatch() {
      this.history.batching = Math.max(0, this.history.batching - 1)
      if (this.history.batching === 0 && this.history.batchDirty) {
        this.history.batchDirty = false
        this._pushHistory()
      }
    },

    undo() {
      if (this.history.lock) return false
      const past = this.history.past
      if (past.length <= 1) return false

      if (this.history.timer) {
        clearTimeout(this.history.timer)
        this.history.timer = null
        this._pushHistory()
      }

      const current = past.pop()
      this.history.future.unshift(current)

      const prev = past[past.length - 1]
      this._restoreSnapshot(prev)

      // al deshacer, marcamos dirty para que autosave refleje el estado actual
      this.autosave.isDirty = true
      this.scheduleAutosave()

      return true
    },

    redo() {
      if (this.history.lock) return false
      const future = this.history.future
      if (!future.length) return false

      const next = future.shift()
      this.history.past.push(next)
      this._restoreSnapshot(next)

      this.autosave.isDirty = true
      this.scheduleAutosave()

      return true
    },

    reorderGroupChildIds(groupId, orderedChildIdsFrontToBack) {
  groupId = String(groupId)
  const g = (this.groups || []).find(x => String(x.id) === groupId)
  if (!g) return

  // Guardar el orden en el grupo (opcional pero útil para UI)
  g.childIds = orderedChildIdsFrontToBack.map(String)

  // Ahora reflejarlo en el stack real:
  // - Convertimos el stack actual a front->back
  const front = [...this.nodes].reverse().map(n => String(n.id))

  // Quitamos los ids del grupo
  const set = new Set(g.childIds)
  const frontWithoutGroup = front.filter(id => !set.has(id))

  // Insertamos el grupo en su "posición actual" aproximada:
  // buscamos la posición donde estaba el primer hijo antes del cambio
  const prevFront = [...this.nodes].reverse().map(n => String(n.id))
  const prevIndices = g.childIds.map(id => prevFront.indexOf(String(id))).filter(i => i >= 0)
  const insertPos = prevIndices.length ? Math.min(...prevIndices) : frontWithoutGroup.length

  const nextFront = [
    ...frontWithoutGroup.slice(0, insertPos),
    ...orderedChildIdsFrontToBack.map(String),
    ...frontWithoutGroup.slice(insertPos),
  ]

  // store.reorderByIds espera back->front
  this.reorderByIds([...nextFront].reverse())

  this.markDirty()
}

  },
})

function downloadDataUrl(dataUrl, fileName) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function downloadJson(obj, fileName) {
  const json = JSON.stringify(obj, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(url)
}

function rectsIntersect(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  )
}

function deepClone(obj) {
  const raw = toRaw(obj)

  try {
    if (typeof structuredClone === 'function') return structuredClone(raw)
  } catch {
    // fallback
  }

  return JSON.parse(JSON.stringify(raw))
}

function featureWeightX(featureKey) {
  const mode = String(store.settings?.snapGuidePriority || 'center-first')
  // pesos más bajos = mejor (más prioritario)
  if (mode === 'edges-first') {
    if (featureKey === 'left' || featureKey === 'right') return 0
    if (featureKey === 'center') return 1
    return 2
  }
  // center-first (default)
  if (featureKey === 'center') return 0
  if (featureKey === 'left' || featureKey === 'right') return 1
  return 2
}

function featureWeightY(featureKey) {
  const mode = String(store.settings?.snapGuidePriority || 'center-first')
  if (mode === 'edges-first') {
    if (featureKey === 'top' || featureKey === 'bottom') return 0
    if (featureKey === 'center') return 1
    return 2
  }
  if (featureKey === 'center') return 0
  if (featureKey === 'top' || featureKey === 'bottom') return 1
  return 2
}



function snapBoxToGuides(box, candidates) {
  if (!store.settings?.snapGuides) return { dx: 0, dy: 0, gx: null, gy: null }

  const tol = getTolerance()

  // features del box que pueden “pegarse”
  const fx = [
    { value: box.left, key: 'left' },
    { value: box.centerX, key: 'center' },
    { value: box.right, key: 'right' },
  ]
  const fy = [
    { value: box.top, key: 'top' },
    { value: box.centerY, key: 'center' },
    { value: box.bottom, key: 'bottom' },
  ]

  // scoring:
  // 1) prioridad por tipo (center-first / edges-first)
  // 2) distancia absoluta (más cerca gana)
  // 3) desempate: preferir guías de node vs canvas (opcional, aquí le damos leve preferencia a node)
  function guideSourceWeight(type) {
    // type empieza con 'node-' o 'canvas-'
    const t = String(type || '')
    if (t.startsWith('node-')) return 0
    if (t.startsWith('canvas-')) return 1
    return 2
  }

  let bestX = null // { featureKey, ad, diff, guide, p, srcW }
  for (const f of fx) {
    const p = featureWeightX(f.key)
    for (const g of candidates.xs) {
      const diff = g.value - f.value
      const ad = Math.abs(diff)
      if (ad > tol) continue

      const srcW = guideSourceWeight(g.type)

      const cand = { featureKey: f.key, p, ad, diff, guide: g, srcW }

      if (!bestX) {
        bestX = cand
        continue
      }

      // orden: prioridad feature -> distancia -> fuente (node primero)
      if (cand.p < bestX.p) {
        bestX = cand
        continue
      }
      if (cand.p === bestX.p && cand.ad < bestX.ad) {
        bestX = cand
        continue
      }
      if (cand.p === bestX.p && cand.ad === bestX.ad && cand.srcW < bestX.srcW) {
        bestX = cand
        continue
      }
    }
  }

  let bestY = null
  for (const f of fy) {
    const p = featureWeightY(f.key)
    for (const g of candidates.ys) {
      const diff = g.value - f.value
      const ad = Math.abs(diff)
      if (ad > tol) continue

      const srcW = guideSourceWeight(g.type)
      const cand = { featureKey: f.key, p, ad, diff, guide: g, srcW }

      if (!bestY) {
        bestY = cand
        continue
      }

      if (cand.p < bestY.p) {
        bestY = cand
        continue
      }
      if (cand.p === bestY.p && cand.ad < bestY.ad) {
        bestY = cand
        continue
      }
      if (cand.p === bestY.p && cand.ad === bestY.ad && cand.srcW < bestY.srcW) {
        bestY = cand
        continue
      }
    }
  }

  return {
    dx: bestX ? bestX.diff : 0,
    dy: bestY ? bestY.diff : 0,
    gx: bestX ? bestX.guide : null,
    gy: bestY ? bestY.guide : null,
  }
}
