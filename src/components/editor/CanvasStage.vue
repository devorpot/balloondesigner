<template>
  <div class="canvas card border-0 shadow-sm">
    <div class="card-body p-0 h-100">
      <div ref="wrap" class="stage-wrap">
        <v-stage
          ref="stageRef"
          :config="stageConfig"
          @wheel="onWheel"
          @mousedown="onStagePointerDown"
          @touchstart="onStagePointerDown"
          @click="onStageClick"
          @tap="onStageClick"
        >
          <!-- Grid layer -->
          <v-layer v-if="store.settings.grid" :config="{ listening: false }">
            <v-line v-for="l in gridLines" :key="l.key" :config="l.cfg" />
          </v-layer>

          <v-layer ref="layerRef">
            <!-- Background -->
            <v-rect :config="bgConfig" />

            <!-- Nodes -->
            <template v-for="node in store.visibleNodes" :key="node.id">
              <v-group
                :config="groupConfig(node)"
                @mousedown="onNodePointerDown(node, $event)"
                @touchstart="onNodePointerDown(node, $event)"
                @dragend="onDragEnd(node, $event)"
                @transformend="onTransformEnd(node, $event)"
              >
                <v-ellipse :config="ellipseConfig(node)" />
                <v-ellipse :config="shineConfig(node)" />
                <v-circle :config="knotConfig(node)" />

              </v-group>
            </template>

            <v-transformer ref="trRef" :config="transformerConfig" />
          </v-layer>
        </v-stage>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'

const store = useEditorStore()

const wrap = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)
const trRef = ref(null)

const canvasWidth = 1600
const canvasHeight = 900

const size = ref({ w: 300, h: 300 })
let ro = null

const stageConfig = computed(() => ({
  width: size.value.w,
  height: size.value.h,
  x: store.view.x,
  y: store.view.y,
  scaleX: store.view.scale,
  scaleY: store.view.scale,
}))

const bgConfig = computed(() => ({
  x: 0,
  y: 0,
  width: canvasWidth,
  height: canvasHeight,
  fill: '#ffffff',
  id: 'bg',
  name: 'bg',
  listening: true, // importante para detectar click vacío
}))

const transformerConfig = {
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  boundBoxFunc: (oldBox, newBox) => {
    if (newBox.width < 20 || newBox.height < 20) return oldBox
    return newBox
  },
}

function getStage() {
  return stageRef.value?.getStage?.() ?? null
}

function getTransformer() {
  return trRef.value?.getNode?.() ?? null
}

function groupConfig(n) {
  return {
    id: n.id,
    x: n.x,
    y: n.y,
    rotation: n.rotation,
    scaleX: n.scaleX,
    scaleY: n.scaleY,
    opacity: n.opacity,
    draggable: !n.locked,
  }
}

function ellipseConfig(n) {
  const rx = Number(n?.meta?.radiusX ?? 46)
  const ry = Number(n?.meta?.radiusY ?? 60)

  return {
    x: 0,
    y: 0,
    radiusX: rx,
    radiusY: ry,
    fill: n.color,
    stroke: 'rgba(0,0,0,.10)',
    strokeWidth: 1,
    listening: true,
    perfectDrawEnabled: false,
  }
}

function shineConfig() {
  return {
    x: -14,
    y: -18,
    radiusX: 10,
    radiusY: 18,
    fill: 'rgba(255,255,255,0.35)',
    listening: false,
    perfectDrawEnabled: false,
  }
}

function knotConfig(n) {
  const ry = Number(n?.meta?.radiusY ?? 60)
  const show = n?.meta?.knot !== false

  return {
    x: 0,
    y: ry + 6,
    radius: 6,
    fill: 'rgba(0,0,0,0.18)',
    listening: false,
    visible: show,
    perfectDrawEnabled: false,
  }
}


/* Selección por pointer down */
function onNodePointerDown(node, e) {
  // Detener burbujeo en Konva
  if (e?.cancelBubble !== undefined) e.cancelBubble = true
  if (e?.evt?.cancelBubble !== undefined) e.evt.cancelBubble = true

  store.select(node.id)
}

