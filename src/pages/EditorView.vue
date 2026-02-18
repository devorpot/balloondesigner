<template>
  <EditorLayout>
    <template #topbar>
      <ToolbarTop />
    </template>

    <div class="grid" @keydown="onKeyDown" tabindex="0" ref="wrap">
      <!-- Left column -->
      <div class="left">
        <div class="left-tabs">
          <button
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'catalog' }"
            @click="leftTab = 'catalog'"
          >
            Catálogo
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'templates' }"
            @click="leftTab = 'templates'"
          >
            Plantillas
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: leftTab === 'layers' }"
            @click="leftTab = 'layers'"
          >
            Capas
          </button>
        </div>
        <div class="left-panels">
          <div v-show="leftTab === 'catalog'" class="panel-stack">
            <SidebarCatalog />
          </div>
          <div v-show="leftTab === 'templates'" class="panel-stack">
            <SidebarTemplates />
          </div>
          <div v-show="leftTab === 'layers'" class="panel-stack">
            <LayerPanel />
          </div>
        </div>
      </div>

      <!-- Center -->
      <div class="center">
        <CanvasStage />
        <CanvasControls />
      </div>

      <!-- Right column -->
      <div class="right">
        <div class="right-tabs">
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'format' }"
            @click="activeTab = 'format'"
          >
            Formato
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'canvas' }"
            @click="activeTab = 'canvas'"
          >
            Canvas
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: activeTab === 'calc' }"
            @click="activeTab = 'calc'"
          >
            Calculador
          </button>
        </div>

        <div class="right-panels">
          <div v-show="activeTab === 'format'" class="panel-stack">
            <PropertiesPanel />
            <AlignPanel v-if="store.selectedIds?.length" />
          </div>
          <div v-show="activeTab === 'canvas'" class="panel-stack">
            <CanvasSettingsPanel />
          </div>
          <div v-show="activeTab === 'calc'" class="panel-stack">
            <MaterialsPanel />
          </div>
        </div>
      </div>
    </div>
  </EditorLayout>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

import EditorLayout from '@/layouts/EditorLayout.vue'
import ToolbarTop from '@/components/editor/ToolbarTop.vue'
import SidebarCatalog from '@/components/editor/SidebarCatalog.vue'
import SidebarTemplates from '@/components/editor/SidebarTemplates.vue'
import CanvasStage from '@/components/editor/CanvasStage.vue'
import CanvasControls from '@/components/editor/CanvasControls.vue'
import LayerPanel from '@/components/editor/LayerPanel.vue'
import PropertiesPanel from '@/components/editor/PropertiesPanel.vue'
import AlignPanel from '@/components/editor/AlignPanel.vue'
import CanvasSettingsPanel from '@/components/editor/CanvasSettingsPanel.vue'
import MaterialsPanel from '@/components/editor/MaterialsPanel.vue'

const store = useEditorStore()
const wrap = ref(null)
const activeTab = ref('format')
const leftTab = ref('catalog')

onMounted(() => {
  store.initAutosave()
  wrap.value?.focus?.()
})

onBeforeUnmount(() => {
  store.destroyAutosave()
})

function isTypingTarget(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable
}

function onKeyDown(e) {
  const key = e.key.toLowerCase()
  const isCmd = e.metaKey || e.ctrlKey

  if (key === 'escape') {
    store.clearSelection()
    return
  }

  if ((key === 'delete' || key === 'backspace') && !isTypingTarget(e)) {
    store.deleteSelected()
    return
  }

  if (isCmd && key === 'd') {
    e.preventDefault()
    store.duplicateSelected()
    return
  }

  if (isTypingTarget(e)) return

  const step = e.shiftKey ? 10 : 1

  // Mover todos los seleccionados
  if (key === 'arrowleft') {
    e.preventDefault()
    nudgeSelection(-step, 0)
    return
  }
  if (key === 'arrowright') {
    e.preventDefault()
    nudgeSelection(step, 0)
    return
  }
  if (key === 'arrowup') {
    e.preventDefault()
    nudgeSelection(0, -step)
    return
  }
  if (key === 'arrowdown') {
    e.preventDefault()
    nudgeSelection(0, step)
    return
  }
  // Undo / Redo (pro)
  if (isCmd && key === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
    return
  }

  if (isCmd && key === 'z' && e.shiftKey) {
    e.preventDefault()
    store.redo()
    return
  }

  // Ctrl+Y (Windows) redo
  if ((e.ctrlKey && key === 'y') || (isCmd && key === 'y')) {
    e.preventDefault()
    store.redo()
    return
  }

  if (isCmd && e.shiftKey && key === 'f') {
    e.preventDefault()
    store.fillGuides?.({ removeGuides: !!store.ui?.guideRemoveOnFill })
    return
  }

  if (isCmd && e.shiftKey && key === 'g') {
    e.preventDefault()
    store.convertGuidesToBalloons?.()
    return
  }

  if (isCmd && e.shiftKey && key === 'a') {
    e.preventDefault()
    store.startGuideBoxMode?.({ action: 'fill', removeGuides: !!store.ui?.guideRemoveOnFill })
    return
  }

  if (isCmd && e.shiftKey && key === 'c') {
    e.preventDefault()
    store.startGuideBoxMode?.({
      action: 'convert',
      removeGuides: !!store.ui?.guideRemoveOnFill,
    })
    return
  }
}

function nudgeSelection(dx, dy) {
  const ids = Array.isArray(store.selectedIds) ? store.selectedIds : []
  if (!ids.length) return

  const snapOn = !!store.settings?.snap
  const s = Number(store.settings?.snapStep || 1)

  for (const id of ids) {
    const n = store.nodes.find((x) => x.id === id)
    if (!n || n.locked) continue

    const nextX = Number(n.x || 0) + dx
    const nextY = Number(n.y || 0) + dy

    if (snapOn) {
      store.updateNode(n.id, { x: snap(nextX, s), y: snap(nextY, s) })
    } else {
      store.updateNode(n.id, { x: nextX, y: nextY })
    }
  }
}

function snap(v, step) {
  const s = Number(step) || 1
  return Math.round(v / s) * s
}
</script>

<style lang="less" scoped>
.grid {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 12px;
  height: calc(100vh - 56px - 24px);
  outline: none;
}

.center {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.right-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: #f5f7fb;
  border-radius: 14px;
  padding: 6px;
}

.tab-btn {
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5c6370;
}

.tab-btn.active {
  background: #12a4b7;
  color: #fff;
  box-shadow: 0 6px 12px -10px rgba(18, 164, 183, 0.6);
}

.right-panels {
  overflow: auto;
  min-height: 0;
  display: block;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.left-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: #f5f7fb;
  border-radius: 14px;
  padding: 6px;
}

.left-panels {
  overflow: auto;
  min-height: 0;
  display: block;
}
</style>
