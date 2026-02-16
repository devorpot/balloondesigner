import { defineStore } from 'pinia'

const STORAGE_KEY = 'balloon_catalog_v1'

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

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    types: [],
  }),

  actions: {
    init() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        this.types = structuredClone(defaultTypes)
        this.persist()
        return
      }

      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.types = parsed
        } else {
          this.types = structuredClone(defaultTypes)
        }
      } catch {
        this.types = structuredClone(defaultTypes)
      }
    },

    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.types))
    },

    updateTypeCost(typeId, newCost) {
      const t = this.types.find(x => x.id === typeId)
      if (!t) return

      const cost = Number(newCost)
      t.cost = Number.isFinite(cost) && cost >= 0 ? cost : 0
      this.persist()
    },

    resetToDefaults() {
      this.types = structuredClone(defaultTypes)
      this.persist()
    },
  },
})
