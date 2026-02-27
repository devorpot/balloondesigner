<template>
  <div class="home">
    <header class="home__top">
      <div>
        <div class="eyebrow">Workspace</div>
        <h1>Tus proyectos</h1>
        <p class="subtitle">Crea un proyecto nuevo o retoma uno guardado en tu equipo.</p>
      </div>
      <div class="home__actions">
        <div class="user-pill">GloboStore</div>
        <div class="view-toggle">
          <button
            type="button"
            class="view-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Vista en grilla"
          >
            Grid
          </button>
          <button
            type="button"
            class="view-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="Vista en lista"
          >
            List
          </button>
        </div>
      </div>
    </header>

    <div class="home__toolbar">
      <div class="search">
        <input v-model="query" class="search__input" type="search" placeholder="Buscar proyectos" />
      </div>
      <div class="home__cta">
        <button class="btn btn-light" type="button" @click="createEmpty">Nuevo proyecto</button>
        <button class="btn btn-outline-primary" type="button" @click="createGridProject">
          Nuevo con figuras
        </button>
        <button class="btn btn-outline-secondary" type="button" @click="openGuideModal">
          Nuevo guia pared
        </button>
        <button class="btn btn-outline-secondary" type="button" @click="createStructureProject">
          Nuevo estructura
        </button>
        <button class="btn btn-primary" type="button" @click="openTemplateModal">
          Nuevo desde plantilla
        </button>
      </div>
    </div>

    <section class="projects" :class="`projects--${viewMode}`">
      <article class="project-card project-card--new" @click="openTemplateModal">
        <div class="project-card__thumb project-card__thumb--new">
          <span class="plus">+</span>
        </div>
        <div class="project-card__meta">
          <div class="project-card__title">Crear nuevo proyecto</div>
          <div class="project-card__sub">Desde plantilla</div>
        </div>
      </article>

      <article
        v-for="project in filteredProjects"
        :key="project.id"
        class="project-card"
        @click="openProject(project)"
      >
        <div class="project-card__thumb">
          <div class="thumb-art" :class="project.template?.type || 'empty'"></div>
        </div>
        <div class="project-card__meta">
          <div class="project-card__title">{{ project.name }}</div>
          <div class="project-card__sub">
            {{ projectLabel(project) }} - {{ timeAgo(project.updatedAt || project.createdAt) }}
          </div>
        </div>
      </article>
    </section>

    <div v-if="showModal" class="modal-surface" @click.self="closeCreate">
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <div class="modal-title">Crear proyecto</div>
            <div class="modal-sub">Selecciona el tipo de proyecto y ajusta sus parametros.</div>
          </div>
          <button class="btn btn-light" type="button" @click="closeCreate">Cerrar</button>
        </div>

        <div class="modal-body">
          <label class="field">
            <span>Nombre del proyecto</span>
            <input v-model="form.name" type="text" placeholder="Proyecto sin nombre" />
          </label>

          <div class="template-panel">
            <label class="field">
              <span>Tipo de plantilla</span>
              <select v-model="form.template" class="select">
                <option value="none">Desde cero</option>
                <option value="arc">Arco</option>
                <option value="grid">Figuras</option>
                <option value="guide-wall">Guia pared</option>
              </select>
            </label>

            <div v-if="form.template === 'grid'" class="grid-select">
              <label class="field">
                <span>Figura</span>
                <select v-model="form.grid.shapeId" class="select">
                  <option v-for="shape in gridShapes" :key="shape.id" :value="shape.id">
                    {{ shape.label }}
                  </option>
                </select>
              </label>
            </div>

            <div v-if="form.template === 'guide-wall'" class="grid-select">
              <label class="field">
                <span>Figura base</span>
                <select v-model="form.guide.shapeId" class="select">
                  <option v-for="shape in gridShapes" :key="shape.id" :value="shape.id">
                    {{ shape.label }}
                  </option>
                </select>
              </label>

              <div class="arc-grid">
                <label class="field">
                  <span>Ancho pared</span>
                  <input v-model.number="form.guide.wall.width" type="number" min="10" step="1" />
                  <span class="text-muted xsmall">
                    {{ formatBoth(form.guide.wall.width, form.guide.wall.unit) }}
                  </span>
                </label>
                <label class="field">
                  <span>Alto pared</span>
                  <input v-model.number="form.guide.wall.height" type="number" min="10" step="1" />
                  <span class="text-muted xsmall">
                    {{ formatBoth(form.guide.wall.height, form.guide.wall.unit) }}
                  </span>
                </label>
                <label class="field">
                  <span>Unidad pared</span>
                  <select v-model="form.guide.wall.unit" class="select">
                    <option value="cm">cm</option>
                    <option value="in">pulgadas</option>
                  </select>
                </label>
                <label class="field">
                  <span>Radio max globo</span>
                  <input
                    v-model.number="form.guide.maxRadius.value"
                    type="number"
                    min="1"
                    step="0.1"
                  />
                  <span class="text-muted xsmall">
                    {{ formatBoth(form.guide.maxRadius.value, form.guide.maxRadius.unit) }}
                  </span>
                </label>
                <label class="field">
                  <span>Unidad globo</span>
                  <select v-model="form.guide.maxRadius.unit" class="select">
                    <option value="cm">cm</option>
                    <option value="in">pulgadas</option>
                  </select>
                </label>
              </div>
            </div>

            <div v-if="form.template === 'arc'" class="arc-grid">
              <label class="field">
                <span>Ancho (px)</span>
                <input v-model.number="form.arc.width" type="number" min="120" step="10" />
              </label>
              <label class="field">
                <span>Alto (px)</span>
                <input v-model.number="form.arc.height" type="number" min="80" step="10" />
              </label>
              <label class="field">
                <span>Globos</span>
                <input v-model.number="form.arc.count" type="number" min="4" step="1" />
              </label>
              <label class="field">
                <span>Radio</span>
                <input v-model.number="form.arc.radius" type="number" min="6" step="1" />
              </label>
              <label class="field">
                <span>Filas</span>
                <input v-model.number="form.arc.rows" type="number" min="1" max="6" step="1" />
              </label>
              <label class="field">
                <span>Separacion</span>
                <input v-model.number="form.arc.spacing" type="number" min="0" step="1" />
              </label>
              <label class="field">
                <span>Modo de color</span>
                <select v-model="form.arc.colorMode" class="select">
                  <option value="sequence">Secuencia</option>
                  <option value="solid">Solido</option>
                  <option value="random">Aleatorio</option>
                </select>
              </label>
              <label class="field">
                <span>Colores (hex o nombres)</span>
                <input v-model="form.arc.colors" type="text" placeholder="#ff3b30, #ffb347" />
              </label>
            </div>
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn btn-light" type="button" @click="closeCreate">Cancelar</button>
          <button class="btn btn-primary" type="button" @click="createProject">
            Crear proyecto
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects.store'
import { gridShapes } from '@/data/grid-shapes'

