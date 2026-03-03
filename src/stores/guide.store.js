// guide.store.js
import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import {
  createDefaultCanvasSettings,
  DEFAULT_DISPLAY_SCALE,
  MAX_CANVAS_CM,
  MAX_DISPLAY_SCALE,
  MIN_CANVAS_CM,
  MIN_DISPLAY_SCALE,
  PX_PER_CM,
} from '@/constants/canvas'

function uid() {
  return 'node_' + Math.random().toString(36).slice(2, 10)
}

function symbolUid() {
  return 'symbol_' + Math.random().toString(36).slice(2, 10)
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function normalizeCm(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_CANVAS_CM, Math.max(MIN_CANVAS_CM, n))
}

function serializeGuideNode(node) {
  const kind =
    node?.kind === 'text'
      ? 'text'
      : node?.kind === 'image'
        ? 'image'
        : node?.kind === 'symbol'
          ? 'symbol'
          : 'balloon'
  const rawScaleX = Number.isFinite(Number(node?.scaleX)) ? Number(node.scaleX) : 1
  const rawScaleY = Number.isFinite(Number(node?.scaleY)) ? Number(node.scaleY) : 1
  const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
  let scaleX = rawScaleX
  let scaleY = rawScaleY

  if (kind === 'balloon') {
    const baseRx = Number.isFinite(Number(meta.radiusX)) ? Number(meta.radiusX) : 46
    const baseRy = Number.isFinite(Number(meta.radiusY)) ? Number(meta.radiusY) : 60
    meta.radiusX = baseRx * Math.abs(rawScaleX || 1)
    meta.radiusY = baseRy * Math.abs(rawScaleY || 1)
    scaleX = 1
    scaleY = 1
  }

  return {
    id: node?.id,
    kind,
    symbolId: node?.symbolId || null,
    name: node?.name || '',
    x: node?.x,
    y: node?.y,
    rotation: node?.rotation,
    scaleX,
    scaleY,
    opacity: node?.opacity,
    color: node?.color,
    locked: !!node?.locked,
    visible: node?.visible !== false,
    zIndex: node?.zIndex ?? 0,
    typeId: node?.typeId || 'round-11',
    groupId: typeof node?.groupId === 'string' ? node.groupId : null,
    meta,
  }
}

const STORAGE_KEY = 'ballon_designer_autosave_guide_v1'

