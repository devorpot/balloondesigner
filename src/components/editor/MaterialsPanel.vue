<template>
  <div class="card border-0 shadow-sm materials">
    <div class="card-body">
      <div class="d-flex align-items-start justify-content-between gap-2">
        <div>
          <div class="fw-bold">Materiales</div>
          <div class="text-muted small">Conteo, costo y cotización</div>
        </div>

        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" type="button" @click="copySummary" :disabled="summary.total === 0">
            <i class="bi bi-clipboard me-1"></i> Copiar
          </button>

          <button class="btn btn-sm btn-outline-secondary" type="button" @click="exportCsv" :disabled="summary.total === 0">
            <i class="bi bi-filetype-csv me-1"></i> CSV
          </button>

          <button class="btn btn-sm btn-outline-secondary" type="button" @click="exportJson" :disabled="summary.total === 0">
            <i class="bi bi-filetype-json me-1"></i> JSON
          </button>
        </div>
      </div>

      <hr class="my-3" />

      <!-- Filtros -->
      <div class="filters">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" role="switch" v-model="filters.includeHidden" />
          <label class="form-check-label small">Incluir ocultos</label>
        </div>

        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" role="switch" v-model="filters.includeLocked" />
          <label class="form-check-label small">Incluir bloqueados</label>
        </div>

        <div class="ms-auto d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" type="button" @click="expandAll" :disabled="summary.byTypeColor.length === 0">
            Expandir
          </button>
          <button class="btn btn-sm btn-outline-secondary" type="button" @click="collapseAll" :disabled="summary.byTypeColor.length === 0">
            Colapsar
          </button>
        </div>
      </div>

      <div class="mt-3 d-flex align-items-center justify-content-between">
        <div class="text-muted">Total</div>
        <div class="fw-bold">{{ summary.total }}</div>
      </div>

      <div v-if="summary.hasCosts" class="mt-2 d-flex align-items-center justify-content-between">
        <div class="text-muted">Costo materiales</div>
        <div class="fw-bold">{{ money(summary.estimatedCost) }}</div>
      </div>

      <hr class="my-3" />

      <!-- Cotización -->
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="section-title">Cotización</div>
        <button class="btn btn-sm btn-primary" type="button" @click="exportPdf" :disabled="summary.total === 0 || exportingPdf">
          <span v-if="exportingPdf">Generando...</span>
          <span v-else><i class="bi bi-file-earmark-pdf me-1"></i> PDF</span>
        </button>
      </div>

      <div class="quote">
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label">Desperdicio (%)</label>
            <input type="number" class="form-control form-control-sm" min="0" step="1" v-model.number="quote.wastePct" />
          </div>
          <div class="col-6">
            <label class="form-label">Mano de obra (fijo)</label>
            <input type="number" class="form-control form-control-sm" min="0" step="1" v-model.number="quote.laborFixed" />
          </div>

          <div class="col-6">
            <label class="form-label">Mano de obra (%)</label>
            <input type="number" class="form-control form-control-sm" min="0" step="1" v-model.number="quote.laborPct" />
          </div>
          <div class="col-6">
            <label class="form-label">Nombre / Proyecto</label>
            <input type="text" class="form-control form-control-sm" v-model.trim="quote.projectName" placeholder="Figura unicornio, arco orgánico..." />
          </div>
        </div>

        <div class="mt-3 totals">
          <div class="d-flex align-items-center justify-content-between">
            <div class="text-muted">Materiales con desperdicio</div>
            <div class="fw-bold">{{ money(quoteTotals.materialsWithWaste) }}</div>
          </div>

          <div class="d-flex align-items-center justify-content-between">
            <div class="text-muted">Mano de obra</div>
            <div class="fw-bold">{{ money(quoteTotals.laborTotal) }}</div>
          </div>

          <div class="d-flex align-items-center justify-content-between total-final">
            <div>Total</div>
            <div>{{ money(quoteTotals.grandTotal) }}</div>
          </div>
        </div>

        <div class="text-muted small mt-2">
          El PDF incluye diseño + materiales + totales. Los costos salen del catálogo (cost por tipo).
        </div>
      </div>

      <hr class="my-3" />

      <!-- Por tipo + colores -->
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="section-title">Por tipo</div>
        <div class="text-muted small">{{ summary.byTypeColor.length }}</div>
      </div>

      <div v-if="summary.byTypeColor.length === 0" class="text-muted small">
        No hay globos con los filtros actuales.
      </div>

      <div v-else class="types">
        <button
          v-for="t in summary.byTypeColor"
          :key="t.typeId"
          class="type-card"
          type="button"
          @click="toggleOpen(t.typeId)"
        >
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="minw0">
              <div class="fw-semibold text-truncate">{{ t.typeName }}</div>
              <div class="text-muted small">
                {{ t.qty }} {{ t.qty === 1 ? 'globo' : 'globos' }}
                <span class="ms-2" v-if="summary.hasCosts && t.unitCost > 0">
                  · {{ money(t.unitCost) }} c/u · {{ money(t.subtotal) }}
                </span>
              </div>
            </div>

            <div class="d-flex align-items-center gap-2">
              <span class="pill">{{ t.qty }}</span>
              <i class="bi" :class="openTypeIds.has(t.typeId) ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </div>
          </div>

          <div v-if="openTypeIds.has(t.typeId)" class="colors mt-2">
            <div v-for="c in t.colors" :key="c.color" class="color-row">
              <span class="swatch" :style="{ background: c.color }"></span>
              <div class="minw0 flex-grow-1">
                <div class="fw-semibold text-truncate">{{ c.color }}</div>
                <div class="text-muted small">{{ c.qty }} {{ c.qty === 1 ? 'globo' : 'globos' }}</div>
              </div>
              <span class="pill">{{ c.qty }}</span>
            </div>
          </div>
        </button>
      </div>

      <div class="mt-3">
        <div class="section-title">Resumen por color</div>

        <div v-if="summary.byColor.length === 0" class="text-muted small">—</div>

        <div v-else class="colors-flat">
          <div v-for="c in summary.byColor" :key="c.color" class="color-flat-row">
            <span class="swatch" :style="{ background: c.color }"></span>
            <div class="minw0 flex-grow-1">
              <div class="fw-semibold text-truncate">{{ c.color }}</div>
            </div>
            <span class="pill">{{ c.qty }}</span>
          </div>
        </div>
      </div>

      <div v-if="hint" class="alert alert-success py-2 px-3 mt-3 small mb-0">
        {{ hint }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { useCatalogStore } from '@/stores/catalog.store'
import { jsPDF } from 'jspdf'

const editor = useEditorStore()
const catalog = useCatalogStore()

const filters = reactive({
  includeHidden: false,
  includeLocked: true,
})

const summary = computed(() => {
  return editor.computeMaterials({
    includeHidden: filters.includeHidden,
    includeLocked: filters.includeLocked,
    catalogTypes: catalog.types,
  })
})

// Cotización
const quote = reactive({
  wastePct: 10,
  laborFixed: 0,
  laborPct: 0,
  projectName: '',
})

const quoteTotals = computed(() => {
  const baseMaterials = Number(summary.value.estimatedCost || 0)
  const waste = Math.max(0, Number(quote.wastePct || 0)) / 100
  const materialsWithWaste = baseMaterials * (1 + waste)

  const laborFixed = Math.max(0, Number(quote.laborFixed || 0))
  const laborPct = Math.max(0, Number(quote.laborPct || 0)) / 100
  const laborTotal = laborFixed + (materialsWithWaste * laborPct)

  const grandTotal = materialsWithWaste + laborTotal

  return {
    baseMaterials,
    materialsWithWaste,
    laborFixed,
    laborPct,
    laborTotal,
    grandTotal,
  }
})

// UI: abiertos
const openTypeIds = ref(new Set())
watch(
  () => summary.value.byTypeColor.map(x => x.typeId).join('|'),
  () => {
    const valid = new Set(summary.value.byTypeColor.map(x => x.typeId))
    openTypeIds.value = new Set([...openTypeIds.value].filter(id => valid.has(id)))
  }
)

const hint = ref('')
const exportingPdf = ref(false)

function toggleOpen(typeId) {
  const set = new Set(openTypeIds.value)
  if (set.has(typeId)) set.delete(typeId)
  else set.add(typeId)
  openTypeIds.value = set
}

function expandAll() {
  openTypeIds.value = new Set(summary.value.byTypeColor.map(x => x.typeId))
}

function collapseAll() {
  openTypeIds.value = new Set()
}

function exportJson() {
  const name = prompt('Nombre del archivo:', 'materiales.json')
  if (name === null) return
  const fileName = (name || 'materiales.json').trim() || 'materiales.json'

  editor.exportMaterialsJson({
    fileName,
    includeHidden: filters.includeHidden,
    includeLocked: filters.includeLocked,
    catalogTypes: catalog.types,
  })
}

function exportCsv() {
  const csv = buildCsv(summary.value)
  downloadText(csv, 'materiales.csv', 'text/csv')
  flash('CSV descargado.')
}

async function copySummary() {
  const text = buildTextSummary(summary.value, quoteTotals.value, quote.projectName)
  try {
    await navigator.clipboard.writeText(text)
    flash('Resumen copiado al portapapeles.')
  } catch {
    downloadText(text, 'materiales.txt', 'text/plain')
    flash('No se pudo copiar. Se descargó un TXT.')
  }
}

async function exportPdf() {
  exportingPdf.value = true
  try {
    const s = summary.value
    const qt = quoteTotals.value

    // imagen del diseño
    const dataUrl = editor.getPngDataUrl({ pixelRatio: 2, cropToContent: true })

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 36

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Cotización de materiales', margin, margin)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    const subtitle = quote.projectName ? `Proyecto: ${quote.projectName}` : 'Proyecto: (sin nombre)'
    doc.text(subtitle, margin, margin + 18)

    const dateStr = new Date().toLocaleString('es-MX')
    doc.text(`Fecha: ${dateStr}`, margin, margin + 34)

    // Imagen (si existe)
    let cursorY = margin + 54
    if (dataUrl) {
      const imgMaxW = pageW - margin * 2
      const imgMaxH = 260

      // jsPDF necesita dimensiones, hacemos un cálculo simple a ojo:
      // intentamos meterla a un rectángulo, manteniendo proporción aproximada con un fallback
      const imgW = imgMaxW
      const imgH = imgMaxH

      doc.addImage(dataUrl, 'PNG', margin, cursorY, imgW, imgH)
      cursorY += imgH + 16
    }

    // Totales
    doc.setFont('helvetica', 'bold')
    doc.text('Totales', margin, cursorY)
    cursorY += 14

    doc.setFont('helvetica', 'normal')
    doc.text(`Total globos: ${s.total}`, margin, cursorY); cursorY += 12

    if (s.hasCosts) {
      doc.text(`Costo materiales: ${money(qt.baseMaterials)}`, margin, cursorY); cursorY += 12
      doc.text(`Desperdicio: ${Number(quote.wastePct || 0)}%`, margin, cursorY); cursorY += 12
      doc.text(`Materiales con desperdicio: ${money(qt.materialsWithWaste)}`, margin, cursorY); cursorY += 12
      doc.text(`Mano de obra: ${money(qt.laborTotal)} (fijo ${money(qt.laborFixed)} + ${Number(quote.laborPct || 0)}%)`, margin, cursorY); cursorY += 12

      doc.setFont('helvetica', 'bold')
      doc.text(`TOTAL: ${money(qt.grandTotal)}`, margin, cursorY)
      doc.setFont('helvetica', 'normal')
      cursorY += 16
    } else {
      doc.text('Costos no configurados en catálogo (cost por tipo).', margin, cursorY)
      cursorY += 16
    }

    // Tabla por tipo
    doc.setFont('helvetica', 'bold')
    doc.text('Detalle por tipo', margin, cursorY)
    cursorY += 12

    doc.setFont('courier', 'normal')
    doc.setFontSize(9)

    const lines = []
    for (const t of s.byType) {
      const costPart = s.hasCosts && t.unitCost > 0 ? ` | ${money(t.unitCost)} | ${money(t.subtotal)}` : ''
      lines.push(`${t.typeName} | qty ${t.qty}${costPart}`)
    }

    cursorY = writeLines(doc, lines, margin, cursorY, pageW - margin * 2, pageH - margin)

    // Si hay espacio, por color
    if (cursorY + 24 < pageH - margin) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Resumen por color', margin, cursorY + 14)
      cursorY += 28

      doc.setFont('courier', 'normal')
      doc.setFontSize(9)

      const lines2 = s.byColor.map(c => `${c.color} | qty ${c.qty}`)
      cursorY = writeLines(doc, lines2, margin, cursorY, pageW - margin * 2, pageH - margin)
    }

    const safeName = (quote.projectName || 'cotizacion').trim().slice(0, 40).replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_')
    doc.save(`${safeName || 'cotizacion'}.pdf`)

    flash('PDF descargado.')
  } catch (err) {
    flash('No se pudo generar el PDF. Revisa consola.')
    console.error(err)
  } finally {
    exportingPdf.value = false
  }
}

