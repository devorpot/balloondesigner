<template>
  <EditorLayout>
    <template #topbar>
      <ToolbarTop />
    </template>

    <div class="grid" @keydown="onKeyDown" tabindex="0" ref="wrap">
      <SidebarCatalog />
      <CanvasStage />
      <div class="right">
        <LayerPanel />
         <PropertiesPanel />
         <MaterialsPanel />
        
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
import CanvasStage from '@/components/editor/CanvasStage.vue'
import LayerPanel from '@/components/editor/LayerPanel.vue'
import PropertiesPanel from '@/components/editor/PropertiesPanel.vue'
import MaterialsPanel from '@/components/editor/MaterialsPanel.vue'

const store = useEditorStore()
const wrap = ref(null)

onMounted(() => {
  store.initAutosave()
  wrap.value?.focus?.()
})

onBeforeUnmount(() => {
  store.destroyAutosave()
})

function isTypingTarget(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
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

  if (!store.selectedId) return
  if (isTypingTarget(e)) return

  const step = e.shiftKey ? 10 : 1

  if (key === 'arrowleft') {
    e.preventDefault()
    nudge(-step, 0)
  } else if (key === 'arrowright') {
    e.preventDefault()
    nudge(step, 0)
  } else if (key === 'arrowup') {
    e.preventDefault()
    nudge(0, -step)
  } else if (key === 'arrowdown') {
    e.preventDefault()
    nudge(0, step)
  }
}

function nudge(dx, dy) {
  const n = store.selectedNode
  if (!n || n.locked) return

  const nextX = Number(n.x || 0) + dx
  const nextY = Number(n.y || 0) + dy

  if (store.settings.snap) {
    const s = Number(store.settings.snapStep || 1)
    store.updateNode(n.id, { x: snap(nextX, s), y: snap(nextY, s) })
  } else {
    store.updateNode(n.id, { x: nextX, y: nextY })
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

.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
</style>