export const useGuideStore = defineStore('guide-editor', {
  state: () => ({
    nodes: [],
    symbols: [],

    // selección
    selectedId: null,
    selectedIds: [],
    selectedGroupId: null,

    // vista
    view: { x: 0, y: 0, scale: 1 },

    ui: {
      panMode: false,
      renderQuality: 'high',
      rasterOnPan: false,
      maxVisibleNodes: 2500,
      guideRemoveOnFill: true,
      groupEditMode: false,
      viewSide: 'front',
      stackGrid: {
        enabled: false,
        cols: 8,
        gap: 6,
        gapX: null,
        gapY: null,
        startX: 200,
        startY: 200,
        direction: 'row',
        pattern: 'normal',
        pickOrigin: false,
        resetOnConfig: false,
        anchors: [],
        presets: [],
        recentOrigins: [],
      },
      stackSelection: {
        preview: false,
      },
      symbolEdit: {
        active: false,
        symbolId: null,
        instanceId: null,
        selectedIds: [],
      },
      guideBoxMode: {
        active: false,
        action: null,
        removeGuides: false,
      },
      guideWall: null,
    },
    stackGridCursor: {
      col: 0,
      row: 0,
    },

    settings: {
      grid: true,
      snap: false, // snap al grid
      snapStep: 10,

      snapGuides: true, // snap a guías (otros globos / canvas)
      snapTolerance: 8, // px (en coords del canvas)
      snapGuidePriority: 'center-first', // 'center-first' | 'edges-first'
    },

    canvas: createDefaultCanvasSettings(),

    // runtime (no se serializa)
    stage: null,
    _beforeUnloadHandler: null,

    // autosave
    autosave: {
      enabled: true,
      isRestoring: false,
      isDirty: false,
      lastSavedAt: null, // timestamp
      timerId: null,
      debounceMs: 60000,
    },

    // grupos
    groups: [],

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
      max: 120,
      lock: false,
      timer: null,
      debounceMs: 250,
      batching: 0,
      batchDirty: false,
      batchLabel: '',
    },
  }),

  getters: {
    selectedNode(state) {
      if (state.ui?.symbolEdit?.active) {
        const symbol = (state.symbols || []).find(
          (s) => String(s.id) === String(state.ui.symbolEdit.symbolId),
        )
        const ids = state.ui.symbolEdit.selectedIds || []
        const id = ids.length ? ids[ids.length - 1] : null
        return symbol?.nodes?.find((n) => n.id === id) || null
      }
      return state.nodes.find((n) => n.id === state.selectedId) || null
    },

    selectedNodes(state) {
      if (state.ui?.symbolEdit?.active) {
        const symbol = (state.symbols || []).find(
          (s) => String(s.id) === String(state.ui.symbolEdit.symbolId),
        )
        const set = new Set(state.ui.symbolEdit.selectedIds || [])
        return (symbol?.nodes || []).filter((n) => set.has(n.id))
      }
      const set = new Set(state.selectedIds || [])
      return state.nodes.filter((n) => set.has(n.id))
    },

    visibleNodes(state) {
      return state.nodes.filter((n) => n.visible !== false)
    },

    symbolEditState(state) {
      return (
        state.ui?.symbolEdit || { active: false, symbolId: null, instanceId: null, selectedIds: [] }
      )
    },

    symbolEditSelectedNodes(state) {
      const edit = state.ui?.symbolEdit
      if (!edit?.active) return []
      const symbol = (state.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
      if (!symbol || !Array.isArray(symbol.nodes)) return []
      const set = new Set(edit.selectedIds || [])
      return symbol.nodes.filter((n) => set.has(n.id))
    },

    stackSelectionLayout(state) {
      const ids = Array.isArray(state.selectedIds) ? state.selectedIds : []
      if (ids.length < 2) return []

      const nodeById = new Map(state.nodes.map((n) => [String(n.id), n]))
      const nodes = ids
        .map((id) => nodeById.get(String(id)))
        .filter((n) => n && !n.locked && !n?.meta?.guide)

      if (nodes.length < 2) return []

      const grid = state.ui?.stackGrid || {}
      const cols = Math.max(1, Math.round(Number(grid.cols) || 1))
      const direction = grid.direction === 'col' ? 'col' : 'row'
      const pattern = grid.pattern === 'snake' ? 'snake' : 'normal'
      const gapX = Math.max(0, Math.round(Number(grid.gapX ?? grid.gap ?? 0) || 0))
      const gapY = Math.max(0, Math.round(Number(grid.gapY ?? grid.gap ?? 0) || 0))

      const boxes = nodes.map((n) => {
        const box = nodeBoundingBoxForSymbols(n, state.symbols)
        return {
          id: n.id,
          width: box.width,
          height: box.height,
          left: box.left,
          top: box.top,
        }
      })

      const maxW = Math.max(...boxes.map((b) => b.width))
      const maxH = Math.max(...boxes.map((b) => b.height))
      const minLeft = Math.min(...boxes.map((b) => b.left))
      const minTop = Math.min(...boxes.map((b) => b.top))

      const cellW = maxW + gapX
      const cellH = maxH + gapY

      return boxes.map((b, idx) => {
        const row = direction === 'row' ? Math.floor(idx / cols) : idx % cols
        const col = direction === 'row' ? idx % cols : Math.floor(idx / cols)
        const isAlt = direction === 'row' ? row % 2 === 1 : col % 2 === 1
        const useSnake = pattern === 'snake' && cols > 1
        const maxIndex = cols - 1
        const snakeCol = useSnake && direction === 'row' && isAlt ? maxIndex - col : col
        const snakeRow = useSnake && direction === 'col' && isAlt ? maxIndex - row : row
        return {
          id: b.id,
          x: minLeft + snakeCol * cellW + b.width / 2,
          y: minTop + snakeRow * cellH + b.height / 2,
          width: b.width,
          height: b.height,
        }
      })
    },

    canRestore() {
      try {
        return !!localStorage.getItem(STORAGE_KEY)
      } catch {
        return false
      }
    },

    materialsSummary(state) {
      const nodes = expandSymbolNodes(state.nodes, state.symbols, 4).filter(
        (n) =>
          n.visible !== false && n.kind !== 'text' && n.kind !== 'image' && n?.meta?.guide !== true,
      )
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
    markDirty(label = '') {
      if (this.history?.lock) return
      this.autosave.isDirty = true
      this.scheduleAutosave()
      this.scheduleHistoryCommit(label)
    },

    // ===== Core =====
    addNode({
      x = 100,
      y = 100,
      color = '#ff3b30',
      typeId = 'round-11',
      meta = {},
      kind = 'balloon',
      useStackGrid = false,
      name = '',
    } = {}) {
      const nextPos = useStackGrid
        ? this.getStackGridPosition(meta, { fallbackX: x, fallbackY: y })
        : null
      const node = {
        id: uid(),
        kind,
        name: String(name || '') || 'Globo',
        typeId,
        x: Number.isFinite(Number(nextPos?.x))
          ? Number(nextPos.x)
          : Number.isFinite(Number(x))
            ? Number(x)
            : 100,
        y: Number.isFinite(Number(nextPos?.y))
          ? Number(nextPos.y)
          : Number.isFinite(Number(y))
            ? Number(y)
            : 100,
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
          ...meta,
        },
      }

      this.nodes.push(node)
      this.select(node.id, { append: false })
      this.markDirty('Agregar globo')
      return node.id
    },

    getStackGridPosition(meta = {}, { fallbackX = 200, fallbackY = 200 } = {}) {
      const grid = this.ui?.stackGrid
      if (!grid?.enabled) return null

      const cols = Math.max(1, Math.round(Number(grid.cols) || 1))
      const direction = grid.direction === 'col' ? 'col' : 'row'
      const pattern = grid.pattern === 'snake' ? 'snake' : 'normal'
      const gapX = Math.max(0, Math.round(Number(grid.gapX ?? grid.gap ?? 0) || 0))
      const gapY = Math.max(0, Math.round(Number(grid.gapY ?? grid.gap ?? 0) || 0))
      const rx = Number(meta?.radiusX ?? 46)
      const ry = Number(meta?.radiusY ?? 60)
      const cellW = rx * 2 + gapX
      const cellH = ry * 2 + gapY

      const startX = Number.isFinite(Number(grid.startX))
        ? Number(grid.startX)
        : Number(fallbackX || 200)
      const startY = Number.isFinite(Number(grid.startY))
        ? Number(grid.startY)
        : Number(fallbackY || 200)

      const col = Math.max(0, Math.round(Number(this.stackGridCursor?.col || 0)))
      const row = Math.max(0, Math.round(Number(this.stackGridCursor?.row || 0)))
      const useSnake = pattern === 'snake' && cols > 1
      const maxIndex = cols - 1
      const isAlt = direction === 'row' ? row % 2 === 1 : col % 2 === 1
      const snakeCol = useSnake && direction === 'row' && isAlt ? maxIndex - col : col
      const snakeRow = useSnake && direction === 'col' && isAlt ? maxIndex - row : row

      const x = startX + snakeCol * cellW
      const y = startY + snakeRow * cellH

      let nextCol = col
      let nextRow = row
      if (direction === 'row') {
        nextCol = col + 1
        if (nextCol >= cols) {
          nextCol = 0
          nextRow += 1
        }
      } else {
        nextRow = row + 1
        if (nextRow >= cols) {
          nextRow = 0
          nextCol += 1
        }
      }

      this.stackGridCursor = { col: nextCol, row: nextRow }
      return { x, y }
    },

    setStackGridEnabled(enabled = false) {
      if (!this.ui?.stackGrid) return
      this.ui.stackGrid.enabled = !!enabled
      if (enabled) this.resetStackGridCursor()
      else this.ui.stackGrid.pickOrigin = false
    },

    setStackGridConfig({
      cols = null,
      gap = null,
      gapX = null,
      gapY = null,
      direction = null,
      pattern = null,
      startX = null,
      startY = null,
    } = {}) {
      if (!this.ui?.stackGrid) return
      if (cols !== null) this.ui.stackGrid.cols = Math.max(1, Math.round(Number(cols) || 1))
      if (gap !== null) this.ui.stackGrid.gap = Math.max(0, Math.round(Number(gap) || 0))
      if (gapX !== null) this.ui.stackGrid.gapX = Math.max(0, Math.round(Number(gapX) || 0))
      if (gapY !== null) this.ui.stackGrid.gapY = Math.max(0, Math.round(Number(gapY) || 0))
      if (direction) this.ui.stackGrid.direction = direction === 'col' ? 'col' : 'row'
      if (pattern) this.ui.stackGrid.pattern = pattern === 'snake' ? 'snake' : 'normal'
      if (startX !== null || startY !== null) {
        const next = clampStackOrigin(this, startX, startY)
        if (Number.isFinite(Number(next.x))) this.ui.stackGrid.startX = Number(next.x)
        if (Number.isFinite(Number(next.y))) this.ui.stackGrid.startY = Number(next.y)
      }
      if (this.ui.stackGrid.resetOnConfig) this.resetStackGridCursor()
    },

    resetStackGridRow() {
      const dir = this.ui?.stackGrid?.direction === 'col' ? 'col' : 'row'
      if (dir === 'row') {
        this.stackGridCursor = { col: 0, row: this.stackGridCursor?.row || 0 }
        return
      }
      this.stackGridCursor = { col: this.stackGridCursor?.col || 0, row: 0 }
    },

    setStackGridOrigin({ x, y } = {}) {
      if (!this.ui?.stackGrid) return
      const next = clampStackOrigin(this, x, y)
      if (Number.isFinite(Number(next.x))) this.ui.stackGrid.startX = Number(next.x)
      if (Number.isFinite(Number(next.y))) this.ui.stackGrid.startY = Number(next.y)
      this.pushRecentStackOrigin(next.x, next.y)
      this.resetStackGridCursor()
    },

    addStackGridAnchor(label = '') {
      if (!this.ui?.stackGrid) return
      const safeLabel =
        String(label || '').trim() || `Ancla ${this.ui.stackGrid.anchors.length + 1}`
      const anchors = Array.isArray(this.ui.stackGrid.anchors) ? this.ui.stackGrid.anchors : []
      this.ui.stackGrid.anchors = anchors.concat({
        label: safeLabel,
        startX: Number(this.ui.stackGrid.startX || 0),
        startY: Number(this.ui.stackGrid.startY || 0),
        cursor: { ...this.stackGridCursor },
      })
    },

    applyStackGridAnchor(index) {
      if (!this.ui?.stackGrid) return false
      const anchors = Array.isArray(this.ui.stackGrid.anchors) ? this.ui.stackGrid.anchors : []
      const target = anchors[Number(index)]
      if (!target) return false
      const next = clampStackOrigin(this, target.startX, target.startY)
      this.ui.stackGrid.startX = Number(next.x || 0)
      this.ui.stackGrid.startY = Number(next.y || 0)
      this.pushRecentStackOrigin(next.x, next.y)
      const c = target.cursor || { col: 0, row: 0 }
      this.stackGridCursor = { col: c.col || 0, row: c.row || 0 }
      return true
    },

    removeStackGridAnchor(index) {
      if (!this.ui?.stackGrid) return
      const anchors = Array.isArray(this.ui.stackGrid.anchors) ? this.ui.stackGrid.anchors : []
      const idx = Number(index)
      if (!Number.isFinite(idx) || idx < 0 || idx >= anchors.length) return
      this.ui.stackGrid.anchors = anchors.filter((_, i) => i !== idx)
    },

    addStackGridPreset(label = '') {
      if (!this.ui?.stackGrid) return
      const safeLabel =
        String(label || '').trim() || `Preset ${this.ui.stackGrid.presets.length + 1}`
      const presets = Array.isArray(this.ui.stackGrid.presets) ? this.ui.stackGrid.presets : []
      const grid = this.ui.stackGrid
      const preset = {
        label: safeLabel,
        cols: grid.cols,
        gap: grid.gap,
        gapX: grid.gapX,
        gapY: grid.gapY,
        startX: grid.startX,
        startY: grid.startY,
        direction: grid.direction,
        pattern: grid.pattern,
      }
      this.ui.stackGrid.presets = presets.concat(preset)
    },

    applyStackGridPreset(index) {
      if (!this.ui?.stackGrid) return false
      const presets = Array.isArray(this.ui.stackGrid.presets) ? this.ui.stackGrid.presets : []
      const target = presets[Number(index)]
      if (!target) return false
      this.setStackGridConfig({
        cols: target.cols,
        gap: target.gap,
        gapX: target.gapX,
        gapY: target.gapY,
        direction: target.direction,
        pattern: target.pattern,
        startX: target.startX,
        startY: target.startY,
      })
      this.resetStackGridCursor()
      this.pushRecentStackOrigin(this.ui.stackGrid.startX, this.ui.stackGrid.startY)
      return true
    },

    pushRecentStackOrigin(x, y) {
      if (!this.ui?.stackGrid) return
      const next = clampStackOrigin(this, x, y)
      const list = Array.isArray(this.ui.stackGrid.recentOrigins)
        ? this.ui.stackGrid.recentOrigins
        : []
      const entry = { x: Number(next.x || 0), y: Number(next.y || 0) }
      const deduped = list.filter((o) => o.x !== entry.x || o.y !== entry.y)
      const updated = [entry, ...deduped].slice(0, 3)
      this.ui.stackGrid.recentOrigins = updated
    },

    applyRecentStackOrigin(index) {
      if (!this.ui?.stackGrid) return false
      const list = Array.isArray(this.ui.stackGrid.recentOrigins)
        ? this.ui.stackGrid.recentOrigins
        : []
      const target = list[Number(index)]
      if (!target) return false
      const next = clampStackOrigin(this, target.x, target.y)
      this.ui.stackGrid.startX = Number(next.x || 0)
      this.ui.stackGrid.startY = Number(next.y || 0)
      this.resetStackGridCursor()
      this.pushRecentStackOrigin(next.x, next.y)
      return true
    },

    removeStackGridPreset(index) {
      if (!this.ui?.stackGrid) return
      const presets = Array.isArray(this.ui.stackGrid.presets) ? this.ui.stackGrid.presets : []
      const idx = Number(index)
      if (!Number.isFinite(idx) || idx < 0 || idx >= presets.length) return
      this.ui.stackGrid.presets = presets.filter((_, i) => i !== idx)
    },

    setStackGridPickOrigin(enabled = false) {
      if (!this.ui?.stackGrid?.enabled) return
      this.ui.stackGrid.pickOrigin = !!enabled
    },

    setStackGridResetOnConfig(enabled = false) {
      if (!this.ui?.stackGrid) return
      this.ui.stackGrid.resetOnConfig = !!enabled
    },

    setStackSelectionPreview(enabled = false) {
      if (!this.ui?.stackSelection) return
      this.ui.stackSelection.preview = !!enabled
    },

    resetStackGridCursor() {
      this.stackGridCursor = { col: 0, row: 0 }
    },

    stackSelectionGrid() {
      const layout = this.stackSelectionLayout
      if (!layout.length) return false

      const patchById = {}
      for (const item of layout) {
        patchById[item.id] = { x: item.x, y: item.y }
      }

      this.beginHistoryBatch()
      try {
        this.updateNodes(patchById)
      } finally {
        this.endHistoryBatch()
      }

      return true
    },

    // ===== Symbols =====
    createSymbolFromSelection({ name } = {}) {
      if (this.ui?.symbolEdit?.active) {
        const edit = this.ui.symbolEdit
        const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
        if (!symbol || !Array.isArray(symbol.nodes)) return null

        const selectedIds = new Set(edit.selectedIds || [])
        const selected = symbol.nodes.filter((n) => selectedIds.has(n.id) && !n?.meta?.guide)
        if (selected.length < 1) return null

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const n of selected) {
          const box = nodeBoundingBoxForSymbols(n, this.symbols)
          minX = Math.min(minX, box.left)
          minY = Math.min(minY, box.top)
          maxX = Math.max(maxX, box.right)
          maxY = Math.max(maxY, box.bottom)
        }

        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2

        const symbolId = symbolUid()
        const symbolName = String(name || '').trim() || `Simbolo ${this.symbols.length + 1}`
        const ordered = [...selected]

        const symbolNodes = ordered.map((n) => ({
          ...deepClone(n),
          id: uid(),
          x: Number(n.x || 0) - centerX,
          y: Number(n.y || 0) - centerY,
          groupId: null,
        }))

        const selectedSet = new Set(selected.map((n) => n.id))
        const original = symbol.nodes.slice()
        const insertAt = original.findIndex((n) => selectedSet.has(n.id))
        symbol.nodes = original.filter((n) => !selectedSet.has(n.id))

        this.symbols = [
          ...(this.symbols || []),
          { id: symbolId, name: symbolName, nodes: symbolNodes },
        ]

        const instanceId = uid()
        const instanceNode = {
          id: instanceId,
          kind: 'symbol',
          symbolId,
          x: centerX,
          y: centerY,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          locked: false,
          visible: true,
          zIndex: 0,
          groupId: null,
          meta: {},
        }

        const targetIndex = insertAt >= 0 ? insertAt : symbol.nodes.length
        symbol.nodes.splice(targetIndex, 0, instanceNode)

        edit.selectedIds = [instanceId]
        this.markDirty('Crear simbolo')
        return instanceId
      }

      const selected = this.selectedNodes.filter((n) => !n?.meta?.guide && n.kind !== 'symbol')
      if (selected.length < 1) return null

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const n of selected) {
        const box = nodeBoundingBoxForSymbols(n, this.symbols)
        minX = Math.min(minX, box.left)
        minY = Math.min(minY, box.top)
        maxX = Math.max(maxX, box.right)
        maxY = Math.max(maxY, box.bottom)
      }

      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      const symbolId = symbolUid()
      const symbolName = String(name || '').trim() || `Simbolo ${this.symbols.length + 1}`
      const ordered = [...selected].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

      const symbolNodes = ordered.map((n) => ({
        ...deepClone(n),
        id: uid(),
        x: Number(n.x || 0) - centerX,
        y: Number(n.y || 0) - centerY,
        groupId: null,
      }))

      const removeIds = new Set(selected.map((n) => n.id))
      this.nodes = this.nodes.filter((n) => !removeIds.has(n.id))
      applyGroupMembership(this)

      this.symbols = [
        ...(this.symbols || []),
        { id: symbolId, name: symbolName, nodes: symbolNodes },
      ]

      const instanceId = uid()
      this.nodes.push({
        id: instanceId,
        kind: 'symbol',
        symbolId,
        x: centerX,
        y: centerY,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: this.nodes.length,
        groupId: null,
        meta: {},
      })

      this.reindexZ()
      this.select(instanceId, { append: false })
      this.markDirty('Crear simbolo')
      return instanceId
    },

    addSymbolInstance(symbolId, { x = 200, y = 200 } = {}) {
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(symbolId))
      if (!symbol) return null
      const instanceId = uid()
      this.nodes.push({
        id: instanceId,
        kind: 'symbol',
        symbolId: symbol.id,
        x: Number.isFinite(Number(x)) ? Number(x) : 200,
        y: Number.isFinite(Number(y)) ? Number(y) : 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: this.nodes.length,
        groupId: null,
        meta: {},
      })
      this.select(instanceId, { append: false })
      this.markDirty('Agregar simbolo')
      return instanceId
    },

    enterSymbolEdit(instanceId) {
      const instance = this.nodes.find((n) => String(n.id) === String(instanceId))
      if (!instance || instance.kind !== 'symbol') return false
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(instance.symbolId))
      if (!symbol) return false
      const firstChildId = symbol.nodes?.length ? symbol.nodes[0].id : null
      const wasLocked = !!instance.locked
      if (!wasLocked) {
        instance.locked = true
        const meta = instance.meta && typeof instance.meta === 'object' ? { ...instance.meta } : {}
        meta.symbolEditLock = true
        instance.meta = meta
      }
      this.ui.symbolEdit = {
        active: true,
        symbolId: instance.symbolId,
        instanceId: instance.id,
        selectedIds: firstChildId ? [firstChildId] : [],
        instanceLocked: wasLocked,
      }
      this.clearSelection()
      return true
    },

    enterNestedSymbolEdit(nestedInstanceId) {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return false
      const parent = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
      if (!parent) return false
      const nested = parent.nodes?.find((n) => String(n.id) === String(nestedInstanceId))
      if (!nested || nested.kind !== 'symbol') return false

      const symbol = (this.symbols || []).find((s) => String(s.id) === String(nested.symbolId))
      if (!symbol) return false

      const firstChildId = symbol.nodes?.length ? symbol.nodes[0].id : null
      this.ui.symbolEdit = {
        active: true,
        symbolId: nested.symbolId,
        instanceId: nested.id,
        selectedIds: firstChildId ? [firstChildId] : [],
      }
      this.markDirty('Editar simbolo')
      return true
    },

    exitSymbolEdit({ selectInstance = true } = {}) {
      const instanceId = this.ui?.symbolEdit?.instanceId
      const wasLocked = this.ui?.symbolEdit?.instanceLocked
      this.ui.symbolEdit = { active: false, symbolId: null, instanceId: null, selectedIds: [] }
      if (instanceId) {
        const instance = this.nodes.find((n) => String(n.id) === String(instanceId))
        if (instance?.meta?.symbolEditLock) {
          instance.locked = false
          const nextMeta =
            instance.meta && typeof instance.meta === 'object' ? { ...instance.meta } : {}
          delete nextMeta.symbolEditLock
          instance.meta = nextMeta
        } else if (wasLocked !== undefined) {
          instance.locked = !!wasLocked
        }
      }
      if (selectInstance && instanceId) this.select(instanceId, { append: false })
    },

    selectSymbolNode(id, { append = false } = {}) {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return
      if (!append) {
        edit.selectedIds = [id]
        return
      }
      const set = new Set(edit.selectedIds || [])
      set.add(id)
      edit.selectedIds = [...set]
    },

    toggleSelectSymbolNode(id) {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return
      const set = new Set(edit.selectedIds || [])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      edit.selectedIds = [...set]
    },

    clearSymbolSelection() {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return
      edit.selectedIds = []
    },

    updateSymbolNode(symbolId, nodeId, patch) {
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(symbolId))
      if (!symbol) return
      const node = (symbol.nodes || []).find((n) => String(n.id) === String(nodeId))
      if (!node) return
      Object.assign(node, patch || {})
      this.markDirty('Actualizar simbolo')
    },

    updateSymbolNodes(symbolId, patchById = {}) {
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(symbolId))
      if (!symbol) return
      const map = patchById && typeof patchById === 'object' ? patchById : {}
      let changed = false
      for (const id of Object.keys(map)) {
        const node = (symbol.nodes || []).find((n) => String(n.id) === String(id))
        if (!node) continue
        Object.assign(node, map[id] || {})
        changed = true
      }
      if (changed) this.markDirty('Actualizar simbolo')
    },

    updateNodeName(id, name = '') {
      const node = this.nodes.find((n) => n.id === id)
      if (node) {
        node.name = String(name || '').trim()
        this.markDirty('Renombrar elemento')
        return
      }

      if (this.ui?.symbolEdit?.active) {
        const symbol = (this.symbols || []).find(
          (s) => String(s.id) === String(this.ui.symbolEdit.symbolId),
        )
        const target = symbol?.nodes?.find((n) => n.id === id)
        if (!target) return
        target.name = String(name || '').trim()
        this.markDirty('Renombrar simbolo')
      }
    },

    updateGroupName(id, name = '') {
      const group = (this.groups || []).find((g) => String(g.id) === String(id))
      if (!group) return
      group.name = String(name || '').trim() || 'Grupo'
      this.markDirty('Renombrar grupo')
    },

    updateSymbolName(id, name = '') {
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(id))
      if (!symbol) return
      symbol.name = String(name || '').trim() || 'Simbolo'
      this.markDirty('Renombrar simbolo')
    },

    duplicateSymbolSelection({ offset = 18 } = {}) {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return null
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
      if (!symbol) return null
      const selectedIds = new Set(edit.selectedIds || [])
      const selected = (symbol.nodes || []).filter((n) => selectedIds.has(n.id) && !n.locked)
      if (!selected.length) return null

      const nextNodes = selected.map((n) => {
        const safeMeta = n.meta && typeof n.meta === 'object' ? { ...n.meta } : {}
        return {
          ...deepClone(n),
          id: uid(),
          x: Number(n.x || 0) + offset,
          y: Number(n.y || 0) + offset,
          groupId: null,
          meta: safeMeta,
        }
      })

      symbol.nodes = [...(symbol.nodes || []), ...nextNodes]
      edit.selectedIds = nextNodes.map((n) => n.id)
      this.markDirty('Duplicar simbolo')
      return nextNodes.map((n) => n.id)
    },

    rotateSymbolSelection(delta = 0) {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return false
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
      if (!symbol) return false
      const selectedIds = new Set(edit.selectedIds || [])
      if (!selectedIds.size) return false
      for (const node of symbol.nodes || []) {
        if (!selectedIds.has(node.id) || node.locked) continue
        const next = clamp(Number(node.rotation || 0) + Number(delta || 0), -180, 180)
        node.rotation = next
      }
      this.markDirty('Rotar simbolo')
      return true
    },

    bringForwardSymbolSelection() {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return false
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
      if (!symbol) return false
      const ids = new Set(edit.selectedIds || [])
      if (!ids.size) return false

      const nodes = symbol.nodes || []
      for (let i = nodes.length - 2; i >= 0; i -= 1) {
        const a = nodes[i]
        const b = nodes[i + 1]
        if (ids.has(a.id) && !ids.has(b.id)) {
          nodes[i] = b
          nodes[i + 1] = a
        }
      }
      symbol.nodes = [...nodes]
      this.markDirty('Reordenar simbolo')
      return true
    },

    sendBackwardSymbolSelection() {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return false
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
      if (!symbol) return false
      const ids = new Set(edit.selectedIds || [])
      if (!ids.size) return false

      const nodes = symbol.nodes || []
      for (let i = 1; i < nodes.length; i += 1) {
        const a = nodes[i - 1]
        const b = nodes[i]
        if (ids.has(b.id) && !ids.has(a.id)) {
          nodes[i - 1] = b
          nodes[i] = a
        }
      }
      symbol.nodes = [...nodes]
      this.markDirty('Reordenar simbolo')
      return true
    },

    duplicateSymbol(id, { name } = {}) {
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(id))
      if (!symbol) return null
      const newId = symbolUid()
      const newName = String(name || '').trim() || `${symbol.name || 'Patron'} copia`
      const nodes = (symbol.nodes || []).map((n) => ({ ...deepClone(n), id: uid() }))
      this.symbols = [...(this.symbols || []), { id: newId, name: newName, nodes }]
      this.markDirty('Duplicar simbolo')
      return newId
    },

    detachSymbolInstance(instanceId) {
      const instance = this.nodes.find((n) => String(n.id) === String(instanceId))
      if (!instance || instance.kind !== 'symbol') return false
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(instance.symbolId))
      if (!symbol || !Array.isArray(symbol.nodes) || !symbol.nodes.length) return false

      const sx = Number.isFinite(Number(instance.scaleX)) ? Number(instance.scaleX) : 1
      const sy = Number.isFinite(Number(instance.scaleY)) ? Number(instance.scaleY) : 1
      const opacity = Number.isFinite(Number(instance.opacity)) ? Number(instance.opacity) : 1
      const rotation = Number.isFinite(Number(instance.rotation)) ? Number(instance.rotation) : 0

      const nextNodes = symbol.nodes.map((n) => ({
        ...deepClone(n),
        id: uid(),
        x: Number(instance.x || 0) + Number(n.x || 0) * sx,
        y: Number(instance.y || 0) + Number(n.y || 0) * sy,
        scaleX: Number.isFinite(Number(n.scaleX)) ? Number(n.scaleX) * sx : sx,
        scaleY: Number.isFinite(Number(n.scaleY)) ? Number(n.scaleY) * sy : sy,
        opacity: Number.isFinite(Number(n.opacity)) ? Number(n.opacity) * opacity : opacity,
        rotation: Number.isFinite(Number(n.rotation)) ? Number(n.rotation) + rotation : rotation,
        groupId: null,
      }))

      const idx = this.nodes.findIndex((n) => String(n.id) === String(instanceId))
      this.nodes = this.nodes.filter((n) => String(n.id) !== String(instanceId))
      const insertAt = idx >= 0 ? idx : this.nodes.length
      this.nodes.splice(insertAt, 0, ...nextNodes)

      this.reindexZ()
      this.setSelection(nextNodes.map((n) => n.id))
      this.markDirty('Desvincular simbolo')
      return true
    },

    deleteSymbolSelection() {
      const edit = this.ui?.symbolEdit
      if (!edit?.active) return false
      const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
      if (!symbol) return false
      const ids = new Set(edit.selectedIds || [])
      if (!ids.size) return false
      symbol.nodes = (symbol.nodes || []).filter((n) => !ids.has(n.id))
      edit.selectedIds = []
      this.markDirty('Eliminar simbolo')
      return true
    },

    addTextNode({ x = 160, y = 160, text = 'New text' } = {}) {
      const node = {
        id: uid(),
        kind: 'text',
        typeId: 'text',
        name: 'Texto',
        x: Number.isFinite(Number(x)) ? Number(x) : 160,
        y: Number.isFinite(Number(y)) ? Number(y) : 160,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        color: '#222222',
        locked: false,
        visible: true,
        zIndex: this.nodes.length,
        groupId: null,
        meta: {
          text: String(text || 'New text'),
          fontFamily: 'Times New Roman',
          fontSize: 24,
          align: 'left',
          fill: '#222222',
        },
      }

      this.nodes.push(node)
      this.select(node.id, { append: false })
      this.markDirty('Agregar texto')
      return node.id
    },

    addImageNode({ x = 160, y = 160, src = '', width = 160, height = 120 } = {}) {
      const node = {
        id: uid(),
        kind: 'image',
        typeId: 'image',
        name: 'Imagen',
        x: Number.isFinite(Number(x)) ? Number(x) : 160,
        y: Number.isFinite(Number(y)) ? Number(y) : 160,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        color: '#ffffff',
        locked: false,
        visible: true,
        zIndex: this.nodes.length,
        groupId: null,
        meta: {
          src: String(src || ''),
          width: Number(width || 160),
          height: Number(height || 120),
        },
      }

      this.nodes.push(node)
      this.select(node.id, { append: false })
      this.markDirty('Agregar imagen')
      return node.id
    },

    addArcTemplate({
      centerX = 200,
      centerY = 200,
      width = 520,
      height = 260,
      count = 32,
      radius = 22,
      rows = 2,
      spacing = 4,
      typeId = 'round-11',
      metaDefaults = null,
      colors = [],
      colorMode = 'sequence',
      name = 'Arco',
      group = false,
      guide = false,
    } = {}) {
      const safeCount = Math.max(1, Math.round(Number(count) || 1))
      const safeRows = Math.max(1, Math.min(6, Math.round(Number(rows) || 1)))
      const safeRadius = Math.max(6, Math.round(Number(radius) || 22))
      const safeSpacing = Math.max(0, Math.round(Number(spacing) || 0))
      const safeWidth = Math.max(120, Math.round(Number(width) || 520))
      const safeHeight = Math.max(80, Math.round(Number(height) || 260))
      const palette = Array.isArray(colors) ? colors.filter(Boolean) : []
      const fillColors = palette.length ? palette : ['#ff3b30']

      const baseMeta = metaDefaults && typeof metaDefaults === 'object' ? { ...metaDefaults } : {}
      const metaRadiusX = Number(baseMeta.radiusX)
      const metaRadiusY = Number(baseMeta.radiusY)
      const radiusX = Number.isFinite(metaRadiusX) ? metaRadiusX : safeRadius
      const radiusY = Number.isFinite(metaRadiusY) ? metaRadiusY : safeRadius
      const layoutRadius = Math.max(radiusX, radiusY)

      const cx = Number.isFinite(Number(centerX)) ? Number(centerX) : 200
      const cy = Number.isFinite(Number(centerY)) ? Number(centerY) : 200

      const ids = []
      const baseCount = Math.floor(safeCount / safeRows)
      const extra = safeCount % safeRows

      let colorIndex = 0
      const mode = colorMode === 'random' || colorMode === 'solid' ? colorMode : 'sequence'
      const isGuide = !!guide
      const pickColor = () => {
        if (!fillColors.length) return '#ff3b30'
        if (mode === 'random') {
          return fillColors[Math.floor(Math.random() * fillColors.length)]
        }
        if (mode === 'solid') return fillColors[0]
        const color = fillColors[colorIndex % fillColors.length]
        colorIndex += 1
        return color
      }
      const nextNodes = []

      this.beginHistoryBatch()
      try {
        const baseIndex = this.nodes.length

        for (let row = 0; row < safeRows; row += 1) {
          const rowCount = Math.max(1, baseCount + (row < extra ? 1 : 0))
          const inset = row * (layoutRadius * 2 + safeSpacing)
          const a = Math.max(layoutRadius * 2, safeWidth / 2 - inset)
          const b = Math.max(layoutRadius * 2, safeHeight - inset)

          for (let i = 0; i < rowCount; i += 1) {
            const t = rowCount === 1 ? 0.5 : i / (rowCount - 1)
            const angle = Math.PI - t * Math.PI
            const x = cx + a * Math.cos(angle)
            const y = cy - b * Math.sin(angle)
            const color = pickColor()
            const id = uid()

            const node = {
              id,
              kind: 'balloon',
              typeId: String(typeId || 'round-11'),
              x,
              y,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: isGuide ? 0.25 : 1,
              color,
              locked: isGuide ? true : false,
              visible: true,
              zIndex: baseIndex + nextNodes.length,
              groupId: null,
              meta: {
                ...baseMeta,
                radiusX,
                radiusY,
                knot: baseMeta.knot ?? true,
                shape: baseMeta.shape ?? 'ellipse',
                guide: isGuide,
              },
            }

            nextNodes.push(node)
            ids.push(id)
          }
        }

        if (nextNodes.length) {
          this.nodes.push(...nextNodes)
        }

        if (ids.length >= 2 && group) {
          this.createGroup({ name, childIds: ids })
        } else if (ids.length) {
          this.setSelection(ids)
        }

        if (nextNodes.length) {
          this.reindexZ()
          this.markDirty('Agregar arco')
        }
      } finally {
        this.endHistoryBatch()
      }

      return ids
    },

    addClusterTemplate({
      centerX = 200,
      centerY = 200,
      cols = 6,
      rows = 4,
      radius = 10,
      innerGap = 2,
      clusterGap = 14,
      colors = [],
      colorMode = 'sequence',
      name = 'Cluster',
      group = false,
      guide = false,
    } = {}) {
      const safeCols = Math.max(1, Math.round(Number(cols) || 1))
      const safeRows = Math.max(1, Math.round(Number(rows) || 1))
      const safeRadius = Math.max(4, Math.round(Number(radius) || 10))
      const safeInnerGap = Math.max(0, Math.round(Number(innerGap) || 0))
      const safeClusterGap = Math.max(0, Math.round(Number(clusterGap) || 0))
      const palette = Array.isArray(colors) ? colors.filter(Boolean) : []
      const fillColors = palette.length ? palette : ['#ff3b30']

      const cx = Number.isFinite(Number(centerX)) ? Number(centerX) : 200
      const cy = Number.isFinite(Number(centerY)) ? Number(centerY) : 200

      const offset = safeRadius + safeInnerGap
      const clusterSize = offset * 2
      const step = clusterSize + safeClusterGap
      const totalW = safeCols === 1 ? clusterSize : clusterSize + step * (safeCols - 1)
      const totalH = safeRows === 1 ? clusterSize : clusterSize + step * (safeRows - 1)
      const startX = cx - totalW / 2
      const startY = cy - totalH / 2

      const ids = []
      const nextNodes = []
      let colorIndex = 0
      const mode = colorMode === 'random' || colorMode === 'solid' ? colorMode : 'sequence'
      const isGuide = !!guide
      const pickColor = () => {
        if (!fillColors.length) return '#ff3b30'
        if (mode === 'random') {
          return fillColors[Math.floor(Math.random() * fillColors.length)]
        }
        if (mode === 'solid') return fillColors[0]
        const color = fillColors[colorIndex % fillColors.length]
        colorIndex += 1
        return color
      }

      this.beginHistoryBatch()
      try {
        const baseIndex = this.nodes.length

        for (let r = 0; r < safeRows; r += 1) {
          for (let c = 0; c < safeCols; c += 1) {
            const clusterX = startX + clusterSize / 2 + c * step
            const clusterY = startY + clusterSize / 2 + r * step
            const positions = [
              { x: clusterX - offset, y: clusterY - offset },
              { x: clusterX + offset, y: clusterY - offset },
              { x: clusterX - offset, y: clusterY + offset },
              { x: clusterX + offset, y: clusterY + offset },
            ]

            for (const p of positions) {
              const color = pickColor()
              const id = uid()

              nextNodes.push({
                id,
                kind: 'balloon',
                typeId: 'round-11',
                x: p.x,
                y: p.y,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                opacity: isGuide ? 0.25 : 1,
                color,
                locked: isGuide ? true : false,
                visible: true,
                zIndex: baseIndex + nextNodes.length,
                groupId: null,
                meta: {
                  radiusX: safeRadius,
                  radiusY: safeRadius,
                  knot: true,
                  shape: 'ellipse',
                  guide: isGuide,
                },
              })

              ids.push(id)
            }
          }
        }

        if (nextNodes.length) {
          this.nodes.push(...nextNodes)
        }

        if (ids.length >= 2 && group) {
          this.createGroup({ name, childIds: ids })
        } else if (ids.length) {
          this.setSelection(ids)
        }

        if (nextNodes.length) {
          this.reindexZ()
          this.markDirty('Agregar cluster')
        }
      } finally {
        this.endHistoryBatch()
      }

      return ids
    },

    convertGuidesToBalloons({ ids = null } = {}) {
      const set = Array.isArray(ids) ? new Set(ids) : null
      const targets = this.nodes.filter((n) => n?.meta?.guide && (!set || set.has(n.id)))
      if (!targets.length) return 0

      for (const n of targets) {
        n.locked = false
        n.opacity = 1
        const base = n.meta && typeof n.meta === 'object' ? n.meta : {}
        n.meta = { ...base, guide: false }
      }

      this.markDirty('Actualizar tipo')
      return targets.length
    },

    fillGuides({ removeGuides = false } = {}) {
      const guides = this.nodes.filter((n) => n?.meta?.guide)
      if (!guides.length) return []

      const nextNodes = []
      const ids = []
      const baseIndex = this.nodes.length

      for (const n of guides) {
        const id = uid()
        ids.push(id)
        nextNodes.push({
          id,
          kind: 'balloon',
          typeId: n.typeId || 'round-11',
          x: n.x,
          y: n.y,
          rotation: n.rotation || 0,
          scaleX: n.scaleX ?? 1,
          scaleY: n.scaleY ?? 1,
          opacity: 1,
          color: n.color || '#ff3b30',
          locked: false,
          visible: true,
          zIndex: baseIndex + nextNodes.length,
          groupId: null,
          meta: {
            ...(n.meta && typeof n.meta === 'object' ? n.meta : {}),
            guide: false,
          },
        })
      }

      if (removeGuides) {
        const guideSet = new Set(guides.map((n) => n.id))
        this.nodes = this.nodes.filter((n) => !guideSet.has(n.id))
      }

      this.nodes.push(...nextNodes)
      this.reindexZ()
      this.setSelection(ids)
      this.markDirty('Actualizar meta')
      return ids
    },

    convertGuidesInRect(rect, { color = null } = {}) {
      if (!rect || rect.width <= 0 || rect.height <= 0) return 0
      const guides = guidesInRect(this, rect, color)
      if (!guides.length) return 0
      return this.convertGuidesToBalloons({ ids: guides.map((n) => n.id) })
    },

    fillGuidesInRect(rect, { removeGuides = false, color = null } = {}) {
      if (!rect || rect.width <= 0 || rect.height <= 0) return []
      const guides = guidesInRect(this, rect, color)
      if (!guides.length) return []

      const nextNodes = []
      const ids = []
      const baseIndex = this.nodes.length

      for (const n of guides) {
        const id = uid()
        ids.push(id)
        nextNodes.push({
          id,
          kind: 'balloon',
          typeId: n.typeId || 'round-11',
          x: n.x,
          y: n.y,
          rotation: n.rotation || 0,
          scaleX: n.scaleX ?? 1,
          scaleY: n.scaleY ?? 1,
          opacity: 1,
          color: n.color || '#ff3b30',
          locked: false,
          visible: true,
          zIndex: baseIndex + nextNodes.length,
          groupId: null,
          meta: {
            ...(n.meta && typeof n.meta === 'object' ? n.meta : {}),
            guide: false,
          },
        })
      }

      if (removeGuides) {
        const guideSet = new Set(guides.map((n) => n.id))
        this.nodes = this.nodes.filter((n) => !guideSet.has(n.id))
      }

      this.nodes.push(...nextNodes)
      this.reindexZ()
      this.setSelection(ids)
      this.markDirty('Rellenar guia')
      return ids
    },

    updateNode(id, patch) {
      const node = this.nodes.find((n) => n.id === id)
      if (node) {
        if (this.ui?.symbolEdit?.active && String(id) === String(this.ui.symbolEdit.instanceId)) {
          const safePatch = patch && typeof patch === 'object' ? { ...patch } : {}
          delete safePatch.x
          delete safePatch.y
          delete safePatch.scaleX
          delete safePatch.scaleY
          delete safePatch.rotation
          if (!Object.keys(safePatch).length) return
          Object.assign(node, safePatch)
          this.markDirty('Actualizar globo')
          return
        }
        Object.assign(node, patch || {})
        this.markDirty('Actualizar globo')
        return
      }

      if (this.ui?.symbolEdit?.active) {
        this.updateSymbolNode(this.ui.symbolEdit.symbolId, id, patch)
      }
    },

    updateNodes(patchById = {}) {
      const map = patchById && typeof patchById === 'object' ? patchById : {}
      let changed = false
      const symbolPatch = {}
      for (const id of Object.keys(map)) {
        const node = this.nodes.find((n) => n.id === id)
        if (node) {
          if (this.ui?.symbolEdit?.active && String(id) === String(this.ui.symbolEdit.instanceId)) {
            const safePatch = map[id] && typeof map[id] === 'object' ? { ...map[id] } : {}
            delete safePatch.x
            delete safePatch.y
            delete safePatch.scaleX
            delete safePatch.scaleY
            delete safePatch.rotation
            if (Object.keys(safePatch).length) {
              Object.assign(node, safePatch)
              changed = true
            }
            continue
          }
          Object.assign(node, map[id] || {})
          changed = true
        } else if (this.ui?.symbolEdit?.active) {
          symbolPatch[id] = map[id]
        }
      }
      if (changed) this.markDirty('Actualizar globo')
      if (this.ui?.symbolEdit?.active && Object.keys(symbolPatch).length) {
        this.updateSymbolNodes(this.ui.symbolEdit.symbolId, symbolPatch)
      }
    },

    setNodeType(id, { typeId, metaDefaults = null, replaceMeta = true } = {}) {
      const node = this.nodes.find((n) => n.id === id)
      if (node) {
        node.typeId = String(typeId || node.typeId || 'round-11')

        if (metaDefaults && typeof metaDefaults === 'object') {
          if (replaceMeta) node.meta = { ...metaDefaults }
          else node.meta = { ...node.meta, ...metaDefaults }
        } else {
          node.meta = node.meta || {}
        }

        this.markDirty()
        return
      }

      if (this.ui?.symbolEdit?.active) {
        const symbol = (this.symbols || []).find(
          (s) => String(s.id) === String(this.ui.symbolEdit.symbolId),
        )
        const target = symbol?.nodes?.find((n) => n.id === id)
        if (!target) return
        target.typeId = String(typeId || target.typeId || 'round-11')
        if (metaDefaults && typeof metaDefaults === 'object') {
          if (replaceMeta) target.meta = { ...metaDefaults }
          else target.meta = { ...target.meta, ...metaDefaults }
        } else {
          target.meta = target.meta || {}
        }
        this.markDirty()
      }
    },

    updateNodeMeta(id, metaPatch = {}) {
      const node = this.nodes.find((n) => n.id === id)
      if (node) {
        node.meta = { ...node.meta, ...metaPatch }
        this.markDirty()
        return
      }

      if (this.ui?.symbolEdit?.active) {
        const symbol = (this.symbols || []).find(
          (s) => String(s.id) === String(this.ui.symbolEdit.symbolId),
        )
        const target = symbol?.nodes?.find((n) => n.id === id)
        if (!target) return
        target.meta = { ...target.meta, ...metaPatch }
        this.markDirty()
      }
    },

    // ===== Selección =====
    select(id, { append = false } = {}) {
      const node = this.nodes.find((n) => n.id === id)
      if (!node) return
      if (node?.meta?.guide) return

      const inGroupEdit = !!this.ui?.groupEditMode && !!this.selectedGroupId
      if (inGroupEdit) {
        if (!node.groupId || String(node.groupId) !== String(this.selectedGroupId)) return
      } else {
        this.selectedGroupId = null
      }

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
      const node = this.nodes.find((n) => n.id === id)
      if (!node) return
      if (node?.meta?.guide) return

      const inGroupEdit = !!this.ui?.groupEditMode && !!this.selectedGroupId
      if (inGroupEdit) {
        if (!node.groupId || String(node.groupId) !== String(this.selectedGroupId)) return
      } else {
        this.selectedGroupId = null
      }

      const set = new Set(this.selectedIds || [])
      if (set.has(id)) set.delete(id)
      else set.add(id)

      const arr = [...set]
      this.selectedIds = arr
      this.selectedId = arr.length ? arr[arr.length - 1] : null
    },

    setSelection(ids = []) {
      const nodeById = new Map(this.nodes.map((n) => [String(n.id), n]))
      const valid = (Array.isArray(ids) ? ids : [])
        .map((id) => nodeById.get(String(id)))
        .filter((n) => n && !n?.meta?.guide)
        .map((n) => n.id)
      this.selectedGroupId = null
      this.selectedIds = valid
      this.selectedId = valid.length ? valid[valid.length - 1] : null
    },

    clearSelection() {
      this.selectedId = null
      this.selectedIds = []
      if (this.pasteSession?.active) this.endPasteSession()
      this.selectedGroupId = null
    },

    selectGroup(groupId) {
      const groups = Array.isArray(this.groups) ? this.groups : []
      const group = groups.find((g) => String(g.id) === String(groupId))
      if (!group || !Array.isArray(group.childIds) || !group.childIds.length) return

      const nodeById = new Map(this.nodes.map((n) => [String(n.id), n]))
      const validIds = group.childIds
        .map((id) => nodeById.get(String(id)))
        .filter(Boolean)
        .map((n) => n.id)

      if (!validIds.length) return

      this.selectedGroupId = group.id
      this.selectedIds = validIds
      this.selectedId = validIds[validIds.length - 1]
    },

    setGroupEditMode({ enabled = false, groupId = null } = {}) {
      if (!this.ui) return false
      if (!enabled) {
        this.ui.groupEditMode = false
        if (this.selectedGroupId) this.selectGroup(this.selectedGroupId)
        return true
      }

      const targetGroupId = groupId || this.selectedGroupId || this.selectedNode?.groupId
      if (!targetGroupId) return false
      this.selectGroup(targetGroupId)
      this.ui.groupEditMode = true
      return true
    },

    groupSelection({ name } = {}) {
      const ids = Array.isArray(this.selectedIds) ? [...new Set(this.selectedIds)] : []
      return this.createGroup({ name, childIds: ids })
    },

    createGroup({ name, childIds = [] } = {}) {
      const nodesMap = new Map(this.nodes.map((n) => [String(n.id), n]))
      const ids = [...new Set((childIds || []).map((id) => String(id)))]
      const nodes = ids.map((id) => nodesMap.get(id)).filter(Boolean)
      if (nodes.length < 2) return null

      const groupId = groupUid()
      const orderName = name?.trim()
      const label = orderName || `Grupo ${this.groups.length + 1}`

      detachNodesFromGroups(this, ids)

      this.groups = [
        ...(this.groups || []),
        { id: groupId, name: label, childIds: nodes.map((n) => n.id) },
      ]
      applyGroupMembership(this)
      this.selectGroup(groupId)
      this.markDirty('Agrupar')
      return groupId
    },

    ungroup(groupId) {
      const targetId = String(groupId || '')
      if (!targetId) return

      const existing = Array.isArray(this.groups) ? this.groups : []
      const target = existing.find((g) => String(g.id) === targetId)
      if (!target) return

      const childIds = [...target.childIds]
      this.groups = existing.filter((g) => String(g.id) !== targetId)
      applyGroupMembership(this)
      this.setSelection(childIds)
      this.markDirty('Desagrupar')
    },

    ungroupSelected() {
      if (!this.selectedGroupId) return
      this.ungroup(this.selectedGroupId)
    },

    reorderGroupChildIds(groupId, orderedIds = []) {
      const gid = String(groupId || '')
      if (!gid) return

      const group = (this.groups || []).find((g) => String(g.id) === gid)
      if (!group) return

      const filtered = (Array.isArray(orderedIds) ? orderedIds : [])
        .map((id) => String(id))
        .filter((id) => group.childIds.includes(id))

      if (!filtered.length) return

      group.childIds = filtered

      const childSet = new Set(group.childIds)
      const nodeById = new Map(this.nodes.map((n) => [String(n.id), n]))
      const originalIndexes = this.nodes
        .map((n, idx) => ({ id: String(n.id), idx }))
        .filter((entry) => childSet.has(entry.id))
        .map((entry) => entry.idx)

      if (!originalIndexes.length) {
        this.markDirty('Actualizar globo')
        return
      }

      const minIndex = Math.min(...originalIndexes)
      const remaining = this.nodes.filter((n) => !childSet.has(String(n.id)))
      const before = remaining.slice(0, minIndex)
      const after = remaining.slice(minIndex)
      const orderedNodes = filtered.map((id) => nodeById.get(id)).filter(Boolean)

      this.nodes = [...before, ...orderedNodes, ...after]
      this.reindexZ()
      this.markDirty('Actualizar globo')
    },

    flipGroup({ axis = 'x', groupId = null } = {}) {
      if (this.ui?.symbolEdit?.active) return false
      const targetId = String(groupId || this.selectedGroupId || '')
      if (!targetId) return false

      const group = (this.groups || []).find((g) => String(g.id) === targetId)
      if (!group || !Array.isArray(group.childIds) || !group.childIds.length) return false

      const nodeById = new Map(this.nodes.map((n) => [String(n.id), n]))
      const nodes = group.childIds
        .map((id) => nodeById.get(String(id)))
        .filter((n) => n && !n?.meta?.guide)

      if (!nodes.length) return false

      const boxes = nodes.map((n) => nodeBoundingBoxForSymbols(n, this.symbols))
      const minLeft = Math.min(...boxes.map((b) => b.left))
      const maxRight = Math.max(...boxes.map((b) => b.right))
      const minTop = Math.min(...boxes.map((b) => b.top))
      const maxBottom = Math.max(...boxes.map((b) => b.bottom))

      if (
        !Number.isFinite(minLeft) ||
        !Number.isFinite(maxRight) ||
        !Number.isFinite(minTop) ||
        !Number.isFinite(maxBottom)
      )
        return false

      const centerX = (minLeft + maxRight) / 2
      const centerY = (minTop + maxBottom) / 2
      const axisKey = axis === 'y' || axis === 'vertical' ? 'y' : 'x'
      let changed = false

      for (const node of nodes) {
        if (node.locked) continue
        const meta = node.meta && typeof node.meta === 'object' ? { ...node.meta } : null
        if (axisKey === 'x') {
          const sx = Number.isFinite(Number(node.scaleX)) ? Number(node.scaleX) : 1
          const nextScaleX = sx === 0 ? -1 : -sx
          node.x = centerX - (Number(node.x || 0) - centerX)
          node.scaleX = nextScaleX
          if (meta?.topView && Number.isFinite(Number(meta.topView.x))) {
            meta.topView = { ...meta.topView, x: -Number(meta.topView.x) }
            node.meta = meta
          }
          changed = true
          continue
        }

        const sy = Number.isFinite(Number(node.scaleY)) ? Number(node.scaleY) : 1
        const nextScaleY = sy === 0 ? -1 : -sy
        node.y = centerY - (Number(node.y || 0) - centerY)
        node.scaleY = nextScaleY
        if (meta?.topView && Number.isFinite(Number(meta.topView.y))) {
          meta.topView = { ...meta.topView, y: -Number(meta.topView.y) }
          node.meta = meta
        }
        changed = true
      }

      if (changed) {
        const label = axisKey === 'x' ? 'Voltear grupo horizontal' : 'Voltear grupo vertical'
        this.markDirty(label)
      }

      return changed
    },

    toggleLockSelection() {
      const ids = Array.isArray(this.selectedIds) ? [...this.selectedIds] : []
      if (!ids.length) return

      const nodes = ids.map((id) => this.nodes.find((n) => n.id === id)).filter(Boolean)
      if (!nodes.length) return

      const allLocked = nodes.every((n) => !!n.locked)
      const target = !allLocked
      for (const node of nodes) {
        node.locked = target
      }
      this.markDirty()
    },

    // ===== Delete =====
    deleteSelected() {
      if (this.ui?.symbolEdit?.active) {
        this.deleteSymbolSelection()
        return
      }
      const ids = new Set(this.selectedIds || [])
      if (!ids.size) return
      this.nodes = this.nodes.filter((n) => !ids.has(n.id))
      this.clearSelection()
      applyGroupMembership(this)
      this.reindexZ()
      this.markDirty()
    },

    deleteGroupAndChildren(groupId) {
      const groups = Array.isArray(this.groups) ? this.groups : []
      const target = groups.find((g) => String(g.id) === String(groupId))
      if (!target) return false
      const childSet = new Set((target.childIds || []).map(String))
      if (!childSet.size) return false

      this.nodes = this.nodes.filter((n) => !childSet.has(String(n.id)))
      this.groups = groups.filter((g) => String(g.id) !== String(groupId))
      this.selectedGroupId = null
      this.clearSelection()
      applyGroupMembership(this)
      this.reindexZ()
      this.markDirty('Eliminar grupo')
      return true
    },

    deleteLayerSelection() {
      if (this.ui?.symbolEdit?.active) {
        return this.deleteSymbolSelection()
      }
      if (this.selectedGroupId) {
        return this.deleteGroupAndChildren(this.selectedGroupId)
      }
      this.deleteSelected()
      return true
    },

    // ===== Box select =====
    boxSelect(rect, { append = false } = {}) {
      if (!rect || rect.width <= 0 || rect.height <= 0) return

      const hit = []
      for (const n of this.nodes) {
        if (n.visible === false) continue
        if (n?.meta?.guide) continue

        const box = nodeBoundingBoxForSymbols(n, this.symbols)
        if (rectsIntersect(rect, { x: box.x, y: box.y, width: box.width, height: box.height })) {
          hit.push(n.id)
        }
      }

      if (!hit.length) return

      const groupById = new Map((this.groups || []).map((g) => [String(g.id), g]))
      const expandedSet = new Set(hit.map((id) => String(id)))
      const hitGroupIds = new Set()

      for (const id of hit) {
        const model = this.nodes.find((n) => String(n.id) === String(id))
        if (!model?.groupId) continue
        const groupId = String(model.groupId)
        const group = groupById.get(groupId)
        if (!group || !Array.isArray(group.childIds)) continue
        hitGroupIds.add(groupId)
        for (const childId of group.childIds) expandedSet.add(String(childId))
      }

      const expanded = [...expandedSet]

      if (!append) {
        this.selectedIds = expanded
        this.selectedId = expanded.length ? expanded[expanded.length - 1] : null

        if (hitGroupIds.size === 1) {
          const groupId = [...hitGroupIds][0]
          const group = groupById.get(groupId)
          const childIds = Array.isArray(group?.childIds)
            ? group.childIds.map((id) => String(id))
            : []
          const isExactGroup =
            childIds.length && childIds.length === expandedSet.size
              ? childIds.every((id) => expandedSet.has(id))
              : false
          this.selectedGroupId = isExactGroup ? groupId : null
        } else {
          this.selectedGroupId = null
        }
        return
      }

      const set = new Set(this.selectedIds || [])
      for (const id of expanded) set.add(id)
      this.selectedIds = [...set]
      this.selectedId = this.selectedIds.length
        ? this.selectedIds[this.selectedIds.length - 1]
        : null
      this.selectedGroupId = null
    },

    // ===== Grid =====
    toggleGrid() {
      this.settings.grid = !this.settings.grid
      this.markDirty()
    },

    // ===== Lock/Visible =====
    toggleLock(id) {
      const node = this.nodes.find((n) => n.id === id)
      if (!node) return
      node.locked = !node.locked
      this.markDirty()
    },

    toggleVisible(id) {
      const node = this.nodes.find((n) => n.id === id)
      if (!node) return
      node.visible = !(node.visible !== false)
      this.markDirty()
    },

    // ===== View =====
    setView(patch) {
      this.view = {
        x: Number.isFinite(patch?.x) ? patch.x : this.view.x,
        y: Number.isFinite(patch?.y) ? patch.y : this.view.y,
        scale: Number.isFinite(patch?.scale) ? clamp(patch.scale, 0.2, 4) : this.view.scale,
      }
    },

    resetView() {
      this.view = { x: 0, y: 0, scale: 1 }
    },

    setPanMode(value) {
      this.ui.panMode = !!value
    },

    setViewSide(side) {
      const next = side === 'back' ? 'back' : 'front'
      this.ui.viewSide = next
    },

    setCanvasDimensions({ widthCm, heightCm } = {}) {
      const nextWidth = normalizeCm(widthCm, this.canvas.widthCm)
      const nextHeight = normalizeCm(heightCm, this.canvas.heightCm)
      if (nextWidth === this.canvas.widthCm && nextHeight === this.canvas.heightCm) return

      this.canvas.widthCm = nextWidth
      this.canvas.heightCm = nextHeight
      this.markDirty()
    },

    setCanvasBackgroundColor(color) {
      const next = String(color || '').trim()
      if (!next) return
      if (next === this.canvas.backgroundColor) return
      this.canvas.backgroundColor = next
      this.markDirty()
    },

    setCanvasDisplayScale(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return
      const next = clamp(n, MIN_DISPLAY_SCALE, MAX_DISPLAY_SCALE)
      if (next === this.canvas.displayScale) return
      this.canvas.displayScale = next
      this.markDirty()
    },

    applyCanvasOffset({ xCm = 0, yCm = 0, relative = true } = {}) {
      const dx = Number.isFinite(Number(xCm)) ? Number(xCm) : 0
      const dy = Number.isFinite(Number(yCm)) ? Number(yCm) : 0
      if (!dx && !dy) return

      if (relative) {
        this.canvas.offsetXcm = (Number(this.canvas.offsetXcm) || 0) + dx
        this.canvas.offsetYcm = (Number(this.canvas.offsetYcm) || 0) + dy
      } else {
        this.canvas.offsetXcm = dx
        this.canvas.offsetYcm = dy
      }

      this.view.x += dx * PX_PER_CM
      this.view.y += dy * PX_PER_CM
      this.markDirty()
    },

    setCanvasLockRatio(value = true) {
      this.canvas.lockRatio = !!value
      this.markDirty()
    },

    setGuideWall(config = null) {
      this.ui.guideWall = config && typeof config === 'object' ? { ...config } : null
    },

    // ===== Z order =====
    reindexZ() {
      this.nodes.forEach((n, i) => (n.zIndex = i))
    },

    bringToFrontSelected() {
      const edit = this.ui?.symbolEdit
      if (edit?.active) {
        const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
        if (!symbol) return
        const ids = new Set(edit.selectedIds || [])
        if (!ids.size) return
        const keep = []
        const picked = []
        for (const n of symbol.nodes || []) {
          if (ids.has(n.id)) picked.push(n)
          else keep.push(n)
        }
        symbol.nodes = [...keep, ...picked]
        this.markDirty('Reordenar simbolo')
        return
      }
      const ids = Array.isArray(this.selectedIds) ? this.selectedIds : []
      if (!ids.length) return
      const set = new Set(ids)
      const keep = []
      const picked = []
      for (const n of this.nodes) {
        if (set.has(n.id)) picked.push(n)
        else keep.push(n)
      }
      this.nodes = [...keep, ...picked]
      this.reindexZ()
      this.markDirty()
    },

    sendToBackSelected() {
      const edit = this.ui?.symbolEdit
      if (edit?.active) {
        const symbol = (this.symbols || []).find((s) => String(s.id) === String(edit.symbolId))
        if (!symbol) return
        const ids = new Set(edit.selectedIds || [])
        if (!ids.size) return
        const keep = []
        const picked = []
        for (const n of symbol.nodes || []) {
          if (ids.has(n.id)) picked.push(n)
          else keep.push(n)
        }
        symbol.nodes = [...picked, ...keep]
        this.markDirty('Reordenar simbolo')
        return
      }
      const ids = Array.isArray(this.selectedIds) ? this.selectedIds : []
      if (!ids.length) return
      const set = new Set(ids)
      const keep = []
      const picked = []
      for (const n of this.nodes) {
        if (set.has(n.id)) picked.push(n)
        else keep.push(n)
      }
      this.nodes = [...picked, ...keep]
      this.reindexZ()
      this.markDirty()
    },

    bringForwardSelected() {
      if (this.ui?.symbolEdit?.active) {
        this.bringForwardSymbolSelection()
        return
      }
      const ids = Array.isArray(this.selectedIds) ? this.selectedIds : []
      if (!ids.length) return
      const set = new Set(ids)

      // recorrer de atrás hacia delante para mover 1 paso al frente
      for (let i = this.nodes.length - 2; i >= 0; i--) {
        const a = this.nodes[i]
        const b = this.nodes[i + 1]
        if (set.has(a.id) && !set.has(b.id)) {
          this.nodes[i] = b
          this.nodes[i + 1] = a
        }
      }

      this.reindexZ()
      this.markDirty()
    },

    sendBackwardSelected() {
      if (this.ui?.symbolEdit?.active) {
        this.sendBackwardSymbolSelection()
        return
      }
      const ids = Array.isArray(this.selectedIds) ? this.selectedIds : []
      if (!ids.length) return
      const set = new Set(ids)

      // recorrer hacia delante para mover 1 paso atrás
      for (let i = 1; i < this.nodes.length; i++) {
        const a = this.nodes[i - 1]
        const b = this.nodes[i]
        if (set.has(b.id) && !set.has(a.id)) {
          this.nodes[i - 1] = b
          this.nodes[i] = a
        }
      }

      this.reindexZ()
      this.markDirty()
    },

    reorderByIds(orderedIds) {
      const map = new Map(this.nodes.map((n) => [n.id, n]))
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

    // ===== Export PNG =====
    exportPng({
      pixelRatio = 2,
      cropToContent = false,
      fileName = 'diseno.png',
      useDisplayScale = true,
    } = {}) {
      const stage = this.stage
      if (!stage) {
        window.alert('Stage no está listo para exportar.')
        return
      }

      let dataUrl = null
      const ds = Number(this.canvas?.displayScale || 1)
      const scaleRatio = useDisplayScale ? ds : 1

      if (cropToContent) {
        const box = this.getContentBoundingBox()
        if (!box) {
          window.alert('No hay contenido para exportar.')
          return
        }

        dataUrl = stage.toDataURL({
          pixelRatio: pixelRatio * scaleRatio,
          x: box.x * scaleRatio,
          y: box.y * scaleRatio,
          width: box.width * scaleRatio,
          height: box.height * scaleRatio,
        })
      } else {
        dataUrl = stage.toDataURL({ pixelRatio: pixelRatio * scaleRatio })
      }

      downloadDataUrl(dataUrl, fileName)
    },

    exportJpg({
      pixelRatio = 2,
      cropToContent = false,
      fileName = 'diseno.jpg',
      useDisplayScale = true,
      quality = 0.92,
    } = {}) {
      const stage = this.stage
      if (!stage) {
        window.alert('Stage no está listo para exportar.')
        return
      }

      let dataUrl = null
      const ds = Number(this.canvas?.displayScale || 1)
      const scaleRatio = useDisplayScale ? ds : 1
      const safeQuality = Number.isFinite(Number(quality))
        ? Math.min(1, Math.max(0.1, quality))
        : 0.92

      if (cropToContent) {
        const box = this.getContentBoundingBox()
        if (!box) {
          window.alert('No hay contenido para exportar.')
          return
        }

        dataUrl = stage.toDataURL({
          pixelRatio: pixelRatio * scaleRatio,
          x: box.x * scaleRatio,
          y: box.y * scaleRatio,
          width: box.width * scaleRatio,
          height: box.height * scaleRatio,
          mimeType: 'image/jpeg',
          quality: safeQuality,
        })
      } else {
        dataUrl = stage.toDataURL({
          pixelRatio: pixelRatio * scaleRatio,
          mimeType: 'image/jpeg',
          quality: safeQuality,
        })
      }

      downloadDataUrl(dataUrl, fileName)
    },

    getPngDataUrl({ pixelRatio = 2, cropToContent = true, useDisplayScale = true } = {}) {
      const stage = this.stage
      if (!stage) return null

      const ds = Number(this.canvas?.displayScale || 1)
      const scaleRatio = useDisplayScale ? ds : 1

      if (cropToContent) {
        const box = this.getContentBoundingBox()
        if (!box) return null

        return stage.toDataURL({
          pixelRatio: pixelRatio * scaleRatio,
          x: box.x * scaleRatio,
          y: box.y * scaleRatio,
          width: box.width * scaleRatio,
          height: box.height * scaleRatio,
        })
      }

      return stage.toDataURL({ pixelRatio: pixelRatio * scaleRatio })
    },

    getContentBoundingBox(padding = 40) {
      const stage = this.stage
      if (!stage) return null

      const groups = stage.find('Group').filter((g) => {
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
    initAutosave({ skipRestore = false } = {}) {
      try {
        const saved = localStorage.getItem('autosave_enabled_guide')
        if (saved !== null) this.autosave.enabled = saved === 'true'
        else this.autosave.enabled = true
      } catch {
        // ignore
      }
      if (!skipRestore) this.restoreFromStorage({ silent: true })
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
      if (!this.autosave.enabled) return
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
      const store = this?.$id ? this : useGuideStore()

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

    markSaved() {
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = Date.now()
      this.clearAutosaveTimer()
    },

    setAutosaveEnabled(value) {
      const next = !!value
      if (this.autosave.enabled === next) return
      this.autosave.enabled = next
      try {
        localStorage.setItem('autosave_enabled_guide', String(next))
      } catch {
        // ignore
      }
      if (!next) {
        this.clearAutosaveTimer()
        return
      }
      if (this.autosave.isDirty) this.scheduleAutosave()
    },

    serializeDesign() {
      return {
        version: 1,
        savedAt: Date.now(),
        nodes: this.nodes.map((n) => ({
          id: n.id,
          kind: n.kind || 'balloon',
          symbolId: n.symbolId || null,
          name: n.name || '',
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
          groupId: typeof n.groupId === 'string' ? n.groupId : null,
          meta: n.meta || {},
        })),
        symbols: (this.symbols || []).map((s) => ({
          id: s.id,
          name: String(s.name || 'Simbolo'),
          nodes: (s.nodes || []).map((n) => ({
            id: n.id,
            kind: n.kind || 'balloon',
            symbolId: n.symbolId || null,
            name: n.name || '',
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
            groupId: typeof n.groupId === 'string' ? n.groupId : null,
            meta: n.meta || {},
          })),
        })),
        groups: (this.groups || []).map((g) => ({
          id: g.id,
          name: g.name,
          childIds: Array.isArray(g.childIds) ? g.childIds : [],
        })),
        view: { ...this.view },
        settings: { ...this.settings },
        ui: {
          stackGrid: {
            anchors: Array.isArray(this.ui?.stackGrid?.anchors) ? this.ui.stackGrid.anchors : [],
            presets: Array.isArray(this.ui?.stackGrid?.presets) ? this.ui.stackGrid.presets : [],
            recentOrigins: Array.isArray(this.ui?.stackGrid?.recentOrigins)
              ? this.ui.stackGrid.recentOrigins
              : [],
          },
        },
        canvas: {
          widthCm: Number(this.canvas.widthCm || 0),
          heightCm: Number(this.canvas.heightCm || 0),
          offsetXcm: Number(this.canvas.offsetXcm || 0),
          offsetYcm: Number(this.canvas.offsetYcm || 0),
          lockRatio: !!this.canvas.lockRatio,
          backgroundColor: this.canvas.backgroundColor || '#ffffff',
          displayScale: Number(this.canvas.displayScale || DEFAULT_DISPLAY_SCALE),
        },
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

      this.nodes = data.nodes.map((n) => ({
        id: String(n.id || uid()),
        kind:
          n.kind === 'text'
            ? 'text'
            : n.kind === 'image'
              ? 'image'
              : n.kind === 'symbol'
                ? 'symbol'
                : 'balloon',
        symbolId: n.symbolId ? String(n.symbolId) : null,
        name: typeof n.name === 'string' ? n.name : '',
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
        groupId: typeof n.groupId === 'string' ? n.groupId : null,
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
      }))

      this.symbols = (Array.isArray(data.symbols) ? data.symbols : []).map((s) => ({
        id: String(s?.id || symbolUid()),
        name: typeof s?.name === 'string' ? s.name : 'Simbolo',
        nodes: (Array.isArray(s?.nodes) ? s.nodes : []).map((n) => ({
          id: String(n.id || uid()),
          kind:
            n.kind === 'text'
              ? 'text'
              : n.kind === 'image'
                ? 'image'
                : n.kind === 'symbol'
                  ? 'symbol'
                  : 'balloon',
          symbolId: n.symbolId ? String(n.symbolId) : null,
          name: typeof n.name === 'string' ? n.name : '',
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
          groupId: typeof n.groupId === 'string' ? n.groupId : null,
          meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
        })),
      }))

      this.groups = (Array.isArray(data.groups) ? data.groups : [])
        .map((g) => ({
          id: String(g?.id || groupUid()),
          name: typeof g?.name === 'string' ? g.name : 'Grupo',
          childIds: Array.isArray(g?.childIds) ? g.childIds.map((id) => String(id)) : [],
        }))
        .filter((g) => g.childIds.length)
      applyGroupMembership(this)
      const defaults = createDefaultCanvasSettings()
      const canvasPayload = data.canvas || {}
      this.canvas = {
        widthCm: normalizeCm(canvasPayload.widthCm, defaults.widthCm),
        heightCm: normalizeCm(canvasPayload.heightCm, defaults.heightCm),
        offsetXcm: Number.isFinite(Number(canvasPayload.offsetXcm))
          ? Number(canvasPayload.offsetXcm)
          : defaults.offsetXcm,
        offsetYcm: Number.isFinite(Number(canvasPayload.offsetYcm))
          ? Number(canvasPayload.offsetYcm)
          : defaults.offsetYcm,
        lockRatio:
          typeof canvasPayload.lockRatio === 'boolean'
            ? canvasPayload.lockRatio
            : defaults.lockRatio,
        backgroundColor: canvasPayload.backgroundColor || defaults.backgroundColor,
        displayScale: clamp(
          Number(canvasPayload.displayScale || defaults.displayScale),
          MIN_DISPLAY_SCALE,
          MAX_DISPLAY_SCALE,
        ),
      }

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

      if (data.ui?.stackGrid) {
        const sg = data.ui.stackGrid
        if (Array.isArray(sg.anchors)) this.ui.stackGrid.anchors = sg.anchors
        if (Array.isArray(sg.presets)) this.ui.stackGrid.presets = sg.presets
        if (Array.isArray(sg.recentOrigins)) this.ui.stackGrid.recentOrigins = sg.recentOrigins
      }

      this.ui.symbolEdit = { active: false, symbolId: null, instanceId: null, selectedIds: [] }

      this.clearSelection()
      this.autosave.isDirty = false
      this.autosave.lastSavedAt = Number(data.savedAt || Date.now())

      this.autosave.isRestoring = false

      if (!silent) {
        // feedback opcional
      }

      return true
    },

    restoreFromPayload(data, { silent = false } = {}) {
      if (!data || !Array.isArray(data.nodes)) return false

      this.autosave.isRestoring = true

      this.nodes = data.nodes.map((n) => ({
        id: String(n.id || uid()),
        kind:
          n.kind === 'text'
            ? 'text'
            : n.kind === 'image'
              ? 'image'
              : n.kind === 'symbol'
                ? 'symbol'
                : 'balloon',
        symbolId: n.symbolId ? String(n.symbolId) : null,
        name: typeof n.name === 'string' ? n.name : '',
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
        groupId: typeof n.groupId === 'string' ? n.groupId : null,
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
      }))

      this.symbols = (Array.isArray(data.symbols) ? data.symbols : []).map((s) => ({
        id: String(s?.id || symbolUid()),
        name: typeof s?.name === 'string' ? s.name : 'Simbolo',
        nodes: (Array.isArray(s?.nodes) ? s.nodes : []).map((n) => ({
          id: String(n.id || uid()),
          kind:
            n.kind === 'text'
              ? 'text'
              : n.kind === 'image'
                ? 'image'
                : n.kind === 'symbol'
                  ? 'symbol'
                  : 'balloon',
          symbolId: n.symbolId ? String(n.symbolId) : null,
          name: typeof n.name === 'string' ? n.name : '',
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
          groupId: typeof n.groupId === 'string' ? n.groupId : null,
          meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
        })),
      }))

      this.groups = (Array.isArray(data.groups) ? data.groups : [])
        .map((g) => ({
          id: String(g?.id || groupUid()),
          name: typeof g?.name === 'string' ? g.name : 'Grupo',
          childIds: Array.isArray(g?.childIds) ? g.childIds.map((id) => String(id)) : [],
        }))
        .filter((g) => g.childIds.length)
      applyGroupMembership(this)

      const defaults = createDefaultCanvasSettings()
      const canvasPayload = data.canvas || {}
      this.canvas = {
        widthCm: normalizeCm(canvasPayload.widthCm, defaults.widthCm),
        heightCm: normalizeCm(canvasPayload.heightCm, defaults.heightCm),
        offsetXcm: Number.isFinite(Number(canvasPayload.offsetXcm))
          ? Number(canvasPayload.offsetXcm)
          : defaults.offsetXcm,
        offsetYcm: Number.isFinite(Number(canvasPayload.offsetYcm))
          ? Number(canvasPayload.offsetYcm)
          : defaults.offsetYcm,
        lockRatio:
          typeof canvasPayload.lockRatio === 'boolean'
            ? canvasPayload.lockRatio
            : defaults.lockRatio,
        backgroundColor: canvasPayload.backgroundColor || defaults.backgroundColor,
        displayScale: clamp(
          Number(canvasPayload.displayScale || defaults.displayScale),
          MIN_DISPLAY_SCALE,
          MAX_DISPLAY_SCALE,
        ),
      }

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

      if (data.ui?.stackGrid) {
        const sg = data.ui.stackGrid
        if (Array.isArray(sg.anchors)) this.ui.stackGrid.anchors = sg.anchors
        if (Array.isArray(sg.presets)) this.ui.stackGrid.presets = sg.presets
        if (Array.isArray(sg.recentOrigins)) this.ui.stackGrid.recentOrigins = sg.recentOrigins
      }

      this.ui.symbolEdit = { active: false, symbolId: null, instanceId: null, selectedIds: [] }

      this.clearSelection()
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

    resetDesignState({ clearAutosave = true } = {}) {
      this.nodes = []
      this.symbols = []
      this.groups = []
      this.clearSelection()
      this.view = { x: 0, y: 0, scale: 1 }
      this.settings = { ...this.settings, grid: true, snap: false, snapStep: 10 }
      this.canvas = createDefaultCanvasSettings()
      this.ui.symbolEdit = { active: false, symbolId: null, instanceId: null, selectedIds: [] }

      if (clearAutosave) {
        this.clearSavedDesign()
        this.autosave.isDirty = false
        this.autosave.lastSavedAt = null
      }

      this.initHistory()
    },

    newDesign() {
      const ok = window.confirm('¿Crear un diseño nuevo? Se perderá el estado actual (autosave).')
      if (!ok) return

      this.resetDesignState({ clearAutosave: true })
    },

    restoreDesignPrompt() {
      const ok = window.confirm('¿Restaurar el último autosave? Esto reemplaza el estado actual.')
      if (!ok) return
      this.restoreFromStorage({ silent: true })
      this.initHistory()
    },

    // ===== Export/Import JSON =====
    exportJson({ fileName = 'diseno.json', payload = null } = {}) {
      const data = payload && typeof payload === 'object' ? payload : this.serializeDesign()
      downloadJson(data, fileName)
    },

    buildGuideJsonPayload({ visibleOnly = false } = {}) {
      const nodes = visibleOnly ? this.nodes.filter((n) => n.visible !== false) : this.nodes
      const nodeIds = new Set(nodes.map((n) => String(n.id)))
      const symbolIds = new Set(
        nodes.filter((n) => n.kind === 'symbol' && n.symbolId).map((n) => String(n.symbolId)),
      )

      if (visibleOnly && symbolIds.size) {
        const byId = new Map((this.symbols || []).map((s) => [String(s.id), s]))
        const queue = [...symbolIds]
        while (queue.length) {
          const currentId = queue.shift()
          const symbol = byId.get(String(currentId))
          if (!symbol) continue
          for (const n of symbol.nodes || []) {
            if (n?.kind === 'symbol' && n.symbolId) {
              const nestedId = String(n.symbolId)
              if (!symbolIds.has(nestedId)) {
                symbolIds.add(nestedId)
                queue.push(nestedId)
              }
            }
          }
        }
      }

      const symbols = visibleOnly
        ? (this.symbols || []).filter((s) => symbolIds.has(String(s.id)))
        : this.symbols || []

      const groups = visibleOnly
        ? (this.groups || [])
            .map((g) => ({
              id: g.id,
              name: g.name,
              childIds: (Array.isArray(g.childIds) ? g.childIds : []).filter((id) =>
                nodeIds.has(String(id)),
              ),
            }))
            .filter((g) => g.childIds.length)
        : (this.groups || []).map((g) => ({
            id: g.id,
            name: g.name,
            childIds: Array.isArray(g.childIds) ? g.childIds : [],
          }))

      return {
        version: 1,
        savedAt: Date.now(),
        type: 'guide-wall',
        guideWall: this.ui?.guideWall || null,
        canvas: {
          widthCm: Number(this.canvas.widthCm || 0),
          heightCm: Number(this.canvas.heightCm || 0),
          offsetXcm: Number(this.canvas.offsetXcm || 0),
          offsetYcm: Number(this.canvas.offsetYcm || 0),
          lockRatio: !!this.canvas.lockRatio,
          backgroundColor: this.canvas.backgroundColor || '#ffffff',
          displayScale: Number(this.canvas.displayScale || DEFAULT_DISPLAY_SCALE),
        },
        nodes: nodes.map((n) => serializeGuideNode(n)),
        symbols: symbols.map((s) => ({
          id: s.id,
          name: String(s.name || 'Simbolo'),
          nodes: (s.nodes || []).map((n) => serializeGuideNode(n)),
        })),
        groups,
      }
    },

    exportGuideJson({ fileName = 'guia.json', visibleOnly = false } = {}) {
      const payload = this.buildGuideJsonPayload({ visibleOnly })
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

      this.nodes = data.nodes.map((n) => ({
        id: String(n.id || uid()),
        kind:
          n.kind === 'text'
            ? 'text'
            : n.kind === 'image'
              ? 'image'
              : n.kind === 'symbol'
                ? 'symbol'
                : 'balloon',
        symbolId: n.symbolId ? String(n.symbolId) : null,
        name: typeof n.name === 'string' ? n.name : '',
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
        groupId: typeof n.groupId === 'string' ? n.groupId : null,
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
      }))

      this.symbols = (Array.isArray(data.symbols) ? data.symbols : []).map((s) => ({
        id: String(s?.id || symbolUid()),
        name: typeof s?.name === 'string' ? s.name : 'Simbolo',
        nodes: (Array.isArray(s?.nodes) ? s.nodes : []).map((n) => ({
          id: String(n.id || uid()),
          kind:
            n.kind === 'text'
              ? 'text'
              : n.kind === 'image'
                ? 'image'
                : n.kind === 'symbol'
                  ? 'symbol'
                  : 'balloon',
          symbolId: n.symbolId ? String(n.symbolId) : null,
          name: typeof n.name === 'string' ? n.name : '',
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
          groupId: typeof n.groupId === 'string' ? n.groupId : null,
          meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
        })),
      }))

      const defaults = createDefaultCanvasSettings()
      const canvasPayload = data.canvas || {}
      this.canvas = {
        widthCm: normalizeCm(canvasPayload.widthCm, defaults.widthCm),
        heightCm: normalizeCm(canvasPayload.heightCm, defaults.heightCm),
        offsetXcm: Number.isFinite(Number(canvasPayload.offsetXcm))
          ? Number(canvasPayload.offsetXcm)
          : defaults.offsetXcm,
        offsetYcm: Number.isFinite(Number(canvasPayload.offsetYcm))
          ? Number(canvasPayload.offsetYcm)
          : defaults.offsetYcm,
        lockRatio:
          typeof canvasPayload.lockRatio === 'boolean'
            ? canvasPayload.lockRatio
            : defaults.lockRatio,
        backgroundColor: canvasPayload.backgroundColor || defaults.backgroundColor,
        displayScale: clamp(
          Number(canvasPayload.displayScale || defaults.displayScale),
          MIN_DISPLAY_SCALE,
          MAX_DISPLAY_SCALE,
        ),
      }

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

      if (data.ui?.stackGrid) {
        const sg = data.ui.stackGrid
        if (Array.isArray(sg.anchors)) this.ui.stackGrid.anchors = sg.anchors
        if (Array.isArray(sg.presets)) this.ui.stackGrid.presets = sg.presets
        if (Array.isArray(sg.recentOrigins)) this.ui.stackGrid.recentOrigins = sg.recentOrigins
      }

      this.ui.symbolEdit = { active: false, symbolId: null, instanceId: null, selectedIds: [] }

      this.clearSelection()
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

    importGuideJsonObject(data) {
      if (!data || !Array.isArray(data.nodes)) {
        window.alert('Archivo inválido: no contiene nodos.')
        return false
      }

      const ok = window.confirm('¿Importar esta guia? Esto reemplaza el estado actual.')
      if (!ok) return false

      this.autosave.isRestoring = true

      this.nodes = data.nodes.map((n) => ({
        id: String(n.id || uid()),
        kind:
          n.kind === 'text'
            ? 'text'
            : n.kind === 'image'
              ? 'image'
              : n.kind === 'symbol'
                ? 'symbol'
                : 'balloon',
        symbolId: n.symbolId ? String(n.symbolId) : null,
        name: typeof n.name === 'string' ? n.name : '',
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
        groupId: typeof n.groupId === 'string' ? n.groupId : null,
        meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
      }))

      this.symbols = (Array.isArray(data.symbols) ? data.symbols : []).map((s) => ({
        id: String(s?.id || symbolUid()),
        name: typeof s?.name === 'string' ? s.name : 'Simbolo',
        nodes: (Array.isArray(s?.nodes) ? s.nodes : []).map((n) => ({
          id: String(n.id || uid()),
          kind:
            n.kind === 'text'
              ? 'text'
              : n.kind === 'image'
                ? 'image'
                : n.kind === 'symbol'
                  ? 'symbol'
                  : 'balloon',
          symbolId: n.symbolId ? String(n.symbolId) : null,
          name: typeof n.name === 'string' ? n.name : '',
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
          groupId: typeof n.groupId === 'string' ? n.groupId : null,
          meta: typeof n.meta === 'object' && n.meta ? n.meta : {},
        })),
      }))

      this.groups = (Array.isArray(data.groups) ? data.groups : []).map((g) => ({
        id: String(g.id || uid()),
        name: typeof g.name === 'string' ? g.name : 'Grupo',
        childIds: Array.isArray(g.childIds) ? g.childIds : [],
      }))

      const defaults = createDefaultCanvasSettings()
      const canvasPayload = data.canvas || {}
      const guideWallPayload = data.guideWall || {}
      const fallbackWidth = Number.isFinite(Number(guideWallPayload.widthCm))
        ? Number(guideWallPayload.widthCm)
        : defaults.widthCm
      const fallbackHeight = Number.isFinite(Number(guideWallPayload.heightCm))
        ? Number(guideWallPayload.heightCm)
        : defaults.heightCm

      this.canvas = {
        widthCm: normalizeCm(canvasPayload.widthCm, fallbackWidth),
        heightCm: normalizeCm(canvasPayload.heightCm, fallbackHeight),
        offsetXcm: Number.isFinite(Number(canvasPayload.offsetXcm))
          ? Number(canvasPayload.offsetXcm)
          : defaults.offsetXcm,
        offsetYcm: Number.isFinite(Number(canvasPayload.offsetYcm))
          ? Number(canvasPayload.offsetYcm)
          : defaults.offsetYcm,
        lockRatio:
          typeof canvasPayload.lockRatio === 'boolean'
            ? canvasPayload.lockRatio
            : defaults.lockRatio,
        backgroundColor: canvasPayload.backgroundColor || defaults.backgroundColor,
        displayScale: clamp(
          Number(canvasPayload.displayScale || defaults.displayScale),
          MIN_DISPLAY_SCALE,
          MAX_DISPLAY_SCALE,
        ),
      }

      this.ui.guideWall =
        guideWallPayload && typeof guideWallPayload === 'object' ? guideWallPayload : null

      this.nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      this.reindexZ()

      this.ui.symbolEdit = { active: false, symbolId: null, instanceId: null, selectedIds: [] }
      this.clearSelection()
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
      const typeMap = new Map(types.map((t) => [t.id, t]))

      const nodes = expandSymbolNodes(this.nodes, this.symbols, 4, {
        includeHidden,
        includeLocked,
      }).filter((n) => {
        const isHidden = n.visible === false
        const isLocked = !!n.locked
        if (!includeHidden && isHidden) return false
        if (!includeLocked && isLocked) return false
        if (n?.meta?.guide === true) return false
        if (n.kind === 'text' || n.kind === 'image') return false
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

      const hasCosts = byType.some((x) => x.unitCost > 0)

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
        nodes: this.nodes.map((n) => ({
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

      const groups = []
      for (const g of this.groups || []) {
        const childIds = nodes
          .filter((n) => String(n.groupId) === String(g.id))
          .map((n) => String(n.id))
        if (childIds.length >= 2) {
          const meta = g.meta && typeof g.meta === 'object' ? { ...g.meta } : null
          groups.push({ id: g.id, name: String(g.name || 'Grupo'), childIds, meta })
        }
      }

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      for (const n of nodes) {
        const box = nodeBoundingBoxForSymbols(n, this.symbols)
        minX = Math.min(minX, box.left)
        minY = Math.min(minY, box.top)
        maxX = Math.max(maxX, box.right)
        maxY = Math.max(maxY, box.bottom)
      }

      const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

      this.clipboard.nodes = nodes.map((n) => ({
        id: n.id,
        dx: Number(n.x ?? 0) - bbox.x,
        dy: Number(n.y ?? 0) - bbox.y,

        kind: n.kind || 'balloon',
        symbolId: n.symbolId || null,
        name: n.name || '',
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
      this.clipboard.groups = groups
      this.clipboard.group = groups.length === 1 ? groups[0] : null

      return true
    },

    pasteFromClipboard({ x = null, y = null, offset = 18, multi = false } = {}) {
      if (this.ui?.symbolEdit?.active) return null
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
      const baseX = multi ? session.baseX : Number.isFinite(x) ? x : 200
      const baseY = multi ? session.baseY : Number.isFinite(y) ? y : 200

      const i = multi ? session.count : 1
      const ox = offset * i
      const oy = offset * i

      this.beginHistoryBatch()
      try {
        const newIds = []
        const idMap = new Map()

        for (const c of clips) {
          const px = baseX + c.dx + ox
          const py = baseY + c.dy + oy
          let newId = null

          if (c.kind === 'symbol' && c.symbolId) {
            newId = this.addSymbolInstance(c.symbolId, { x: px, y: py })
            if (newId) {
              this.updateNode(newId, {
                name: c.name || '',
                rotation: c.rotation,
                scaleX: c.scaleX,
                scaleY: c.scaleY,
                opacity: c.opacity,
                locked: c.locked,
                visible: c.visible,
              })
            }
          } else if (c.kind === 'text') {
            newId = this.addTextNode({ x: px, y: py, text: c.meta?.text || 'New text' })
            if (newId) {
              this.updateNode(newId, {
                name: c.name || '',
                typeId: c.typeId || 'text',
                color: c.color,
                rotation: c.rotation,
                scaleX: c.scaleX,
                scaleY: c.scaleY,
                opacity: c.opacity,
                locked: c.locked,
                visible: c.visible,
              })
              this.updateNodeMeta(newId, { ...c.meta })
            }
          } else if (c.kind === 'image') {
            newId = this.addImageNode({
              x: px,
              y: py,
              src: c.meta?.src || '',
              width: c.meta?.width,
              height: c.meta?.height,
            })
            if (newId) {
              this.updateNode(newId, {
                name: c.name || '',
                typeId: c.typeId || 'image',
                color: c.color,
                rotation: c.rotation,
                scaleX: c.scaleX,
                scaleY: c.scaleY,
                opacity: c.opacity,
                locked: c.locked,
                visible: c.visible,
              })
              this.updateNodeMeta(newId, { ...c.meta })
            }
          } else {
            newId = this.addNode({
              x: px,
              y: py,
              color: c.color,
              typeId: c.typeId,
              meta: { ...c.meta },
              kind: c.kind || 'balloon',
              name: c.name || '',
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
            }
          }

          if (newId) {
            newIds.push(newId)
            idMap.set(String(c.id), newId)
          }
        }

        const groups = Array.isArray(this.clipboard?.groups)
          ? this.clipboard.groups
          : this.clipboard?.group
            ? [this.clipboard.group]
            : []

        const createdGroups = []
        for (const group of groups) {
          const childIds = (group.childIds || []).map((id) => idMap.get(String(id))).filter(Boolean)
          if (childIds.length > 1) {
            const meta = group.meta && typeof group.meta === 'object' ? { ...group.meta } : null
            const groupId = this.createGroup({ name: group.name || 'Grupo', childIds, meta })
            if (groupId) {
              const created = (this.groups || []).find((g) => String(g.id) === String(groupId))
              const isLayer =
                meta?.kind === 'layer' || /^(fila|cluster)\b/i.test(String(group.name || ''))
              if (created && isLayer) {
                const inferLayout = () => {
                  const nodesById = new Map(this.nodes.map((n) => [String(n.id), n]))
                  const hasTopViewCircle = childIds.some((id) => {
                    const node = nodesById.get(String(id))
                    const y = Number(node?.meta?.topView?.y)
                    return Number.isFinite(y) && Math.abs(y) > 0.01
                  })
                  return hasTopViewCircle ? 'circle' : 'wall'
                }
                created.meta = {
                  ...(meta && typeof meta === 'object' ? meta : {}),
                  kind: 'layer',
                  layout: meta?.layout || inferLayout(),
                  perLayer: meta?.perLayer || childIds.length,
                  sizeIn: meta?.sizeIn || 12,
                  gapIn: meta?.gapIn ?? 0,
                  rotationDeg: meta?.rotationDeg ?? 0,
                }
              }

              createdGroups.push({
                id: groupId,
                meta: created?.meta,
                name: group.name || 'Grupo',
                childIds,
              })
            }
          }
        }

        const isLayerGroup = (group) => {
          if (group?.meta?.kind === 'layer') return true
          return /^(fila|cluster)\b/i.test(String(group?.name || ''))
        }

        if (createdGroups.length === 1 && isLayerGroup(createdGroups[0])) {
          this.selectGroup(createdGroups[0].id)
        } else {
          this.setSelection(newIds)
        }

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

      const expired = Date.now() - last > timeoutMs
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

    // ===== Align / Distribute =====
    flipSelection({ axis = 'x' } = {}) {
      const list = this.selectedNodes.filter((n) => !n.locked)
      if (!list.length) return false

      const boxes = list.map((n) => nodeBoundingBoxForSymbols(n, this.symbols))
      const minLeft = Math.min(...boxes.map((b) => b.left))
      const maxRight = Math.max(...boxes.map((b) => b.right))
      const minTop = Math.min(...boxes.map((b) => b.top))
      const maxBottom = Math.max(...boxes.map((b) => b.bottom))

      if (
        !Number.isFinite(minLeft) ||
        !Number.isFinite(maxRight) ||
        !Number.isFinite(minTop) ||
        !Number.isFinite(maxBottom)
      )
        return false

      const centerX = (minLeft + maxRight) / 2
      const centerY = (minTop + maxBottom) / 2
      const axisKey = axis === 'y' || axis === 'vertical' ? 'y' : 'x'
      const patchById = {}

      for (const node of list) {
        const meta = node.meta && typeof node.meta === 'object' ? { ...node.meta } : null
        if (axisKey === 'x') {
          const sx = Number.isFinite(Number(node.scaleX)) ? Number(node.scaleX) : 1
          patchById[node.id] = {
            x: centerX - (Number(node.x || 0) - centerX),
            scaleX: sx === 0 ? -1 : -sx,
          }
          if (meta?.topView && Number.isFinite(Number(meta.topView.x))) {
            patchById[node.id].meta = { ...meta, topView: { ...meta.topView, x: -meta.topView.x } }
          }
          continue
        }

        const sy = Number.isFinite(Number(node.scaleY)) ? Number(node.scaleY) : 1
        patchById[node.id] = {
          y: centerY - (Number(node.y || 0) - centerY),
          scaleY: sy === 0 ? -1 : -sy,
        }
        if (meta?.topView && Number.isFinite(Number(meta.topView.y))) {
          patchById[node.id].meta = { ...meta, topView: { ...meta.topView, y: -meta.topView.y } }
        }
      }

      this.beginHistoryBatch()
      try {
        this.updateNodes(patchById)
      } finally {
        this.endHistoryBatch()
      }

      return true
    },

    updateLayerGroup({ groupId = null, perLayer, sizeIn, gapIn, rotationDeg } = {}) {
      if (this.ui?.symbolEdit?.active) return false
      const gid = String(groupId || '')
      if (!gid) return false
      const group = (this.groups || []).find((g) => String(g.id) === gid)
      if (!group) return false
      const isLayer =
        group?.meta?.kind === 'layer' || /^(fila|cluster)\b/i.test(String(group?.name || ''))
      if (!isLayer) return false

      let layout = group.meta?.layout === 'circle' ? 'circle' : 'wall'
      if (!group.meta?.layout && existing.length) {
        const hasTopViewCircle = existing.some((n) => {
          const tv = n?.meta?.topView
          const y = Number(tv?.y)
          return Number.isFinite(y) && Math.abs(y) > 0.01
        })
        layout = hasTopViewCircle ? 'circle' : 'wall'
      }
      const widthCm = Number(this.ui?.guideWall?.widthCm || this.canvas?.widthCm || 0)
      const heightCm = Number(this.ui?.guideWall?.heightCm || this.canvas?.heightCm || 0)
      const widthPx = widthCm * PX_PER_CM
      const heightPx = heightCm * PX_PER_CM
      if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0)
        return false

      const maxRadiusCm = Number(this.ui?.guideWall?.maxRadiusCm || 0)
      const maxRadiusPx =
        Number.isFinite(maxRadiusCm) && maxRadiusCm > 0 ? maxRadiusCm * PX_PER_CM : null

      const rawCount = Number(perLayer ?? group.meta?.perLayer ?? 3)
      const nextCount = Number.isFinite(rawCount) ? clamp(rawCount, 3, 6) : 3
      const rawSize = Number(sizeIn ?? group.meta?.sizeIn ?? 12)
      const nextSizeIn = Number.isFinite(rawSize) ? clamp(rawSize, 1, 60) : 12
      const rawGap = Number(gapIn ?? group.meta?.gapIn ?? 0)
      const nextGapIn = Number.isFinite(rawGap) ? rawGap : 0
      const rawRotation = Number(rotationDeg ?? group.meta?.rotationDeg ?? 0)
      const nextRotationDeg = Number.isFinite(rawRotation) ? rawRotation : 0

      const radiusRaw = (nextSizeIn * 2.54 * PX_PER_CM) / 2
      const radiusPx = maxRadiusPx
        ? clamp(radiusRaw, PX_PER_CM * 0.5, maxRadiusPx)
        : Math.max(1, radiusRaw)
      const diameter = radiusPx * 2
      let step = diameter + nextGapIn * 2.54 * PX_PER_CM
      if (step <= diameter * 0.2) step = diameter * 0.2

      const nodeById = new Map(this.nodes.map((n) => [String(n.id), n]))
      const existing = (group.childIds || []).map((id) => nodeById.get(String(id))).filter(Boolean)

      const yValues = existing.map((n) => Number(n.y)).filter((y) => Number.isFinite(y))
      const avgY = yValues.length ? yValues.reduce((sum, v) => sum + v, 0) / yValues.length : null
      const rowY = Number.isFinite(avgY)
        ? clamp(avgY, radiusPx, heightPx - radiusPx)
        : heightPx - radiusPx

      const xValues = existing.map((n) => Number(n.x)).filter((x) => Number.isFinite(x))
      const avgX = xValues.length ? xValues.reduce((sum, v) => sum + v, 0) / xValues.length : null
      let minLeft = Infinity
      let maxRight = -Infinity
      for (const node of existing) {
        const x = Number(node?.x)
        if (!Number.isFinite(x)) continue
        const nodeRadius = Number(node?.meta?.radiusX ?? radiusPx)
        minLeft = Math.min(minLeft, x - nodeRadius)
        maxRight = Math.max(maxRight, x + nodeRadius)
      }
      let centerX = widthPx / 2
      if (Number.isFinite(minLeft) && Number.isFinite(maxRight) && maxRight >= minLeft) {
        centerX = (minLeft + maxRight) / 2
      } else if (Number.isFinite(avgX)) {
        centerX = avgX
      }
      centerX = clamp(centerX, radiusPx, widthPx - radiusPx)

      const seed = existing.find((n) => n) || {}
      const baseColor = String(seed.color || '#e0e0e0')
      const baseMeta = seed.meta && typeof seed.meta === 'object' ? seed.meta : {}
      const guideAlpha = Number.isFinite(Number(baseMeta.guideAlpha))
        ? Number(baseMeta.guideAlpha)
        : 100
      const guideLineWidth = Number.isFinite(Number(baseMeta.guideLineWidth))
        ? Number(baseMeta.guideLineWidth)
        : 2
      const guideLineDash = baseMeta.guideLineDash !== undefined ? !!baseMeta.guideLineDash : true
      const guideFillColor = String(baseMeta.guideFillColor || '#ffffff')
      const guideFillAlpha = Number.isFinite(Number(baseMeta.guideFillAlpha))
        ? Number(baseMeta.guideFillAlpha)
        : 0

      const positions = []
      if (layout === 'circle') {
        if (nextCount === 1) {
          positions.push({ x: centerX, y: rowY, tv: { x: 0, y: 0 } })
        } else {
          const sinTerm = Math.sin(Math.PI / nextCount)
          const circleRadius = sinTerm > 0 ? step / (2 * sinTerm) : diameter
          const maxCircleRadius = Math.max(0, centerX - radiusPx)
          const ringRadius =
            maxCircleRadius > 0 ? Math.min(circleRadius, maxCircleRadius) : circleRadius
          const angleStep = (Math.PI * 2) / nextCount
          const rotationRad = (nextRotationDeg * Math.PI) / 180
          for (let i = 0; i < nextCount; i += 1) {
            const angle = -Math.PI / 2 + angleStep * i + rotationRad
            const x = clamp(centerX + Math.cos(angle) * ringRadius, radiusPx, widthPx - radiusPx)
            positions.push({
              x,
              y: rowY,
              tv: { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 },
            })
          }
        }
      } else {
        const totalWidth = (nextCount - 1) * step + diameter
        let startX = centerX - totalWidth / 2 + radiusPx
        if (!Number.isFinite(startX)) startX = radiusPx
        for (let i = 0; i < nextCount; i += 1) {
          const x = clamp(startX + i * step, radiusPx, widthPx - radiusPx)
          positions.push({ x, y: rowY, tv: { x: 0, y: 0 } })
        }
      }

      const keep = existing.slice(0, nextCount)
      const remove = existing.slice(nextCount)
      const patchById = {}
      for (let i = 0; i < keep.length; i += 1) {
        const node = keep[i]
        const pos = positions[i]
        if (!node || !pos) continue
        const currentMeta = node.meta && typeof node.meta === 'object' ? node.meta : {}
        patchById[node.id] = {
          x: pos.x,
          y: pos.y,
          meta: {
            ...currentMeta,
            radiusX: radiusPx,
            radiusY: radiusPx,
            guideLine: true,
            guideAlpha,
            guideLineDash,
            guideLineWidth,
            guideFillColor: currentMeta.guideFillColor ?? guideFillColor,
            guideFillAlpha: Number.isFinite(Number(currentMeta.guideFillAlpha))
              ? Number(currentMeta.guideFillAlpha)
              : guideFillAlpha,
            guide: false,
            topView: pos.tv,
          },
        }
      }

      this.beginHistoryBatch()
      try {
        if (Object.keys(patchById).length) this.updateNodes(patchById)

        if (remove.length) {
          const removeSet = new Set(remove.map((n) => String(n.id)))
          this.nodes = this.nodes.filter((n) => !removeSet.has(String(n.id)))
        }

        const newIds = []
        if (positions.length > keep.length) {
          for (let i = keep.length; i < positions.length; i += 1) {
            const pos = positions[i]
            const node = {
              id: uid(),
              kind: 'balloon',
              name: 'Guia',
              typeId: 'round-11',
              x: pos.x,
              y: pos.y,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              color: baseColor,
              locked: false,
              visible: true,
              zIndex: this.nodes.length,
              groupId: null,
              meta: {
                radiusX: radiusPx,
                radiusY: radiusPx,
                knot: false,
                shape: 'ellipse',
                guideLine: true,
                guideAlpha,
                guideLineDash,
                guideLineWidth,
                guideFillColor,
                guideFillAlpha,
                guide: false,
                topView: pos.tv,
              },
            }
            this.nodes.push(node)
            newIds.push(node.id)
          }
        }

        const nextChildIds = [...keep.map((n) => n.id), ...newIds]
        group.childIds = nextChildIds
        group.meta = {
          ...(group.meta && typeof group.meta === 'object' ? group.meta : {}),
          kind: 'layer',
          layout,
          perLayer: nextCount,
          sizeIn: nextSizeIn,
          gapIn: nextGapIn,
          rotationDeg: nextRotationDeg,
        }

        applyGroupMembership(this)
        this.reindexZ()
        this.setSelection(nextChildIds)
        this.selectGroup(group.id)
        this.markDirty('Editar cluster')
      } finally {
        this.endHistoryBatch()
      }

      return true
    },
    createArcFromClusters({
      groupIds = [],
      width = 200,
      height = 120,
      unit = 'cm',
      sizeIn = 9,
      clusterCount = null,
      baseClusterCount = null,
      respectHeight = false,
    } = {}) {
      if (this.ui?.symbolEdit?.active) return null
      const ids = (Array.isArray(groupIds) ? groupIds : []).map((id) => String(id)).filter(Boolean)
      if (!ids.length) return null

      const groupMap = new Map((this.groups || []).map((g) => [String(g.id), g]))
      const selectedGroups = ids.map((id) => groupMap.get(String(id))).filter(Boolean)
      if (!selectedGroups.length) return null

      const patternGroups = selectedGroups.filter((group) => isLayerGroup(group))
      if (!patternGroups.length) return null

      const nodeById = new Map(this.nodes.map((n) => [String(n.id), n]))
      const patternData = patternGroups
        .map((group) => {
          const nodes = resolveGroupNodes(nodeById, group)
          if (!nodes.length) return null
          const bounds = groupBoundsForNodes(nodes, this.symbols)
          if (!bounds) return null
          return { group, nodes, bounds, center: { x: bounds.centerX, y: bounds.centerY } }
        })
        .filter(Boolean)
      if (!patternData.length) return null

      patternData.sort((a, b) => b.center.y - a.center.y)
      const patternLength = patternData.length

      const selectionBounds = patternData.reduce(
        (acc, item) => {
          acc.left = Math.min(acc.left, item.bounds.left)
          acc.right = Math.max(acc.right, item.bounds.right)
          acc.top = Math.min(acc.top, item.bounds.top)
          acc.bottom = Math.max(acc.bottom, item.bounds.bottom)
          return acc
        },
        { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
      )
      if (!Number.isFinite(selectionBounds.left) || !Number.isFinite(selectionBounds.bottom))
        return null

      const centerX = (selectionBounds.left + selectionBounds.right) / 2

      const estimatedSizeIn = estimateGroupSizeIn(patternData.flatMap((item) => item.nodes))
      const baseSizeIn =
        Number.isFinite(estimatedSizeIn) && estimatedSizeIn > 0 ? estimatedSizeIn : 9
      const nextSizeIn = Number.isFinite(Number(sizeIn)) ? Math.max(1, Number(sizeIn)) : baseSizeIn

      const sizeRatio = nextSizeIn / baseSizeIn
      const clusterRadiusPx = maxClusterRadiusFromBounds(patternData) * sizeRatio
      const balloonDiameterPx = nextSizeIn * 2.54 * PX_PER_CM
      const paddingPx = Math.max(1, clusterRadiusPx)
      const canvasHeightPx = Number(this.canvas?.heightCm || 0) * PX_PER_CM
      const outerBaseY =
        Number.isFinite(canvasHeightPx) && canvasHeightPx > 0
          ? canvasHeightPx
          : selectionBounds.bottom
      const baseY = outerBaseY - paddingPx
      const baseHeightCm = 100
      const baseHeightPx = baseHeightCm * PX_PER_CM
      const arcBaseY = Math.max(0, baseY - baseHeightPx)

      const rawWidthPx = arcUnitToPx(width, unit)
      const rawHeightPx = arcUnitToPx(height, unit)
      const widthPx = Math.max(1, rawWidthPx - paddingPx * 2)
      const useExactHeight = !!respectHeight
      const heightPadding = useExactHeight ? 0 : paddingPx * 2
      const heightPx = Math.max(1, rawHeightPx - heightPadding)
      if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0)
        return null

      const geometry = buildArcGeometry({ centerX, baseY: arcBaseY, widthPx, heightPx })
      if (!geometry) return null

      const baseSpacingPx = Math.max(1, balloonDiameterPx)
      const stepPx = Math.max(1, baseSpacingPx)
      const autoBaseCount = Math.max(0, Math.floor(baseHeightPx / Math.max(1, stepPx)) + 1)
      const desiredBaseCount = Number(baseClusterCount)
      const hasDesiredBaseCount = Number.isFinite(desiredBaseCount) && desiredBaseCount > 0
      const baseCountRaw = hasDesiredBaseCount ? Math.round(desiredBaseCount) : autoBaseCount
      const desiredCount = Number(clusterCount)
      const hasDesiredCount = Number.isFinite(desiredCount) && desiredCount > 0
      const arcCountAuto = Math.max(0, Math.floor(geometry.arcLength / Math.max(1, stepPx)) + 1)
      const totalCountAuto = Math.max(2, patternLength, baseCountRaw * 2 + arcCountAuto)
      const targetCount = hasDesiredCount
        ? Math.max(2, patternLength, Math.round(desiredCount))
        : totalCountAuto
      const baseCount = Math.min(baseCountRaw, Math.floor(targetCount / 2))
      const arcCount = Math.max(0, targetCount - baseCount * 2)
      const startX = geometry.centerX + geometry.radius * Math.cos(geometry.startAngle)
      const endX = geometry.centerX + geometry.radius * Math.cos(geometry.endAngle)
      const basePositions = []
      for (let i = 0; i < baseCount; i += 1) {
        basePositions.push({ x: startX, y: baseY - i * stepPx, angle: 0 })
      }
      const arcPositions = arcCount ? buildArcPointsEven(geometry, arcCount) : []
      const endBasePositions = []
      for (let i = 0; i < baseCount; i += 1) {
        endBasePositions.push({ x: endX, y: baseY - i * stepPx, angle: 0 })
      }
      const positions = [...basePositions, ...arcPositions, ...endBasePositions]
      if (!positions.length) return null

      const arcId = `arc_${Math.random().toString(36).slice(2, 10)}`
      const arcMeta = buildArcMeta({
        arcId,
        width: Number(width),
        height: Number(height),
        unit: unit === 'in' ? 'in' : 'cm',
        sizeIn: nextSizeIn,
        baseSizeIn,
        baseSpacingPx,
        patternLength,
        targetCount: hasDesiredCount ? targetCount : null,
        respectHeight: useExactHeight,
        baseHeightCm,
        baseClusterCount: hasDesiredBaseCount ? Math.round(desiredBaseCount) : null,
        baseClusterAuto: autoBaseCount,
        centerX,
        baseY: geometry.baseY,
      })

      const templates = patternData.map((item) => {
        const baseSize =
          Number(item.group?.meta?.sizeIn) || estimateGroupSizeIn(item.nodes) || baseSizeIn
        const arcAngle = Number(item.group?.meta?.arcAngle || 0)
        const nodes = item.nodes.map((node) => ({
          base: deepClone(node),
          localX: Number(node.x || 0) - item.center.x,
          localY: Number(node.y || 0) - item.center.y,
        }))
        return { group: item.group, nodes, sizeIn: baseSize, arcAngle }
      })

      this.beginHistoryBatch()
      try {
        const patchById = {}
        for (let i = 0; i < patternLength; i += 1) {
          const item = patternData[i]
          const target = positions[i]
          if (!item || !target) continue
          const group = item.group
          const nodes = item.nodes
          const desiredRotation = rotationFromArcAngle(target.angle)
          const rotDeg = (desiredRotation * 180) / Math.PI

          for (const node of nodes) {
            const localX = Number(node.x || 0) - item.center.x
            const localY = Number(node.y || 0) - item.center.y
            const scaledX = localX * sizeRatio
            const scaledY = localY * sizeRatio
            const rotated = rotateVector(scaledX, scaledY, desiredRotation)
            const nextMeta = scaleNodeMeta(node, sizeRatio)
            patchById[node.id] = {
              x: target.x + rotated.x,
              y: target.y + rotated.y,
              rotation: Number(node.rotation || 0) + rotDeg,
              meta: {
                ...nextMeta,
                arcId,
                arcIndex: i,
                arcPatternIndex: i % patternLength,
                arcAngle: target.angle,
                arc: arcMeta,
              },
            }
          }

          group.meta = {
            ...(group.meta && typeof group.meta === 'object' ? group.meta : {}),
            kind: group.meta?.kind || 'layer',
            arcId,
            arcIndex: i,
            arcPatternIndex: i % patternLength,
            arcAngle: target.angle,
            arcRotation: desiredRotation,
            arc: arcMeta,
            sizeIn: nextSizeIn,
          }
        }

        if (Object.keys(patchById).length) this.updateNodes(patchById)

        for (let i = patternLength; i < positions.length; i += 1) {
          const target = positions[i]
          const template = templates[i % patternLength]
          if (!target || !template) continue

          const newGroupId = groupUid()
          const ratio = Number(template.sizeIn) ? nextSizeIn / Number(template.sizeIn) : 1
          const desiredRotation = rotationFromArcAngle(target.angle)
          const rotDeg = (desiredRotation * 180) / Math.PI

          const nextNodes = template.nodes.map((source) => {
            const node = deepClone(source.base)
            const meta = scaleNodeMeta(node, ratio)
            const localX = Number(source.localX || 0)
            const localY = Number(source.localY || 0)
            const scaledX = localX * ratio
            const scaledY = localY * ratio
            const rotated = rotateVector(scaledX, scaledY, desiredRotation)
            const id = uid()
            return {
              ...node,
              id,
              groupId: newGroupId,
              x: target.x + rotated.x,
              y: target.y + rotated.y,
              rotation: Number(node.rotation || 0) + rotDeg,
              zIndex: this.nodes.length,
              meta: {
                ...meta,
                arcId,
                arcIndex: i,
                arcPatternIndex: i % patternLength,
                arcAngle: target.angle,
                arc: arcMeta,
              },
            }
          })

          this.nodes.push(...nextNodes)
          const label = template.group?.name || `Cluster ${i + 1}`
          this.groups.push({
            id: newGroupId,
            name: label,
            childIds: nextNodes.map((n) => n.id),
            meta: {
              ...(template.group?.meta && typeof template.group.meta === 'object'
                ? template.group.meta
                : {}),
              kind: template.group?.meta?.kind || 'layer',
              arcId,
              arcIndex: i,
              arcPatternIndex: i % patternLength,
              arcAngle: target.angle,
              arcRotation: desiredRotation,
              arc: arcMeta,
              sizeIn: nextSizeIn,
            },
          })
        }

        applyGroupMembership(this)
        this.reindexZ()
        const firstGroup = patternData[0]?.group
        if (firstGroup) this.selectGroup(firstGroup.id)
        this.markDirty('Crear arco')
      } finally {
        this.endHistoryBatch()
      }

      return arcId
    },
    updateArcFromClusters({
      arcId = '',
      width = null,
      height = null,
      unit = null,
      sizeIn = null,
      clusterCount = null,
      baseClusterCount = null,
      respectHeight = null,
    } = {}) {
      if (this.ui?.symbolEdit?.active) return false
      const targetId = String(arcId || '')
      if (!targetId) return false

      const nodeById = new Map(this.nodes.map((n) => [String(n.id), n]))
      const groups = (this.groups || []).filter((group) => {
        const direct = group?.meta?.arcId || group?.meta?.arc?.id
        if (direct && String(direct) === targetId) return true
        const childIds = Array.isArray(group?.childIds) ? group.childIds : []
        for (const id of childIds) {
          const node = nodeById.get(String(id))
          const nodeArc = node?.meta?.arcId || node?.meta?.arc?.id
          if (nodeArc && String(nodeArc) === targetId) return true
        }
        return false
      })
      if (!groups.length) return false
      const groupData = groups
        .map((group) => {
          const nodes = resolveGroupNodes(nodeById, group)
          if (!nodes.length) return null
          const bounds = groupBoundsForNodes(nodes, this.symbols)
          if (!bounds) return null
          return {
            group,
            nodes,
            bounds,
            center: { x: bounds.centerX, y: bounds.centerY },
            arcIndex: resolveArcIndex(group, nodes),
            arcPatternIndex: resolveArcPatternIndex(group, nodes),
            arcAngle: resolveArcAngle(group, nodes),
            arcRotation: resolveArcRotation(group, nodes),
          }
        })
        .filter(Boolean)
      if (!groupData.length) return false

      groupData.sort((a, b) => {
        const aIndex = Number(a.arcIndex ?? 0)
        const bIndex = Number(b.arcIndex ?? 0)
        return aIndex - bIndex
      })

      const baseMeta = groupData[0]?.group?.meta?.arc || {}
      const nextRespectHeight =
        respectHeight === null || respectHeight === undefined
          ? !!baseMeta.respectHeight
          : !!respectHeight
      const baseHeightCm = Number(baseMeta.baseHeightCm)
      const resolvedBaseHeightCm =
        Number.isFinite(baseHeightCm) && baseHeightCm > 0 ? baseHeightCm : 100
      const baseHeightPx = resolvedBaseHeightCm * PX_PER_CM
      const baseClusterCountFromMeta = Number(baseMeta.baseClusterCount)
      const hasBaseClusterCountFromMeta =
        Number.isFinite(baseClusterCountFromMeta) && baseClusterCountFromMeta > 0
      const desiredBaseCount = Number(baseClusterCount)
      const hasDesiredBaseCount = Number.isFinite(desiredBaseCount) && desiredBaseCount > 0
      const resolvedBaseClusterCount = hasDesiredBaseCount
        ? Math.round(desiredBaseCount)
        : hasBaseClusterCountFromMeta
          ? Math.round(baseClusterCountFromMeta)
          : null
      const arcUnit = unit === 'in' || unit === 'cm' ? unit : baseMeta.unit || 'cm'
      const nextWidth = Number.isFinite(Number(width)) ? Number(width) : Number(baseMeta.width || 0)
      const nextHeight = Number.isFinite(Number(height))
        ? Number(height)
        : Number(baseMeta.height || 0)
      const prevSize = Number(baseMeta.sizeIn || groupData[0]?.group?.meta?.sizeIn || 9)
      const nextSize = Number.isFinite(Number(sizeIn)) ? Number(sizeIn) : prevSize
      const baseSizeIn = Number(baseMeta.baseSizeIn || prevSize || 9)
      const scaleRatio = prevSize ? nextSize / prevSize : 1
      const patternIndices = groupData
        .map((item) => Number(item.arcPatternIndex))
        .filter((value) => Number.isFinite(value))
      const patternLengthFromGroups = patternIndices.length ? Math.max(...patternIndices) + 1 : 0
      const patternLength = Number(
        baseMeta.patternLength || patternLengthFromGroups || groupData.length || 1,
      )

      const selectionBounds = groupData.reduce(
        (acc, item) => {
          acc.left = Math.min(acc.left, item.bounds.left)
          acc.right = Math.max(acc.right, item.bounds.right)
          acc.bottom = Math.max(acc.bottom, item.bounds.bottom)
          return acc
        },
        { left: Infinity, right: -Infinity, bottom: -Infinity },
      )
      let centerX = Number.isFinite(Number(baseMeta.centerX))
        ? Number(baseMeta.centerX)
        : (selectionBounds.left + selectionBounds.right) / 2
      const currentClusterRadiusPx = maxClusterRadiusFromBounds(groupData)
      const nextClusterRadiusPx = currentClusterRadiusPx * scaleRatio
      const prevBalloonRadiusPx = (prevSize * 2.54 * PX_PER_CM) / 2
      const nextBalloonRadiusPx = (nextSize * 2.54 * PX_PER_CM) / 2
      const outerBaseY = Number.isFinite(Number(baseMeta.baseY))
        ? Number(baseMeta.baseY) + baseHeightPx + currentClusterRadiusPx
        : selectionBounds.bottom
      let baseY = outerBaseY - nextClusterRadiusPx
      if (!Number.isFinite(centerX)) centerX = 0
      if (!Number.isFinite(baseY)) baseY = 0
      const arcBaseY = Math.max(0, baseY - baseHeightPx)

      const rawWidthPx = arcUnitToPx(nextWidth, arcUnit)
      const rawHeightPx = arcUnitToPx(nextHeight, arcUnit)
      const widthPx = Math.max(1, rawWidthPx - nextClusterRadiusPx * 2)
      const heightPadding = nextRespectHeight ? 0 : nextClusterRadiusPx * 2
      const heightPx = Math.max(1, rawHeightPx - heightPadding)
      if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0)
        return false

      const geometry = buildArcGeometry({ centerX, baseY: arcBaseY, widthPx, heightPx })
      if (!geometry) return false

      const patternGroups = groupData
        .filter((item) => Number.isFinite(Number(item.arcPatternIndex)))
        .sort((a, b) => Number(a.arcPatternIndex || 0) - Number(b.arcPatternIndex || 0))
      const patternSource = patternGroups.length ? patternGroups : groupData.slice(0, patternLength)
      const balloonDiameterPx = nextSize * 2.54 * PX_PER_CM
      const baseSpacingPx = Math.max(1, balloonDiameterPx)
      const stepPx = Math.max(1, baseSpacingPx)
      const rawDesiredCount = Number(clusterCount)
      const hasDesiredCount = Number.isFinite(rawDesiredCount) && rawDesiredCount > 0
      const rawBaseCount = Number(baseMeta.targetCount)
      const hasBaseCount = Number.isFinite(rawBaseCount) && rawBaseCount > 0
      const resolvedDesiredCount = hasDesiredCount
        ? Math.round(rawDesiredCount)
        : hasBaseCount
          ? Math.round(rawBaseCount)
          : null
      const normalizedDesiredCount = resolvedDesiredCount ? Math.max(2, resolvedDesiredCount) : null
      const autoBaseCount = Math.max(0, Math.floor(baseHeightPx / Math.max(1, stepPx)) + 1)
      const baseCountRaw = resolvedBaseClusterCount || autoBaseCount
      const arcCountAuto = Math.max(0, Math.floor(geometry.arcLength / Math.max(1, stepPx)) + 1)
      const totalCountAuto = Math.max(2, patternLength, baseCountRaw * 2 + arcCountAuto)
      const targetCount = normalizedDesiredCount ? normalizedDesiredCount : totalCountAuto
      const baseCount = Math.min(baseCountRaw, Math.floor(targetCount / 2))
      const arcCount = Math.max(0, targetCount - baseCount * 2)
      const startX = geometry.centerX + geometry.radius * Math.cos(geometry.startAngle)
      const endX = geometry.centerX + geometry.radius * Math.cos(geometry.endAngle)
      const basePositions = []
      for (let i = 0; i < baseCount; i += 1) {
        basePositions.push({ x: startX, y: baseY - i * stepPx, angle: 0 })
      }
      const arcPositions = arcCount ? buildArcPointsEven(geometry, arcCount) : []
      const endBasePositions = []
      for (let i = 0; i < baseCount; i += 1) {
        endBasePositions.push({ x: endX, y: baseY - i * stepPx, angle: 0 })
      }
      const positions = [...basePositions, ...arcPositions, ...endBasePositions]
      if (!positions.length) return false

      const arcMeta = buildArcMeta({
        arcId: targetId,
        width: nextWidth,
        height: nextHeight,
        unit: arcUnit,
        sizeIn: nextSize,
        baseSizeIn,
        baseSpacingPx,
        patternLength,
        targetCount: normalizedDesiredCount,
        respectHeight: nextRespectHeight,
        baseHeightCm: resolvedBaseHeightCm,
        baseClusterCount: resolvedBaseClusterCount,
        baseClusterAuto: autoBaseCount,
        centerX: geometry.centerX,
        baseY: geometry.baseY,
      })

      const templateGroups = groupData
        .filter((item) => Number.isFinite(Number(item.arcPatternIndex)))
        .sort((a, b) => Number(a.arcPatternIndex || 0) - Number(b.arcPatternIndex || 0))
      const templates = (
        templateGroups.length ? templateGroups : groupData.slice(0, patternLength)
      ).map((item) => {
        const baseSize =
          Number(item.group?.meta?.sizeIn) || estimateGroupSizeIn(item.nodes) || nextSize
        const arcAngle = Number(item.arcAngle || 0)
        const arcRotation = Number(item.arcRotation || 0)
        const nodes = item.nodes.map((node) => ({
          base: deepClone(node),
          localX: Number(node.x || 0) - item.center.x,
          localY: Number(node.y || 0) - item.center.y,
        }))
        return { group: item.group, nodes, sizeIn: baseSize, arcAngle, arcRotation }
      })

      const keepGroups = groupData.slice(0, positions.length)
      const removeGroups = groupData.slice(positions.length)
      const sizeRatio = prevSize ? nextSize / prevSize : 1

      this.beginHistoryBatch()
      try {
        const patchById = {}
        for (let i = 0; i < keepGroups.length; i += 1) {
          const item = keepGroups[i]
          const target = positions[i]
          if (!item || !target) continue
          const group = item.group
          const nodes = item.nodes
          const desiredRotation = rotationFromArcAngle(target.angle)
          const currentRotation = Number(item.arcRotation || 0)
          const deltaRotation = desiredRotation - currentRotation
          const rotDeg = (deltaRotation * 180) / Math.PI

          for (const node of nodes) {
            const localX = Number(node.x || 0) - item.center.x
            const localY = Number(node.y || 0) - item.center.y
            const scaledX = localX * scaleRatio
            const scaledY = localY * scaleRatio
            const rotated = rotateVector(scaledX, scaledY, deltaRotation)
            const nextMeta = scaleNodeMeta(node, scaleRatio)
            patchById[node.id] = {
              x: target.x + rotated.x,
              y: target.y + rotated.y,
              rotation: Number(node.rotation || 0) + rotDeg,
              meta: {
                ...nextMeta,
                arcId: targetId,
                arcIndex: i,
                arcPatternIndex: i % patternLength,
                arcAngle: target.angle,
                arc: arcMeta,
              },
            }
          }

          group.meta = {
            ...(group.meta && typeof group.meta === 'object' ? group.meta : {}),
            kind: group.meta?.kind || 'layer',
            arcId: targetId,
            arcIndex: i,
            arcPatternIndex: i % patternLength,
            arcAngle: target.angle,
            arcRotation: desiredRotation,
            arc: arcMeta,
            sizeIn: nextSize,
          }
        }

        if (Object.keys(patchById).length) this.updateNodes(patchById)

        if (removeGroups.length) {
          const removeGroupIds = new Set(removeGroups.map((item) => String(item.group.id)))
          const removeNodeIds = new Set(
            removeGroups.flatMap((item) =>
              Array.isArray(item.group.childIds) ? item.group.childIds : [],
            ),
          )
          this.nodes = this.nodes.filter((n) => !removeNodeIds.has(String(n.id)))
          this.groups = this.groups.filter((g) => !removeGroupIds.has(String(g.id)))
        }

        for (let i = keepGroups.length; i < positions.length; i += 1) {
          const target = positions[i]
          const template = templates[i % templates.length]
          if (!target || !template) continue

          const newGroupId = groupUid()
          const ratio = Number(template.sizeIn) ? nextSize / Number(template.sizeIn) : 1
          const desiredRotation = rotationFromArcAngle(target.angle)
          const currentRotation = Number(template.arcRotation || 0)
          const deltaRotation = desiredRotation - currentRotation
          const rotDeg = (deltaRotation * 180) / Math.PI

          const nextNodes = template.nodes.map((source) => {
            const node = deepClone(source.base)
            const meta = scaleNodeMeta(node, ratio)
            const localX = Number(source.localX || 0)
            const localY = Number(source.localY || 0)
            const scaledX = localX * ratio
            const scaledY = localY * ratio
            const rotated = rotateVector(scaledX, scaledY, deltaRotation)
            const id = uid()
            return {
              ...node,
              id,
              groupId: newGroupId,
              x: target.x + rotated.x,
              y: target.y + rotated.y,
              rotation: Number(node.rotation || 0) + rotDeg,
              zIndex: this.nodes.length,
              meta: {
                ...meta,
                arcId: targetId,
                arcIndex: i,
                arcPatternIndex: i % patternLength,
                arcAngle: target.angle,
                arc: arcMeta,
              },
            }
          })

          this.nodes.push(...nextNodes)
          const label = template.group?.name || `Cluster ${i + 1}`
          this.groups.push({
            id: newGroupId,
            name: label,
            childIds: nextNodes.map((n) => n.id),
            meta: {
              ...(template.group?.meta && typeof template.group.meta === 'object'
                ? template.group.meta
                : {}),
              kind: template.group?.meta?.kind || 'layer',
              arcId: targetId,
              arcIndex: i,
              arcPatternIndex: i % patternLength,
              arcAngle: target.angle,
              arcRotation: desiredRotation,
              arc: arcMeta,
              sizeIn: nextSize,
            },
          })
        }

        applyGroupMembership(this)
        this.reindexZ()
        this.markDirty('Actualizar arco')
      } finally {
        this.endHistoryBatch()
      }

      return true
    },
    alignSelection(mode, { alignToCanvas = false } = {}) {
      const inGroupEdit = !!this.ui?.groupEditMode && !!this.selectedGroupId
      const nodes = this.selectedNodes.filter((n) => !n.locked)
      const minCount = alignToCanvas ? 1 : 2
      if (nodes.length < minCount) return

      if (!inGroupEdit) {
        const groupIdSet = new Set(
          nodes.map((n) => String(n.groupId || '')).filter((id) => id && id !== 'null'),
        )
        if (groupIdSet.size) return
      }

      this.beginHistoryBatch()
      try {
        const boxes = nodes.map((n) => {
          const box = nodeBoundingBoxForSymbols(n, this.symbols)
          return {
            id: n.id,
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
            width: box.width,
            height: box.height,
            cx: box.centerX,
            cy: box.centerY,
          }
        })

        let minLeft = Math.min(...boxes.map((b) => b.left))
        let maxRight = Math.max(...boxes.map((b) => b.right))
        let minTop = Math.min(...boxes.map((b) => b.top))
        let maxBottom = Math.max(...boxes.map((b) => b.bottom))

        if (alignToCanvas) {
          const width = Number(this.canvas?.widthCm || 0) * PX_PER_CM
          const height = Number(this.canvas?.heightCm || 0) * PX_PER_CM
          if (Number.isFinite(width) && width > 0) {
            minLeft = 0
            maxRight = width
          }
          if (Number.isFinite(height) && height > 0) {
            minTop = 0
            maxBottom = height
          }
        }

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
      const inGroupEdit = !!this.ui?.groupEditMode && !!this.selectedGroupId
      const nodes = this.selectedNodes
        .filter((n) => !n.locked)
        .sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y))

      if (nodes.length < 3) return

      if (!inGroupEdit) {
        const groupIdSet = new Set(
          nodes.map((n) => String(n.groupId || '')).filter((id) => id && id !== 'null'),
        )
        if (groupIdSet.size) return
      }

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
      this.history.past = [this._withHistoryMeta(this._captureSnapshot(), 'Inicio')]
      this.history.future = []
    },

    _withHistoryMeta(snap, label = '') {
      return {
        ...snap,
        meta: {
          timestamp: new Date().toISOString(),
          label: String(label || 'Edicion'),
        },
      }
    },

    _captureSnapshot() {
      // IMPORTANTE: usar toRaw para no clonar Proxies
      return {
        nodes: deepClone(toRaw(this.nodes)),
        symbols: deepClone(toRaw(this.symbols)),
        view: deepClone(toRaw(this.view)),
        settings: deepClone(toRaw(this.settings)),
        groups: deepClone(toRaw(this.groups)),
        canvas: deepClone(toRaw(this.canvas)),
        stackGridCursor: deepClone(toRaw(this.stackGridCursor)),
      }
    },

    _restoreSnapshot(snap) {
      if (!snap) return
      this.history.lock = true
      try {
        this.nodes = deepClone(snap.nodes || [])
        this.symbols = deepClone(snap.symbols || [])
        this.view = deepClone(snap.view || { x: 0, y: 0, scale: 1 })
        this.settings = deepClone(snap.settings || this.settings)
        this.groups = deepClone(snap.groups || [])
        applyGroupMembership(this)
        this.canvas = deepClone(snap.canvas || createDefaultCanvasSettings())
        this.stackGridCursor = deepClone(snap.stackGridCursor || { col: 0, row: 0 })
        this.ui.symbolEdit = { active: false, symbolId: null, instanceId: null, selectedIds: [] }
        this.clearSelection()
      } finally {
        this.history.lock = false
      }
    },

    _pushHistory(label = '') {
      if (this.history.lock) return

      const snap = this._captureSnapshot()
      const past = this.history.past
      const last = past[past.length - 1]

      const lastClean = last ? { ...last } : null
      if (lastClean) delete lastClean.meta

      // evita duplicados idénticos
      if (lastClean && JSON.stringify(lastClean) === JSON.stringify(snap)) return

      past.push(this._withHistoryMeta(snap, label))

      if (past.length > this.history.max) {
        past.splice(0, past.length - this.history.max)
      }

      this.history.future = []
    },

    scheduleHistoryCommit(label = '') {
      if (this.history.lock) return

      if (this.history.batching > 0) {
        this.history.batchDirty = true
        this.history.batchLabel = label || this.history.batchLabel
        return
      }

      if (this.history.timer) clearTimeout(this.history.timer)
      this.history.timer = window.setTimeout(() => {
        this.history.timer = null
        this._pushHistory(label)
      }, this.history.debounceMs)
    },

    beginHistoryBatch() {
      this.history.batching += 1
    },

    endHistoryBatch() {
      this.history.batching = Math.max(0, this.history.batching - 1)
      if (this.history.batching === 0 && this.history.batchDirty) {
        this.history.batchDirty = false
        const label = this.history.batchLabel || ''
        this.history.batchLabel = ''
        this._pushHistory(label)
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

    goToHistoryIndex(index) {
      if (this.history.lock) return false
      const past = this.history.past
      if (!past.length) return false

      if (this.history.timer) {
        clearTimeout(this.history.timer)
        this.history.timer = null
        this._pushHistory()
      }

      const targetIndex = Math.max(0, Math.min(past.length - 1, Number(index) || 0))
      const currentIndex = past.length - 1
      if (targetIndex === currentIndex) return true

      const target = past[targetIndex]
      if (!target) return false

      const removed = past.splice(targetIndex + 1)
      this.history.future = removed.concat(this.history.future)
      this._restoreSnapshot(target)

      this.autosave.isDirty = true
      this.scheduleAutosave()

      return true
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

function rectsIntersect(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  )
}

function guidesInRect(store, rect, color = null) {
  const nodes = Array.isArray(store?.nodes) ? store.nodes : []
  const targetColor = typeof color === 'string' && color.trim() ? color.trim().toLowerCase() : null
  const guides = nodes.filter((n) => {
    if (!n?.meta?.guide) return false
    if (!targetColor) return true
    return String(n.color || '').toLowerCase() === targetColor
  })
  if (!guides.length) return []

  return guides.filter((n) => {
    const box = nodeBoundingBoxForSymbols(n, store.symbols)
    return rectsIntersect(rect, { x: box.x, y: box.y, width: box.width, height: box.height })
  })
}

function isLayerGroup(group) {
  if (!group) return false
  if (group?.meta?.kind === 'layer') return true
  return /^(fila|cluster)\b/i.test(String(group?.name || ''))
}

function resolveGroupNodes(nodeById, group) {
  const ids = Array.isArray(group?.childIds) ? group.childIds : []
  return ids.map((id) => nodeById.get(String(id))).filter(Boolean)
}

function groupBoundsForNodes(nodes = [], symbols = []) {
  let minLeft = Infinity
  let maxRight = -Infinity
  let minTop = Infinity
  let maxBottom = -Infinity

  for (const node of nodes) {
    const box = nodeBoundingBoxForSymbols(node, symbols)
    minLeft = Math.min(minLeft, box.left)
    maxRight = Math.max(maxRight, box.right)
    minTop = Math.min(minTop, box.top)
    maxBottom = Math.max(maxBottom, box.bottom)
  }

  if (!Number.isFinite(minLeft) || !Number.isFinite(maxRight)) return null

  return {
    left: minLeft,
    right: maxRight,
    top: minTop,
    bottom: maxBottom,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
    centerX: (minLeft + maxRight) / 2,
    centerY: (minTop + maxBottom) / 2,
  }
}

function estimateGroupSizeIn(nodes = []) {
  let sum = 0
  let count = 0
  for (const node of nodes) {
    const rx = Number(node?.meta?.radiusX)
    const ry = Number(node?.meta?.radiusY)
    const base = Math.max(rx, ry)
    if (!Number.isFinite(base) || base <= 0) continue
    const sx = Math.abs(Number(node?.scaleX ?? 1)) || 1
    const sy = Math.abs(Number(node?.scaleY ?? 1)) || 1
    const radiusPx = base * Math.max(sx, sy)
    sum += radiusPx * 2
    count += 1
  }
  if (!count) return null
  const diameterCm = sum / count / PX_PER_CM
  return Math.round((diameterCm / 2.54) * 100) / 100
}

function arcUnitToPx(value, unit) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const cm = unit === 'in' ? n * 2.54 : n
  return cm * PX_PER_CM
}

function buildArcMeta({
  arcId,
  width,
  height,
  unit,
  sizeIn,
  baseSizeIn,
  baseSpacingPx,
  patternLength,
  targetCount,
  respectHeight,
  baseHeightCm,
  baseClusterCount,
  baseClusterAuto,
  centerX,
  baseY,
} = {}) {
  return {
    id: arcId,
    width,
    height,
    unit,
    sizeIn,
    baseSizeIn,
    baseSpacingPx,
    patternLength,
    targetCount,
    respectHeight,
    baseHeightCm,
    baseClusterCount,
    baseClusterAuto,
    centerX,
    baseY,
  }
}

function buildArcGeometry({ centerX, baseY, widthPx, heightPx }) {
  const w = Number(widthPx)
  const h = Number(heightPx)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  const half = w / 2
  const radius = (h * h + half * half) / (2 * h)
  if (!Number.isFinite(radius) || radius <= 0) return null
  let centerY = Number(baseY) + (radius - h)
  let startAngle = Math.atan2(Number(baseY) - centerY, -half)
  let endAngle = Math.atan2(Number(baseY) - centerY, half)
  let arcLength = Math.abs(endAngle - startAngle) * radius

  const midAngle = (startAngle + endAngle) / 2
  const midY = centerY + radius * Math.sin(midAngle)
  if (Number.isFinite(midY) && midY > Number(baseY)) {
    centerY = Number(baseY) - (radius - h)
    startAngle = Math.atan2(Number(baseY) - centerY, -half)
    endAngle = Math.atan2(Number(baseY) - centerY, half)
    arcLength = Math.abs(endAngle - startAngle) * radius
  }
  return {
    centerX: Number(centerX),
    centerY,
    radius,
    startAngle,
    endAngle,
    arcLength,
    baseY: Number(baseY),
    heightPx: h,
  }
}

function buildArcPointsWeighted(geometry, weights = []) {
  const points = []
  if (!geometry) return points
  const list = Array.isArray(weights) ? weights : []
  const total = list.reduce((sum, w) => sum + (Number(w) || 0), 0)
  if (!list.length || total <= 0) return points

  let acc = 0
  for (const weight of list) {
    const w = Number(weight) || 0
    const centerWeight = acc + w / 2
    const t = total > 0 ? centerWeight / total : 0
    const angle = geometry.startAngle + t * (geometry.endAngle - geometry.startAngle)
    points.push({
      x: geometry.centerX + geometry.radius * Math.cos(angle),
      y: geometry.centerY + geometry.radius * Math.sin(angle),
      angle,
    })
    acc += w
  }
  return points
}

function buildArcPointsEven(geometry, count) {
  const total = Math.max(1, Math.round(Number(count) || 0))
  if (!geometry) return []
  const start = Number(geometry.startAngle)
  const end = Number(geometry.endAngle)
  const points = []
  if (!Number.isFinite(start) || !Number.isFinite(end)) return points

  if (total === 1) {
    const angle = (start + end) / 2
    points.push({
      x: geometry.centerX + geometry.radius * Math.cos(angle),
      y: geometry.centerY + geometry.radius * Math.sin(angle),
      angle,
    })
    return points
  }

  for (let i = 0; i < total; i += 1) {
    const t = i / (total - 1)
    const angle = start + t * (end - start)
    points.push({
      x: geometry.centerX + geometry.radius * Math.cos(angle),
      y: geometry.centerY + geometry.radius * Math.sin(angle),
      angle,
    })
  }
  return points
}

function rotationFromArcAngle(angle) {
  const value = Number(angle)
  return Number.isFinite(value) ? value : 0
}

function maxClusterRadiusFromBounds(items = []) {
  let max = 0
  for (const item of Array.isArray(items) ? items : []) {
    const bounds = item?.bounds
    if (!bounds) continue
    const w = Number(bounds.width)
    const h = Number(bounds.height)
    if (!Number.isFinite(w) || !Number.isFinite(h)) continue
    max = Math.max(max, Math.max(w, h) / 2)
  }
  return max
}

function rotateVector(dx, dy, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  }
}

function scaleNodeMeta(node, ratio) {
  const meta = node?.meta && typeof node.meta === 'object' ? { ...node.meta } : {}
  if (!Number.isFinite(ratio) || ratio === 1) return meta

  if (node?.kind === 'image') {
    const w = Number(meta.width)
    const h = Number(meta.height)
    if (Number.isFinite(w)) meta.width = w * ratio
    if (Number.isFinite(h)) meta.height = h * ratio
    return meta
  }

  if (node?.kind === 'text') {
    const fontSize = Number(meta.fontSize)
    const width = Number(meta.width)
    if (Number.isFinite(fontSize)) meta.fontSize = fontSize * ratio
    if (Number.isFinite(width)) meta.width = width * ratio
    return meta
  }

  const rx = Number(meta.radiusX)
  const ry = Number(meta.radiusY)
  if (Number.isFinite(rx)) meta.radiusX = rx * ratio
  if (Number.isFinite(ry)) meta.radiusY = ry * ratio
  return meta
}

function resolveArcIndex(group, nodes = []) {
  const direct = Number(group?.meta?.arcIndex)
  if (Number.isFinite(direct)) return direct
  for (const node of nodes) {
    const idx = Number(node?.meta?.arcIndex)
    if (Number.isFinite(idx)) return idx
  }
  return 0
}

function resolveArcPatternIndex(group, nodes = []) {
  const direct = Number(group?.meta?.arcPatternIndex)
  if (Number.isFinite(direct)) return direct
  for (const node of nodes) {
    const idx = Number(node?.meta?.arcPatternIndex)
    if (Number.isFinite(idx)) return idx
  }
  return 0
}

function resolveArcAngle(group, nodes = []) {
  const direct = Number(group?.meta?.arcAngle)
  if (Number.isFinite(direct)) return direct
  for (const node of nodes) {
    const angle = Number(node?.meta?.arcAngle)
    if (Number.isFinite(angle)) return angle
  }
  return 0
}

function resolveArcRotation(group, nodes = []) {
  const direct = Number(group?.meta?.arcRotation)
  if (Number.isFinite(direct)) return direct
  for (const node of nodes) {
    const angle = Number(node?.meta?.arcRotation)
    if (Number.isFinite(angle)) return angle
  }
  return 0
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

function expandSymbolNodes(nodes = [], symbols = [], depth = 4, options = {}) {
  if (depth < 0) return []
  const symbolMap = new Map((symbols || []).map((s) => [String(s.id), s]))
  const out = []
  const list = Array.isArray(nodes) ? nodes : []

  for (const n of list) {
    if (!n) continue
    if (n.kind === 'symbol') {
      if (depth <= 0) continue
      if (options?.includeHidden === false && n.visible === false) continue
      if (options?.includeLocked === false && n.locked) continue
      const symbol = symbolMap.get(String(n.symbolId))
      if (symbol?.nodes?.length) {
        out.push(...expandSymbolNodes(symbol.nodes, symbols, depth - 1, options))
      }
      continue
    }
    out.push(n)
  }

  return out
}

function nodeHalfSize(n) {
  if (n?.kind === 'image') {
    const width = Number(n?.meta?.width || 160)
    const height = Number(n?.meta?.height || 120)
    const rx = (Number.isFinite(width) ? width : 160) / 2
    const ry = (Number.isFinite(height) ? height : 120) / 2
    return {
      rx: rx * Math.abs(Number(n?.scaleX ?? 1)),
      ry: ry * Math.abs(Number(n?.scaleY ?? 1)),
    }
  }

  if (n?.kind === 'text') {
    const fontSize = Number(n?.meta?.fontSize || 24)
    const width = Number(n?.meta?.width || 220)
    const safeFont = Number.isFinite(fontSize) ? fontSize : 24
    const safeWidth = Number.isFinite(width) ? width : 220
    const height = safeFont * 1.2
    return {
      rx: (safeWidth / 2) * Math.abs(Number(n?.scaleX ?? 1)),
      ry: (height / 2) * Math.abs(Number(n?.scaleY ?? 1)),
    }
  }

  const rx = Number(n?.meta?.radiusX ?? 46)
  const ry = Number(n?.meta?.radiusY ?? 60)
  return {
    rx: (Number.isFinite(rx) ? rx : 46) * Math.abs(Number(n?.scaleX ?? 1)),
    ry: (Number.isFinite(ry) ? ry : 60) * Math.abs(Number(n?.scaleY ?? 1)),
  }
}

function nodeBoundingBox(n) {
  const { rx, ry } = nodeHalfSize(n)
  const cx = Number(n?.x ?? 0)
  const cy = Number(n?.y ?? 0)
  return {
    x: cx - rx,
    y: cy - ry,
    width: rx * 2,
    height: ry * 2,
    left: cx - rx,
    right: cx + rx,
    top: cy - ry,
    bottom: cy + ry,
    centerX: cx,
    centerY: cy,
  }
}

function symbolBoundingBox(symbol, symbols) {
  const nodes = Array.isArray(symbol?.nodes) ? symbol.nodes : []
  if (!nodes.length) {
    return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const box = nodeBoundingBoxForSymbols(n, symbols)
    minX = Math.min(minX, box.left)
    minY = Math.min(minY, box.top)
    maxX = Math.max(maxX, box.right)
    maxY = Math.max(maxY, box.bottom)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
  }
  return {
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function nodeBoundingBoxForSymbols(node, symbols = []) {
  if (node?.kind !== 'symbol') return nodeBoundingBox(node)
  const symbol = (symbols || []).find((s) => String(s.id) === String(node.symbolId))
  if (!symbol) return nodeBoundingBox(node)

  const bounds = symbolBoundingBox(symbol, symbols)
  const sx = Math.abs(Number(node.scaleX ?? 1))
  const sy = Math.abs(Number(node.scaleY ?? 1))
  const cx = Number(node.x ?? 0)
  const cy = Number(node.y ?? 0)

  const left = cx + bounds.left * sx
  const right = cx + bounds.right * sx
  const top = cy + bounds.top * sy
  const bottom = cy + bounds.bottom * sy

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    left,
    right,
    top,
    bottom,
    centerX: cx,
    centerY: cy,
  }
}

function groupUid() {
  return 'group_' + Math.random().toString(36).slice(2, 10)
}

function detachNodesFromGroups(store, ids = []) {
  const set = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)))
  if (!set.size) return

  const nextGroups = []
  for (const group of Array.isArray(store.groups) ? store.groups : []) {
    const filtered = (Array.isArray(group.childIds) ? group.childIds : []).filter(
      (id) => !set.has(String(id)),
    )
    if (filtered.length) {
      nextGroups.push({ ...group, childIds: filtered })
    }
  }

  store.groups = nextGroups
  for (const node of store.nodes) {
    if (set.has(String(node.id))) delete node.groupId
  }
}

function applyGroupMembership(store) {
  const nodes = Array.isArray(store.nodes) ? store.nodes : []
  const nodeIds = new Set(nodes.map((n) => String(n.id)))

  const nextGroups = []
  for (const group of Array.isArray(store.groups) ? store.groups : []) {
    if (!Array.isArray(group.childIds)) continue
    const childIds = group.childIds.map((id) => String(id)).filter((id) => nodeIds.has(id))
    if (childIds.length) nextGroups.push({ ...group, childIds })
  }

  store.groups = nextGroups

  const nodeGroupMap = new Map()
  for (const group of nextGroups) {
    for (const id of group.childIds) {
      nodeGroupMap.set(String(id), group.id)
    }
  }

  for (const node of nodes) {
    const gid = nodeGroupMap.get(String(node.id))
    if (gid) node.groupId = gid
    else delete node.groupId
  }

  const validGroupIds = new Set(nextGroups.map((g) => g.id))
  if (store.selectedGroupId && !validGroupIds.has(String(store.selectedGroupId))) {
    store.selectedGroupId = null
  }
}

function clampStackOrigin(store, x, y) {
  const widthCm = Math.max(MIN_CANVAS_CM, Number(store.canvas?.widthCm ?? MIN_CANVAS_CM))
  const heightCm = Math.max(MIN_CANVAS_CM, Number(store.canvas?.heightCm ?? MIN_CANVAS_CM))
  const maxX = widthCm * PX_PER_CM
  const maxY = heightCm * PX_PER_CM
  const nextX = Number.isFinite(Number(x)) ? Number(x) : Number(store.ui?.stackGrid?.startX || 0)
  const nextY = Number.isFinite(Number(y)) ? Number(y) : Number(store.ui?.stackGrid?.startY || 0)
  return {
    x: clamp(nextX, 0, maxX),
    y: clamp(nextY, 0, maxY),
  }
}