function writeLines(doc, lines, x, y, maxW, maxY) {
  let cursor = y
  const lineH = 12

  for (const line of lines) {
    if (cursor + lineH > maxY) {
      doc.addPage()
      cursor = 36
    }
    doc.text(line, x, cursor, { maxWidth: maxW })
    cursor += lineH
  }
  return cursor
}

function buildTextSummary(s, qt, projectName) {
  const lines = []
  lines.push(`Materiales / Cotización`)
  lines.push(projectName ? `Proyecto: ${projectName}` : `Proyecto: (sin nombre)`)
  lines.push(`Total globos: ${s.total}`)
  if (s.hasCosts) {
    lines.push(`Costo materiales: ${money(qt.baseMaterials)}`)
    lines.push(`Desperdicio: ${Number(quote.wastePct || 0)}%`)
    lines.push(`Materiales con desperdicio: ${money(qt.materialsWithWaste)}`)
    lines.push(`Mano de obra: ${money(qt.laborTotal)} (fijo ${money(qt.laborFixed)} + ${Number(quote.laborPct || 0)}%)`)
    lines.push(`TOTAL: ${money(qt.grandTotal)}`)
  } else {
    lines.push(`Costos no configurados en catálogo.`)
  }
  lines.push(``)
  lines.push(`Por tipo:`)
  for (const t of s.byType) {
    const costPart = s.hasCosts && t.unitCost > 0 ? ` | ${money(t.unitCost)} c/u | ${money(t.subtotal)}` : ''
    lines.push(`- ${t.typeName}: ${t.qty}${costPart}`)
  }
  lines.push(``)
  lines.push(`Por color:`)
  for (const c of s.byColor) lines.push(`- ${c.color}: ${c.qty}`)
  return lines.join('\n')
}

