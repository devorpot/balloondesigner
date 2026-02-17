import { defineStore } from 'pinia'

const STORAGE_KEY = 'balloon_catalog_v1'
const STORAGE_VERSION = 1

const defaultTypes = [
  { id: 'round-5', name: 'R5 Redondo', family: 'Redondo', sizeIn: 5, cost: 3, default: { radiusX: 26, radiusY: 32, knot: true } },
  { id: 'round-9', name: 'R9 Redondo', family: 'Redondo', sizeIn: 9, cost: 5, default: { radiusX: 40, radiusY: 52, knot: true } },
  { id: 'round-11', name: 'R11 Redondo', family: 'Redondo', sizeIn: 11, cost: 7, default: { radiusX: 46, radiusY: 60, knot: true } },
  { id: 'round-16', name: 'R16 Redondo', family: 'Redondo', sizeIn: 16, cost: 12, default: { radiusX: 62, radiusY: 82, knot: true } },
  { id: '260', name: '260 (modelado)', family: 'Modelado', sizeIn: null, cost: 6, default: { radiusX: 18, radiusY: 90, knot: false } },
  { id: '160', name: '160 (modelado)', family: 'Modelado', sizeIn: null, cost: 5, default: { radiusX: 14, radiusY: 70, knot: false } },
  { id: 'link-12', name: 'Link 12"', family: 'Link', sizeIn: 12, cost: 9, default: { radiusX: 46, radiusY: 60, knot: true } },
  { id: 'heart-11', name: 'Corazón 11"', family: 'Figura', sizeIn: 11, cost: 10, default: { radiusX: 52, radiusY: 52, knot: true, shape: 'heart' } },
]

function cloneDefaults() {
  return structuredClone(defaultTypes)
}

function normalizeCost(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

function normalizeSizeIn(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizeType(raw) {
  if (!raw || typeof raw !== 'object') return null

  const id = String(raw.id || '').trim()
  if (!id) return null

  const name = String(raw.name || id).trim()
  const family = String(raw.family || '').trim()
  const sizeIn = normalizeSizeIn(raw.sizeIn)
  const cost = normalizeCost(raw.cost)

  const def = (raw.default && typeof raw.default === 'object') ? raw.default : {}
  const radiusX = Number(def.radiusX)
  const radiusY = Number(def.radiusY)

  const normalizedDefault = {
    ...def,
    radiusX: Number.isFinite(radiusX) ? radiusX : 20,
    radiusY: Number.isFinite(radiusY) ? radiusY : 28,
    knot: Boolean(def.knot),
  }

  return {
    id,
    name,
    family: family || null,
    sizeIn,
    cost,
    default: normalizedDefault,
  }
}

function uniqueById(list) {
  const map = new Map()
  for (const t of list) {
    if (!t?.id) continue
    map.set(t.id, t)
  }
  return [...map.values()]
}

function sanitizeTypes(list) {
  if (!Array.isArray(list)) return cloneDefaults()
  const normalized = []
  for (const item of list) {
    const t = normalizeType(item)
    if (t) normalized.push(t)
  }
  return uniqueById(normalized)
}

function tryReadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    version: STORAGE_VERSION,
    types: [],
    initialized: false,
  }),

  getters: {
    typeById: (state) => {
      const map = new Map((state.types || []).map(t => [t.id, t]))
      return (id) => map.get(id) || null
    },

    families: (state) => {
      const set = new Set()
      for (const t of state.types || []) {
        if (t?.family) set.add(String(t.family))
      }
      return [...set].sort((a, b) => a.localeCompare(b))
    },

    costsSummary: (state) => {
      let min = Infinity
      let max = -Infinity
      let total = 0
      let count = 0

      for (const t of state.types || []) {
        const c = Number(t?.cost || 0)
        if (!Number.isFinite(c)) continue
        min = Math.min(min, c)
        max = Math.max(max, c)
        total += c
        count++
      }

      return {
        count,
        min: count ? min : 0,
        max: count ? max : 0,
        avg: count ? total / count : 0,
      }
    },
  },

  actions: {
    init() {
      if (this.initialized) return

      const parsed = tryReadStorage()

      // Si tu storage actual es solo un array (versión vieja), lo aceptamos.
      if (Array.isArray(parsed)) {
        this.types = sanitizeTypes(parsed)
        this.persist()
        this.initialized = true
        return
      }

      // Si luego migras a { version, types }, ya está listo.
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.types)) {
        this.version = Number(parsed.version || STORAGE_VERSION) || STORAGE_VERSION
        this.types = sanitizeTypes(parsed.types)
        this.persist()
        this.initialized = true
        return
      }

      // Fallback
      this.types = cloneDefaults()
      this.persist()
      this.initialized = true
    },

    persist() {
      try {
        // Guardamos objeto para poder versionar/migrar a futuro sin dolor
        const payload = {
          version: this.version,
          types: this.types,
          savedAt: new Date().toISOString(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // si localStorage falla (modo privado, quota, etc), no tronamos la app
      }
    },

    setTypes(list) {
      this.types = sanitizeTypes(list)
      this.persist()
    },

    updateTypeCost(typeId, newCost) {
      const id = String(typeId || '').trim()
      if (!id) return

      const t = this.types.find(x => x.id === id)
      if (!t) return

      t.cost = normalizeCost(newCost)
      this.persist()
    },

    upsertType(type) {
      const t = normalizeType(type)
      if (!t) return

      const idx = this.types.findIndex(x => x.id === t.id)
      if (idx >= 0) this.types[idx] = t
      else this.types.push(t)

      this.types = uniqueById(this.types)
      this.persist()
    },

    removeType(typeId) {
      const id = String(typeId || '').trim()
      if (!id) return
      this.types = (this.types || []).filter(t => t.id !== id)
      this.persist()
    },

    resetToDefaults() {
      this.version = STORAGE_VERSION
      this.types = cloneDefaults()
      this.persist()
    },
  },
})
