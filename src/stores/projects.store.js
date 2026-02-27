import { defineStore } from 'pinia'

const STORAGE_KEY = 'balloon_projects_v1'
const ACTIVE_KEY = 'balloon_active_project_id'

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

function readActiveId() {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

function writeActiveId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, String(id))
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // ignore
  }
}

function uid() {
  return `project_${Math.random().toString(36).slice(2, 10)}`
}

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
    activeProjectId: null,
    initialized: false,
  }),

  getters: {
    activeProject(state) {
      const id = String(state.activeProjectId || '')
      return (state.projects || []).find((p) => String(p.id) === id) || null
    },
  },

  actions: {
    init() {
      if (this.initialized) return
      const list = readStorage()
      this.projects = list
      this.activeProjectId = readActiveId()
      this.initialized = true
    },

    persist() {
      writeStorage(this.projects || [])
      writeActiveId(this.activeProjectId)
    },

    setActiveProject(id) {
      this.activeProjectId = id ? String(id) : null
      this.persist()
    },

    createProject({ name = '', template = null, data = null } = {}) {
      const now = Date.now()
      const project = {
        id: uid(),
        name: String(name || '').trim() || `Proyecto ${this.projects.length + 1}`,
        template: template && typeof template === 'object' ? template : null,
        data: data && typeof data === 'object' ? data : null,
        createdAt: now,
        updatedAt: now,
        savedAt: now,
      }
      this.projects = [project, ...(this.projects || [])]
      this.activeProjectId = project.id
      this.persist()
      return project
    },

    updateProject(id, patch = {}) {
      const targetId = String(id || '')
      if (!targetId) return null
      const list = this.projects || []
      let next = null
      this.projects = list.map((p) => {
        if (String(p.id) !== targetId) return p
        next = { ...p, ...patch, updatedAt: Date.now() }
        return next
      })
      if (next) this.persist()
      return next
    },

    updateProjectData(id, data) {
      if (!data || typeof data !== 'object') return null
      return this.updateProject(id, { data })
    },

    saveProjectSnapshot(id, data) {
      if (!data || typeof data !== 'object') return null
      return this.updateProject(id, { data, savedAt: Date.now() })
    },

    saveProjectAs({ name = '', template = null, data = null } = {}) {
      return this.createProject({ name, template, data })
    },
  },
})