const router = useRouter()
const projects = useProjectsStore()

const query = ref('')
const viewMode = ref('grid')
const showModal = ref(false)

const form = reactive({
  name: '',
  template: 'none',
  arc: {
    width: 520,
    height: 260,
    count: 32,
    radius: 22,
    rows: 2,
    spacing: 4,
    colorMode: 'sequence',
    colors: '#ff3b30, #ffb347, #ffd54f',
  },
  grid: {
    shapeId: gridShapes[0]?.id || 'duplet-ring',
  },
  guide: {
    shapeId: gridShapes[0]?.id || 'duplet-ring',
    wall: {
      width: 300,
      height: 200,
      unit: 'cm',
    },
    maxRadius: {
      value: 12,
      unit: 'in',
    },
  },
})

onMounted(() => {
  projects.init()
})

const filteredProjects = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = projects.projects || []
  if (!q) return list
  return list.filter((p) =>
    String(p.name || '')
      .toLowerCase()
      .includes(q),
  )
})

function projectLabel(project) {
  if (project?.template?.type === 'arc') return 'Arco'
  if (project?.template?.type === 'grid') return 'Figura'
  if (project?.template?.type === 'guide-wall') return 'Guia pared'
  if (project?.template?.type === 'structure') return 'Estructura'
  return 'Proyecto libre'
}

function timeAgo(ts) {
  const value = Number(ts || 0)
  if (!value) return 'sin fecha'
  const diff = Date.now() - value
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'justo ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

function formatBoth(value, unit) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (unit === 'in') {
    const cm = roundNumber(n * 2.54)
    return `${roundNumber(n)} in · ${cm} cm`
  }
  const inch = roundNumber(n / 2.54)
  return `${roundNumber(n)} cm · ${inch} in`
}

function roundNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function openCreate() {
  form.name = ''
  form.template = 'none'
  form.arc = {
    width: 520,
    height: 260,
    count: 32,
    radius: 22,
    rows: 2,
    spacing: 4,
    colorMode: 'sequence',
    colors: '#ff3b30, #ffb347, #ffd54f',
  }
  form.grid = {
    shapeId: gridShapes[0]?.id || 'duplet-ring',
  }
  form.guide = {
    shapeId: gridShapes[0]?.id || 'duplet-ring',
    wall: {
      width: 300,
      height: 200,
      unit: 'cm',
    },
    maxRadius: {
      value: 12,
      unit: 'in',
    },
  }
  showModal.value = true
}

function openTemplateModal() {
  openCreate()
  form.template = 'arc'
}

function createEmpty() {
  projects.createProject({
    name: '',
    template: null,
  })
  router.push('/editor')
}

function createGridProject() {
  projects.createProject({
    name: '',
    template: {
      type: 'grid',
      params: { shapeId: gridShapes[0]?.id || 'duplet-ring' },
    },
  })
  router.push('/grid')
}

function createStructureProject() {
  projects.createProject({
    name: '',
    template: {
      type: 'structure',
      params: {},
    },
  })
  router.push('/structure')
}

function openGuideModal() {
  openCreate()
  form.template = 'guide-wall'
}

function closeCreate() {
  showModal.value = false
}

