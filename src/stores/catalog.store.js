import { defineStore } from 'pinia'
import catalogSeed from '@/data/catalog.json'

const STORAGE_KEY = 'balloon_catalog_v1'
const STORAGE_VERSION = 2

const MEASUREMENT_MAP = {
  sizeIn: (type) => {
    if (type && Number.isFinite(type.sizeIn)) return `${type.sizeIn}`
    return '—'
  },
  radius: (type) => {
    const value = Number(type?.default?.radiusY)
    if (Number.isFinite(value)) return `${Math.round(value)} px`
    return '—'
  },
  default: (type) => {
    if (type && Number.isFinite(type.sizeIn)) return `${type.sizeIn}`
    return '—'
  },
}

const NAME_SORTER = (a, b) => String(a.name || '').localeCompare(String(b.name || ''))
const SIZE_SORTER = (a, b) => {
  const na = Number(a.sizeIn || 0)
  const nb = Number(b.sizeIn || 0)
  return na - nb
}

const SORTERS = {
  size: SIZE_SORTER,
  name: NAME_SORTER,
  default: NAME_SORTER,
}

const defaultCategories = Array.isArray(catalogSeed?.categories) ? catalogSeed.categories : []

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function sanitizeTypeForCategory(type, family) {
  if (!type || typeof type !== 'object') return null
  return {
    ...type,
    family: String(type.family || family || '').trim() || family || '',
  }
}

function sanitizeCategories(list = []) {
  const sanitized = []
  for (const entry of list || []) {
    if (!entry || typeof entry !== 'object') continue
    const family = String(entry.family || '').trim()
    if (!family) continue

    const measurementKey = String(entry.measurementType || 'default')
    const sortKey = String(entry.sort || 'default')

    sanitized.push({
      family,
      id: entry.id || slugify(family),
      label: entry.label || family,
      colors: Array.isArray(entry.colors) ? [...entry.colors] : [],
      measurementLabel: entry.measurementLabel || 'Tamaño',
      measurement: MEASUREMENT_MAP[measurementKey] || MEASUREMENT_MAP.default,
      sort: SORTERS[sortKey] || SORTERS.default,
      types: (entry.types || [])
        .map((type) => sanitizeTypeForCategory(type, family))
        .filter(Boolean),
    })
  }
  return sanitized
}

function flattenTypes(categories = []) {
  const types = []
  for (const category of categories) {
    for (const type of category.types || []) {
      types.push({ ...type })
    }
  }
  return types
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

const fallbackCategories = sanitizeCategories(defaultCategories)

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    version: STORAGE_VERSION,
    categories: [],
    initialized: false,
  }),

  getters: {
    types: (state) => flattenTypes(state.categories || []),

    typeById: (state) => {
      const map = new Map(
        (state.categories || []).flatMap((category) =>
          (category.types || []).map((t) => [t.id, t]),
        ),
      )
      return (id) => map.get(id) || null
    },

    families: (state) => (state.categories || []).map((c) => c.family),
  },

  actions: {
    init() {
      if (this.initialized) return

      const parsed = tryReadStorage()
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.categories)) {
        this.version = Number(parsed.version || STORAGE_VERSION) || STORAGE_VERSION
        const sanitized = sanitizeCategories(parsed.categories)
        if (sanitized.length) {
          this.categories = sanitized
          this.initialized = true
          this.persist()
          return
        }
      }

      this.categories = fallbackCategories
      this.initialized = true
      this.persist()
    },

    persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: this.version,
            categories: this.categories,
            savedAt: new Date().toISOString(),
          }),
        )
      } catch {
        // ignore
      }
    },

    setCategories(list) {
      this.categories = sanitizeCategories(list)
      this.persist()
    },
  },
})