/* Selection + transformer binding */
watch(
  () => store.selectedId,
  async (id) => {
    await nextTick()
    const stage = getStage()
    const tr = getTransformer()
    if (!stage || !tr) return

    if (!id) {
      tr.nodes([])
      tr.getLayer()?.batchDraw()
      return
    }

    // OJO: findOne con id funciona
    const konvaNode = stage.findOne('#' + id)
    if (!konvaNode) {
      tr.nodes([])
      tr.getLayer()?.batchDraw()
      return
    }

    const selected = store.selectedNode
    tr.enabledAnchors(selected?.locked ? [] : transformerConfig.enabledAnchors)

    tr.nodes([konvaNode])
    tr.getLayer()?.batchDraw()
  },
  { immediate: true }
)

function onDragEnd(node, e) {
  const t = e.target
  store.updateNode(node.id, { x: t.x(), y: t.y() })
}

function onTransformEnd(node, e) {
  const t = e.target
  store.updateNode(node.id, {
    x: t.x(),
    y: t.y(),
    scaleX: t.scaleX(),
    scaleY: t.scaleY(),
    rotation: t.rotation(),
  })
}

/* Click en vacío => limpiar selección */
function onStageClick(e) {
  const stage = getStage()
  if (!stage) return

  const target = e.target

  // vacío si das click al stage o al background
  const clickedOnStage = target === stage
  const clickedOnBg = typeof target?.hasName === 'function' && target.hasName('bg')

  if (clickedOnStage || clickedOnBg) {
    store.clearSelection()
  }
}

/* Zoom wheel */
function onWheel(e) {
  e.evt.preventDefault()

  const stage = getStage()
  if (!stage) return

  const oldScale = store.view.scale
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  const scaleBy = 1.06
  const dir = e.evt.deltaY > 0 ? -1 : 1
  const newScale = dir > 0 ? oldScale * scaleBy : oldScale / scaleBy

  const mousePointTo = {
    x: (pointer.x - store.view.x) / oldScale,
    y: (pointer.y - store.view.y) / oldScale,
  }

  store.setView({
    scale: newScale,
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  })
}

/* Pan Space + drag or middle mouse */
const panning = ref(false)
const panStart = ref({ x: 0, y: 0, vx: 0, vy: 0 })
const spaceDown = ref(false)

function onStagePointerDown(e) {
  const evt = e.evt
  const isMiddle = evt?.button === 1
  if (!(spaceDown.value || isMiddle)) return

  panning.value = true
  panStart.value = { x: evt.clientX, y: evt.clientY, vx: store.view.x, vy: store.view.y }
}

function onDocMouseMove(e) {
  if (!panning.value) return
  const dx = e.clientX - panStart.value.x
  const dy = e.clientY - panStart.value.y
  store.setView({ x: panStart.value.vx + dx, y: panStart.value.vy + dy })
}

function onDocMouseUp() {
  panning.value = false
}

function onDocKeyDown(e) {
  if (e.code === 'Space') spaceDown.value = true
}

function onDocKeyUp(e) {
  if (e.code === 'Space') spaceDown.value = false
}

onMounted(() => {
  ro = new ResizeObserver((entries) => {
    const cr = entries[0]?.contentRect
    if (!cr) return
    size.value = { w: Math.max(320, Math.floor(cr.width)), h: Math.max(320, Math.floor(cr.height)) }
  })
  if (wrap.value) ro.observe(wrap.value)

  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
  document.addEventListener('keydown', onDocKeyDown)
  document.addEventListener('keyup', onDocKeyUp)
})

onBeforeUnmount(() => {
  if (ro && wrap.value) ro.unobserve(wrap.value)
  ro = null

  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
  document.removeEventListener('keydown', onDocKeyDown)
  document.removeEventListener('keyup', onDocKeyUp)
})

/* Grid lines */
const gridSize = 50
const gridLines = computed(() => {
  const lines = []
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    lines.push({
      key: `v-${x}`,
      cfg: { points: [x, 0, x, canvasHeight], stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1 },
    })
  }
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    lines.push({
      key: `h-${y}`,
      cfg: { points: [0, y, canvasWidth, y], stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1 },
    })
  }
  return lines
})
</script>

<style lang="less" scoped>
.canvas {
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.stage-wrap {
  width: 100%;
  height: 100%;
}
</style>