function openProject(project) {
  if (!project?.id) return
  projects.setActiveProject(project.id)
  if (project?.template?.type === 'grid') {
    router.push('/grid')
    return
  }
  if (project?.template?.type === 'guide-wall') {
    router.push('/guide')
    return
  }
  if (project?.template?.type === 'structure') {
    router.push('/structure')
    return
  }
  router.push('/editor')
}

function createProject() {
  const name = String(form.name || '').trim()
  let template = null
  if (form.template === 'arc') {
    template = {
      type: form.template,
      params: {
        width: Number(form.arc.width || 520),
        height: Number(form.arc.height || 260),
        count: Number(form.arc.count || 32),
        radius: Number(form.arc.radius || 22),
        rows: Number(form.arc.rows || 2),
        spacing: Number(form.arc.spacing || 4),
        colorMode: form.arc.colorMode,
        colors: String(form.arc.colors || ''),
      },
    }
  }
  if (form.template === 'grid') {
    template = {
      type: form.template,
      params: {
        shapeId: form.grid.shapeId || gridShapes[0]?.id || 'duplet-ring',
      },
    }
  }
  if (form.template === 'guide-wall') {
    template = {
      type: form.template,
      params: {
        shapeId: form.guide.shapeId || gridShapes[0]?.id || 'duplet-ring',
        wall: {
          width: Number(form.guide.wall?.width || 300),
          height: Number(form.guide.wall?.height || 200),
          unit: form.guide.wall?.unit || 'cm',
        },
        maxRadius: {
          value: Number(form.guide.maxRadius?.value || 12),
          unit: form.guide.maxRadius?.unit || 'in',
        },
      },
    }
  }

  const project = projects.createProject({
    name,
    template,
  })

  showModal.value = false
  if (template?.type === 'grid') {
    router.push('/grid')
    return
  }
  if (template?.type === 'guide-wall') {
    router.push('/guide')
    return
  }
  router.push('/editor')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Space+Grotesk:wght@400;600;700&display=swap');

.home {
  min-height: 100vh;
  padding: 32px 40px 60px;
  background: radial-gradient(circle at top left, #fff5eb, #fff 60%);
  color: #1e1e1e;
  font-family: 'Space Grotesk', sans-serif;
}

h1 {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 2rem;
  margin: 6px 0 6px;
}

.eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #d1884f;
  font-weight: 600;
}

.subtitle {
  color: #6c757d;
  max-width: 520px;
}

.home__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.home__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-pill {
  background: #fff;
  border: 1px solid #f2d3b8;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.view-toggle {
  background: #fff;
  border: 1px solid #f2d3b8;
  border-radius: 10px;
  padding: 4px;
  display: inline-flex;
  gap: 4px;
}

.view-btn {
  border: none;
  background: transparent;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  color: #7c7c7c;
}

.view-btn.active {
  background: #ffefe0;
  color: #d46b08;
}

.home__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 22px;
}

.search {
  position: relative;
  width: min(320px, 100%);
}

.search__input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #f2d3b8;
  background: #fff;
}

.projects {
  margin-top: 26px;
  display: grid;
  gap: 20px;
}

.projects--grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.projects--list {
  grid-template-columns: 1fr;
}

.project-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  box-shadow: 0 18px 40px -30px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 50px -30px rgba(0, 0, 0, 0.4);
}

.project-card__thumb {
  height: 140px;
  border-radius: 12px;
  background: #fdf6f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-card__thumb--new {
  background: #fff8f2;
}

.thumb-art {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: radial-gradient(circle at 30% 30%, #ffd6b8, #fff);
  border: 1px dashed #f0c6a6;
}

.thumb-art.arc {
  background: conic-gradient(from 180deg, #ffd6b8, #ffe0c7, #ffd6b8);
}

.thumb-art.guide-wall {
  background: linear-gradient(135deg, #ffe7d2, #fff7ee 60%);
  border: 1px dashed #f0c6a6;
}

.thumb-art.empty {
  background: #fff0e3;
}

.plus {
  font-size: 2rem;
  color: #d46b08;
}

.project-card__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-card__title {
  font-weight: 600;
}

.project-card__sub {
  font-size: 0.8rem;
  color: #6c757d;
}

.modal-surface {
  position: fixed;
  inset: 0;
  background: rgba(12, 10, 8, 0.4);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 50;
}

.modal-card {
  width: min(820px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: 0 30px 60px -40px rgba(0, 0, 0, 0.5);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.modal-title {
  font-weight: 600;
  font-size: 1.1rem;
}

.modal-sub {
  color: #6c757d;
  font-size: 0.85rem;
}

.modal-body {
  margin-top: 16px;
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
}

.field input,
.field select {
  border-radius: 10px;
  border: 1px solid #f2d3b8;
  padding: 8px 12px;
}

.home__cta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.template-panel {
  border: 1px solid #f4e0cf;
  border-radius: 14px;
  padding: 16px;
  background: #fffaf5;
}

.arc-grid {
  margin-top: 12px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.grid-select {
  margin-top: 12px;
}

.modal-foot {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 900px) {
  .home {
    padding: 24px;
  }

  .home__top {
    flex-direction: column;
    align-items: flex-start;
  }

  .home__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .project-card__thumb {
    height: 120px;
  }
}
</style>
