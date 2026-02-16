import { defineStore } from 'pinia'

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
    selectedId: null,

    view: { x: 0, y: 0, scale: 1 },

    settings: {
      grid: true,
      snap: false,
      snapStep: 10,
    },

    // runtime
    stage: null,

    // autosave
    autosave: {
      enabled: true,
      isRestoring: false,
      isDirty: false,
      lastSavedAt: null, // timestamp
      timerId: null,
      debounceMs: 600,
    },
  }),

  getters: {
    selectedNode(state) {
      return state.nodes.find(n => n.id === state.selectedId) || null
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

  // byColor
  const byColorMap = new Map()
  // byType
  const byTypeMap = new Map()
  // byTypeColor: typeId -> (color -> qty)
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
  // ordena por total descendente
  byTypeColor.sort((a, b) => b.total - a.total)

  return { total, byColor, byType, byTypeColor }
},


  },

  actions: {
    // ===== Stage =====
    setStage(stage) {
      this.stage = stage || null
    },

    // ===== Core actions =====
    addNode({ x = 100, y = 100, color = '#ff3b30', typeId = 'round-11', meta = {} } = {}) {
  const node = {
    id: uid(),
    typeId,
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    color,
    locked: false,
    visible: true,
    zIndex: this.nodes.length,

    // shape meta (por tipo)
    meta: {
      radiusX: meta.radiusX ?? 46,
      radiusY: meta.radiusY ?? 60,
      knot: meta.knot ?? true,
      shape: meta.shape ?? 'ellipse', // 'ellipse' | 'heart' (luego agregamos más)
    },
  }

  this.nodes.push(node)
  this.selectedId = node.id
  this.markDirty()
},


    select(id) {
      this.selectedId = id
    },

    clearSelection() {
      this.selectedId = null
    },

    updateNode(id, patch) {
      const node = this.nodes.find(n => n.id === id)
      if (!node) return
      Object.assign(node, patch)
      this.markDirty()
    },
    setNodeType(id, { typeId, metaDefaults = null, replaceMeta = true } = {}) {
  const node = this.nodes.find(n => n.id === id)
  if (!node) return

  node.typeId = String(typeId || node.typeId || 'round-11')

  if (metaDefaults && typeof metaDefaults === 'object') {
    if (replaceMeta) {
      node.meta = { ...metaDefaults }
    } else {
      node.meta = { ...(node.meta || {}), ...metaDefaults }
    }
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


    deleteSelected() {
      if (!this.selectedId) return
      this.nodes = this.nodes.filter(n => n.id !== this.selectedId)
      this.selectedId = null
      this.nodes.forEach((n, i) => (n.zIndex = i))
      this.markDirty()
    },

    duplicateSelected() {
      const n = this.selectedNode
      if (!n) return
      const copy = {
        ...structuredClone(n),
        id: uid(),
        x: Number(n.x || 0) + 20,
        y: Number(n.y || 0) + 20,
      }
      this.nodes.push(copy)
      this.selectedId = copy.id
      this.nodes.forEach((x, i) => (x.zIndex = i))
      this.markDirty()
    },

    toggleGrid() {
      this.settings.grid = !this.settings.grid
      this.markDirty()
    },

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

    setView(patch) {
      this.view = {
        x: Number.isFinite(patch.x) ? patch.x : this.view.x,
        y: Number.isFinite(patch.y) ? patch.y : this.view.y,
        scale: Number.isFinite(patch.scale) ? clamp(patch.scale, 0.2, 4) : this.view.scale,
      }
      this.markDirty()
    },

    resetView() {
      this.view = { x: 0, y: 0, scale: 1 }
      this.markDirty()
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
      this.nodes.forEach((n, i) => (n.zIndex = i))
      this.markDirty()
    },

    // ===== Export PNG =====
    exportPng({ pixelRatio = 2, cropToContent = false, fileName = 'diseno.png' } = {}) {
      if (!this.stage) {
        window.alert('Stage no está listo para exportar.')
        return
      }

      const stage = this.stage
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

    getContentBoundingBox(padding = 40) {
      if (!this.stage) return null

      const groups = this.stage.find('Group').filter(g => {
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
      // cargar si existe (solo una vez al entrar al editor)
      this.restoreFromStorage({ silent: true })

      // guardar antes de cerrar pestaña si hay cambios
      window.addEventListener('beforeunload', this.flushAutosaveNow)
    },

    destroyAutosave() {
      window.removeEventListener('beforeunload', this.flushAutosaveNow)
      this.clearAutosaveTimer()
    },

    markDirty() {
      if (!this.autosave.enabled) return
      if (this.autosave.isRestoring) return

      this.autosave.isDirty = true
      this.scheduleAutosave()
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
      // binding safe: this method is used as event handler too
      const store = this.$id ? this : useEditorStore()

      if (!store.autosave.enabled) return
      if (!store.autosave.isDirty) return

      const payload = store.serializeDesign()

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        store.autosave.isDirty = false
        store.autosave.lastSavedAt = Date.now()
      } catch (err) {
        // si storage falla, no rompemos el editor
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

      // reconstruye estado
      this.nodes = data.nodes.map(n => ({
        id: String(n.id || uid()),
        x: Number(n.x || 0),
        y: Number(n.y || 0),
        rotation: Number(n.rotation || 0),
        scaleX: Number.isFinite(Number(n.scaleX)) ? Number(n.scaleX) : 1,
        scaleY: Number.isFinite(Number(n.scaleY)) ? Number(n.scaleY) : 1,
        opacity: Number.isFinite(Number(n.opacity)) ? Number(n.opacity) : 1,
        color: typeof n.color === 'string' ? n.color : '#ff3b30',
        locked: !!n.locked,
        visible: n.visible !== false,
        zIndex: Number.isFinite(Number(n.zIndex)) ? Number(n.zIndex) : 0,
        typeId: String(n.typeId || 'round-11'),
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
      }))

      // ordena por zIndex por si acaso
      this.nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      this.nodes.forEach((n, i) => (n.zIndex = i))

      if (data.view) {
        this.view = {
          x: Number(data.view.x || 0),
          y: Number(data.view.y || 0),
          scale: clamp(Number(data.view.scale || 1), 0.2, 4),
        }
      }

      if (data.settings) {
        this.settings.grid = !!data.settings.grid
        this.settings.snap = !!data.settings.snap
        this.settings.snapStep = Number(data.settings.snapStep || 10)
      }

      this.selectedId = null
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = Number(data.savedAt || Date.now())

      this.autosave.isRestoring = false

      if (!silent) {
        // opcional: feedback mínimo
        // window.alert('Diseño restaurado.')
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
      this.selectedId = null
      this.view = { x: 0, y: 0, scale: 1 }
      this.settings = { ...this.settings, grid: true, snap: false, snapStep: 10 }

      this.clearSavedDesign()
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = null
    },

    restoreDesignPrompt() {
      const ok = window.confirm('¿Restaurar el último autosave? Esto reemplaza el estado actual.')
      if (!ok) return
      this.restoreFromStorage({ silent: true })
    },
        // ===== Export/Import JSON =====
    exportJson({ fileName = 'diseno.json' } = {}) {
      const payload = this.serializeDesign()
      downloadJson(payload, fileName)
    },

    importJsonObject(data) {
      // Valida estructura mínima
      if (!data || !Array.isArray(data.nodes)) {
        window.alert('Archivo inválido: no contiene nodos.')
        return false
      }

      const ok = window.confirm('¿Importar este diseño? Esto reemplaza el estado actual.')
      if (!ok) return false

      this.autosave.isRestoring = true

      // reconstruye estado con saneamiento
      this.nodes = data.nodes.map(n => ({
        id: String(n.id || uid()),
        x: Number(n.x || 0),
        y: Number(n.y || 0),
        rotation: Number(n.rotation || 0),
        scaleX: Number.isFinite(Number(n.scaleX)) ? Number(n.scaleX) : 1,
        scaleY: Number.isFinite(Number(n.scaleY)) ? Number(n.scaleY) : 1,
        opacity: Number.isFinite(Number(n.opacity)) ? Number(n.opacity) : 1,
        color: typeof n.color === 'string' ? n.color : '#ff3b30',
        locked: !!n.locked,
        visible: n.visible !== false,
        zIndex: Number.isFinite(Number(n.zIndex)) ? Number(n.zIndex) : 0,
        typeId: String(n.typeId || 'round-11'),
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
      }))

      // ordena por zIndex
      this.nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      this.nodes.forEach((n, i) => (n.zIndex = i))

      if (data.view) {
        this.view = {
          x: Number(data.view.x || 0),
          y: Number(data.view.y || 0),
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

      this.selectedId = null
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = Date.now()
      this.autosave.isRestoring = false

      // guarda como autosave también (para persistir)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serializeDesign()))
        this.autosave.lastSavedAt = Date.now()
      } catch {
        // ignore
      }

      return true
    },

   exportMaterialsJson({ fileName = 'materiales.json', includeHidden = false, includeLocked = true, catalogTypes = [] } = {}) {
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

getPngDataUrl({ pixelRatio = 2, cropToContent = true } = {}) {
  if (!this.stage) return null

  const stage = this.stage

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