function buildCsv(s) {
  const rows = []
  rows.push(['typeId', 'typeName', 'unitCost', 'qtyType', 'color', 'qtyColor', 'subtotalType'].join(','))
  for (const t of s.byTypeColor) {
    for (const c of t.colors) {
      rows.push([
        esc(t.typeId),
        esc(t.typeName),
        num(t.unitCost),
        num(t.qty),
        esc(c.color),
        num(c.qty),
        num(t.subtotal),
      ].join(','))
    }
  }
  return rows.join('\n')
}

function downloadText(text, fileName, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function money(n) {
  const v = Number(n || 0)
  return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function esc(s) {
  const v = String(s ?? '')
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replaceAll('"', '""')}"`
  return v
}
function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function flash(msg) {
  hint.value = msg
  window.clearTimeout(flash._t)
  flash._t = window.setTimeout(() => (hint.value = ''), 1800)
}
</script>

<style lang="less" scoped>
.materials {
  border-radius: 16px;
}

.section-title {
  font-weight: 800;
  font-size: 0.9rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.quote {
  border: 1px solid rgba(0,0,0,.08);
  background: rgba(0,0,0,.01);
  border-radius: 16px;
  padding: 12px;
}

.totals {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.total-final {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,.10);
  font-weight: 900;
}

.types {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-card {
  width: 100%;
  border: 1px solid rgba(0,0,0,.08);
  background: #fff;
  border-radius: 16px;
  padding: 12px;
  text-align: left;

  &:hover {
    border-color: rgba(0,0,0,.16);
    background: rgba(0,0,0,.01);
  }
}

.colors {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(0,0,0,.06);
  background: rgba(0,0,0,.01);
  border-radius: 14px;
  padding: 10px;
}

.colors-flat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-flat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(0,0,0,.08);
  background: #fff;
  border-radius: 14px;
  padding: 10px;
}

.swatch {
  width: 18px;
  height: 18px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,.10);
  flex: 0 0 auto;
}

.minw0 {
  min-width: 0;
}

.pill {
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,.04);
  border: 1px solid rgba(0,0,0,.06);
}
</style>
