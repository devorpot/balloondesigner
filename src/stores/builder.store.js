import { PX_PER_CM } from '@/constants/canvas'
import { useEditorStore } from '@/stores/editor.store'

function uid() {
  return 'node_' + Math.random().toString(36).slice(2, 10)
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
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

export function useBuilderStore() {
  const store = useEditorStore()

  if (!store.ui) store.ui = {}
  if (!store.ui.isGuideStore) store.ui.isGuideStore = true
  if (!store.ui.viewSide) store.ui.viewSide = 'front'
  if (!store.setViewSide) {
    store.setViewSide = (side) => {
      const next = side === 'back' ? 'back' : 'front'
      store.ui.viewSide = next
    }
  }

  if (!store.updateLayerGroup) {
    store.updateLayerGroup = ({ groupId = null, perLayer, sizeIn, gapIn, rotationDeg } = {}) => {
      if (store.ui?.symbolEdit?.active) return false
      const gid = String(groupId || '')
      if (!gid) return false
      const group = (store.groups || []).find((g) => String(g.id) === gid)
      if (!group) return false
      const isLayer =
        group?.meta?.kind === 'layer' ||
        /^(fila|cluster)\b/i.test(String(group?.name || '')) ||
        (Array.isArray(group.childIds) && group.childIds.length > 0)
      if (!isLayer) return false

      const nodeById = new Map(store.nodes.map((n) => [String(n.id), n]))
      const existing = (group.childIds || []).map((id) => nodeById.get(String(id))).filter(Boolean)

      let layout = group.meta?.layout === 'circle' ? 'circle' : 'wall'
      if (!group.meta?.layout && existing.length) {
        const hasTopViewCircle = existing.some((n) => {
          const tv = n?.meta?.topView
          const y = Number(tv?.y)
          return Number.isFinite(y) && Math.abs(y) > 0.01
        })
        layout = hasTopViewCircle ? 'circle' : 'wall'
      }
      let widthCm = Number(store.ui?.guideWall?.widthCm || store.canvas?.widthCm || 0)
      let heightCm = Number(store.ui?.guideWall?.heightCm || store.canvas?.heightCm || 0)
      let widthPx = widthCm * PX_PER_CM
      let heightPx = heightCm * PX_PER_CM
      if (
        !Number.isFinite(widthPx) ||
        !Number.isFinite(heightPx) ||
        widthPx <= 0 ||
        heightPx <= 0
      ) {
        widthCm = Number(store.canvas?.widthCm || 160)
        heightCm = Number(store.canvas?.heightCm || 90)
        widthPx = widthCm * PX_PER_CM
        heightPx = heightCm * PX_PER_CM
      }
      if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0)
        return false

      const maxRadiusCm = Number(store.ui?.guideWall?.maxRadiusCm || 0)
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

      store.beginHistoryBatch()
      try {
        if (Object.keys(patchById).length) store.updateNodes(patchById)

        if (remove.length) {
          const removeSet = new Set(remove.map((n) => String(n.id)))
          store.nodes = store.nodes.filter((n) => !removeSet.has(String(n.id)))
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
              zIndex: store.nodes.length,
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
            store.nodes.push(node)
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

        applyGroupMembership(store)
        store.reindexZ()
        store.setSelection(nextChildIds)
        store.selectGroup(group.id)
        store.markDirty('Editar cluster')
      } finally {
        store.endHistoryBatch()
      }

      return true
    }
  }

  return store
}
