<template>
  <EditorLayout>
    <template #topbar>
      <ToolbarTop />
    </template>

    <div class="layout-grid">
      <aside class="grid-panel left">
        <div class="left-tabs">
          <button
            class="tab-btn"
            type="button"
            v-if="!guideMode"
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
            {{ guideMode ? 'Guia' : 'Plantillas' }}
          </button>
          <button
            class="tab-btn"
            type="button"
            v-if="!guideMode"
            :class="{ active: leftTab === 'layers' }"
            @click="leftTab = 'layers'"
          >
            Capas
          </button>
        </div>

        <div class="left-panels">
          <div v-show="leftTab === 'catalog' && !guideMode" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Catálogo</div>
                <div class="text-muted panel-subtitle">Elige el globo y color para pintar.</div>

                <div class="mt-3">
                  <label class="form-label xsmall">Familia</label>
                  <select v-model="selectedFamily" class="form-select form-select-sm">
                    <option v-for="family in families" :key="family" :value="family">
                      {{ family }}
                    </option>
                  </select>
                </div>

                <div class="mt-3">
                  <label class="form-label xsmall">Tipo de globo</label>
                  <div class="type-list">
                    <button
                      v-for="t in categoryTypes"
                      :key="t.id"
                      type="button"
                      class="type-item"
                      :class="{ active: selectedTypeId === t.id }"
                      @click="selectType(t)"
                    >
                      <div class="type-item__title">{{ t.name }}</div>
                      <div class="type-item__meta text-muted xsmall">{{ sizeLabel(t) }}</div>
                    </button>
                  </div>
                  <div v-if="!categoryTypes.length" class="text-muted small">
                    Sin tipos disponibles.
                  </div>
                </div>

                <div class="mt-3">
                  <label class="form-label xsmall">Color</label>
                  <div class="color-row">
                    <button
                      v-for="color in selectedTypeColors"
                      :key="color"
                      type="button"
                      class="color-dot"
                      :class="{ active: selectedColor === color }"
                      :style="{ backgroundColor: color }"
                      @click="selectColor(color)"
                    ></button>
                    <span v-if="!selectedTypeColors.length" class="text-muted xsmall"
                      >Sin paleta</span
                    >
                  </div>
                  <input
                    v-model.trim="selectedColor"
                    class="form-control form-control-sm mt-2"
                    type="text"
                    placeholder="#ff3b30"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-show="leftTab === 'templates'" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Modelo fijo</div>
                <div class="text-muted panel-subtitle">Pared híbrida 8x14.</div>
                <div class="mt-3">
                  <div class="shape-pill">{{ activeShape?.label || 'Pared hibrida 8x14' }}</div>
                </div>
                <div class="mt-3 text-muted small">
                  Tres capas: atrás, adelante y conectores. Selecciona el tipo de globo por capa
                  desde el catálogo.
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Patrón</div>
                <div class="text-muted panel-subtitle">Define el bloque base que se repite.</div>

                <div class="mt-3" v-if="guideMode">
                  <div class="fw-bold">Tamaño base</div>
                  <div class="text-muted panel-subtitle">Configura filas, columnas y celda.</div>
                  <div class="mt-3 d-flex flex-wrap gap-2">
                    <label class="field">
                      <span>Filas</span>
                      <input
                        v-model.number="patternConfig.rows"
                        class="form-control form-control-sm"
                        type="number"
                        min="1"
                      />
                    </label>
                    <label class="field">
                      <span>Columnas</span>
                      <input
                        v-model.number="patternConfig.cols"
                        class="form-control form-control-sm"
                        type="number"
                        min="1"
                      />
                    </label>
                    <label class="field">
                      <span>Ancho celda</span>
                      <input
                        v-model.number="patternConfig.cellW"
                        class="form-control form-control-sm"
                        type="number"
                        min="10"
                      />
                    </label>
                    <label class="field">
                      <span>Alto celda</span>
                      <input
                        v-model.number="patternConfig.cellH"
                        class="form-control form-control-sm"
                        type="number"
                        min="10"
                      />
                    </label>
                  </div>
                </div>

                <div class="mt-3 d-flex flex-wrap gap-2">
                  <div class="form-check form-switch">
                    <input
                      id="tile-mode"
                      v-model="tileMode"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="tile-mode">Repetir tile</label>
                  </div>
                </div>

                <div class="mt-3 d-flex gap-2" v-if="tileMode">
                  <label class="field">
                    <span>Tile filas</span>
                    <input
                      v-model.number="tileConfig.rows"
                      class="form-control form-control-sm"
                      type="number"
                      min="1"
                      max="6"
                      :disabled="tileLock"
                    />
                  </label>
                  <label class="field">
                    <span>Tile columnas</span>
                    <input
                      v-model.number="tileConfig.cols"
                      class="form-control form-control-sm"
                      type="number"
                      min="1"
                      max="6"
                      :disabled="tileLock"
                    />
                  </label>
                  <div class="form-check form-switch align-self-end">
                    <input
                      id="tile-lock"
                      v-model="tileLock"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="tile-lock">Tile 2x2</label>
                  </div>
                </div>

                <div class="mt-3 d-flex flex-wrap gap-2">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    type="button"
                    @click="copyTileFromPattern"
                  >
                    Copiar desde pared
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    type="button"
                    @click="applyTileToPattern"
                  >
                    Aplicar a pared
                  </button>
                  <button class="btn btn-sm btn-outline-danger" type="button" @click="clearTile">
                    Limpiar tile
                  </button>
                </div>

                <div class="tile-preview mt-3" v-if="tileMode">
                  <div class="tile-preview__grid" :style="tilePreviewStyle">
                    <div class="tile-preview__labels tile-preview__labels--top">
                      <span
                        v-for="col in tilePreviewCols"
                        :key="`tile-col-${col}`"
                        class="tile-preview__label"
                        :style="tilePreviewColStyle(col)"
                      >
                        {{ columnLabel(col) }}
                      </span>
                    </div>
                    <div class="tile-preview__labels tile-preview__labels--left">
                      <span
                        v-for="row in tilePreviewRows"
                        :key="`tile-row-${row}`"
                        class="tile-preview__label"
                        :style="tilePreviewRowStyle(row)"
                      >
                        {{ row }}
                      </span>
                    </div>
                    <div
                      v-for="slot in tileSlots"
                      :key="`tile-${slot.id}`"
                      class="tile-preview__slot"
                      :class="`tile-preview__slot--${tileSlotShape(slot)}`"
                      :style="tileSlotStyle(slot)"
                    ></div>
                  </div>
                </div>

                <div class="mt-4">
                  <div class="fw-bold">Estructura</div>
                  <div class="text-muted panel-subtitle">Crea el patrón base desde cero.</div>

                  <div class="mt-3 d-flex flex-wrap gap-2">
                    <div class="form-check form-switch">
                      <input
                        id="structure-mode"
                        v-model="structureMode"
                        class="form-check-input"
                        type="checkbox"
                      />
                      <label class="form-check-label xsmall" for="structure-mode">
                        Editar estructura
                      </label>
                    </div>
                  </div>

                  <div class="mt-3 d-flex flex-wrap gap-2" v-if="structureMode">
                    <button
                      class="btn btn-sm"
                      :class="structureTool === 'circle' ? 'btn-primary' : 'btn-outline-secondary'"
                      type="button"
                      @click="structureTool = 'circle'"
                    >
                      Redondo
                    </button>
                    <button
                      class="btn btn-sm"
                      :class="structureTool === 'oval' ? 'btn-primary' : 'btn-outline-secondary'"
                      type="button"
                      @click="structureTool = 'oval'"
                    >
                      Ovalado
                    </button>
                    <button
                      class="btn btn-sm"
                      :class="
                        structureTool === 'smallCircle' ? 'btn-primary' : 'btn-outline-secondary'
                      "
                      type="button"
                      @click="structureTool = 'smallCircle'"
                    >
                      Conector
                    </button>
                    <button
                      class="btn btn-sm"
                      :class="structureTool === 'erase' ? 'btn-danger' : 'btn-outline-danger'"
                      type="button"
                      @click="structureTool = 'erase'"
                    >
                      Borrar
                    </button>
                  </div>

                  <div class="mt-3 d-flex flex-wrap gap-2">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      @click="applyStructureToWall"
                    >
                      Aplicar estructura
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      type="button"
                      @click="clearStructure"
                    >
                      Limpiar estructura
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      @click="showStructureModal = true"
                    >
                      Abrir editor
                    </button>
                    <button
                      class="btn btn-sm btn-outline-primary"
                      type="button"
                      @click="openGuideImport"
                    >
                      Importar guia JSON
                    </button>
                    <button
                      v-if="guideMode"
                      class="btn btn-sm btn-primary"
                      type="button"
                      @click="createFillFromGuide"
                    >
                      Crear figura con globos
                    </button>
                  </div>

                  <div class="mt-4">
                    <div class="fw-bold">Patrones guardados</div>
                    <div class="text-muted panel-subtitle">Guarda y reutiliza estructuras.</div>

                    <div class="mt-2">
                      <select v-model="activePresetId" class="form-select form-select-sm">
                        <option value="">Selecciona un patrón</option>
                        <option
                          v-for="preset in patternPresets"
                          :key="preset.id"
                          :value="preset.id"
                        >
                          {{ preset.name }}
                        </option>
                      </select>
                    </div>

                    <div class="mt-3 d-flex flex-wrap gap-2">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        type="button"
                        @click="savePreset"
                      >
                        Guardar patrón
                      </button>
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        type="button"
                        @click="loadPreset"
                      >
                        Cargar patrón
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        type="button"
                        @click="deletePreset"
                      >
                        Eliminar patrón
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-show="leftTab === 'layers' && !guideMode" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Capas</div>
                <div class="text-muted panel-subtitle">Selecciona capa y visibilidad.</div>

                <div class="mt-3 d-flex flex-wrap gap-2">
                  <button
                    v-for="layer in layers"
                    :key="layer.id"
                    class="btn btn-sm"
                    :class="activeLayer === layer.id ? 'btn-primary' : 'btn-outline-secondary'"
                    type="button"
                    @click="activeLayer = layer.id"
                  >
                    {{ layer.label }}
                  </button>
                </div>

                <div class="mt-3 d-flex flex-wrap gap-2">
                  <button
                    v-for="layer in layers"
                    :key="`vis-${layer.id}`"
                    class="btn btn-sm"
                    :class="
                      layerVisibility[layer.id] ? 'btn-outline-secondary' : 'btn-outline-danger'
                    "
                    type="button"
                    @click="toggleLayerVisibility(layer.id)"
                  >
                    {{ layerVisibility[layer.id] ? 'Ocultar' : 'Mostrar' }} {{ layer.short }}
                  </button>
                </div>

                <div class="mt-3">
                  <div class="text-muted xsmall">Tipo por capa</div>
                  <div class="type-summary">
                    <div
                      v-for="layer in layers"
                      :key="`info-${layer.id}`"
                      class="type-summary__row"
                    >
                      <span class="type-summary__name">{{ layer.label }}</span>
                      <span class="type-summary__qty">
                        {{ layerTypeMap[layer.id]?.name || 'Sin tipo' }}
                        <span v-if="layerTypeMap[layer.id]"
                          >· {{ sizeLabel(layerTypeMap[layer.id]) }}</span
                        >
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="grid-work center">
        <div class="card border-0 shadow-sm panel-card">
          <div class="card-body">
            <div class="work-head">
              <div>
                <div class="fw-bold">
                  {{ guideMode ? 'Guia de pared' : 'Figuras predefinidas' }}
                </div>
                <div class="text-muted panel-subtitle">
                  {{
                    guideMode
                      ? 'Define la estructura base para rellenar con globos.'
                      : 'Selecciona una figura y pinta sus globos.'
                  }}
                </div>
              </div>
              <div class="work-actions">
                <div class="shape-pill">
                  {{ guideMode ? 'Guia pared' : activeShape?.label || 'Pared hibrida' }}
                </div>
              </div>
            </div>

            <div
              class="grid-canvas"
              :style="gridStyle"
              @wheel="onWheel"
              @mousedown="onStageMouseDown"
              @mousemove="onStageMouseMove"
              @mouseup="onStageMouseUp"
              @mouseleave="onStageMouseUp"
            >
              <div class="pattern-stage" :style="stageTransform" ref="stageRef">
                <div class="pattern-labels pattern-labels--top" v-if="showGridNumbers">
                  <span
                    v-for="col in patternColOptions"
                    :key="`pl-col-${col}`"
                    class="pattern-label"
                    :style="patternColLabelStyle(col)"
                  >
                    {{ columnLabel(col) }}
                  </span>
                </div>
                <div class="pattern-labels pattern-labels--left" v-if="showGridNumbers">
                  <span
                    v-for="row in patternRowOptions"
                    :key="`pl-row-${row}`"
                    class="pattern-label"
                    :style="patternRowLabelStyle(row)"
                  >
                    {{ row }}
                  </span>
                </div>
                <div class="pattern-dimensions" v-if="showDimensions && wallDimensions">
                  <div class="pattern-dim pattern-dim--width" :style="patternDimWidthStyle">
                    <span class="pattern-dim__label">{{ dimensionLabelWidth }}</span>
                  </div>
                  <div class="pattern-dim pattern-dim--height" :style="patternDimHeightStyle">
                    <span class="pattern-dim__label pattern-dim__label--vertical">
                      {{ dimensionLabelHeight }}
                    </span>
                  </div>
                </div>
                <button
                  v-for="slot in resolvedPatternSlots"
                  :key="slot.id"
                  class="pattern-slot"
                  :class="[
                    `pattern-slot--${slotEffectiveShape(slot)}`,
                    {
                      'pattern-slot--filled': !!slotFill(slot),
                      'pattern-slot--guide': patternMode && !slotFill(slot),
                      'pattern-slot--selected': selectedSlotId === slot.id,
                      'pattern-slot--flat': flatColors,
                    },
                  ]"
                  :style="slotStyle(slot)"
                  @click="onSlotClick(slot, $event)"
                >
                  <span class="pattern-slot__label" v-if="showSizeLabels && slotSizeLabel(slot)">
                    {{ slotSizeLabel(slot) }}
                  </span>
                  <span class="pattern-slot__label" v-if="showColorLabels && slotColorLabel(slot)">
                    {{ slotColorLabel(slot) }}
                  </span>
                </button>
              </div>
            </div>
            <div class="stage-controls">
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="zoomOut">
                -
              </button>
              <span class="stage-zoom">{{ zoomLabel }}</span>
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="zoomIn">
                +
              </button>
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="resetView">
                Reset
              </button>
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="fitView">
                Ajustar
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside class="grid-panel right">
        <div class="right-tabs">
          <button
            class="tab-btn"
            type="button"
            v-if="!guideMode"
            :class="{ active: rightTab === 'format' }"
            @click="rightTab = 'format'"
          >
            Formato
          </button>
          <button
            class="tab-btn"
            type="button"
            :class="{ active: rightTab === 'canvas' }"
            @click="rightTab = 'canvas'"
          >
            Canvas
          </button>
          <button
            class="tab-btn"
            type="button"
            v-if="!guideMode"
            :class="{ active: rightTab === 'calc' }"
            @click="rightTab = 'calc'"
          >
            Calculador
          </button>
          <button
            class="tab-btn"
            type="button"
            v-if="!guideMode"
            :class="{ active: rightTab === 'history' }"
            @click="rightTab = 'history'"
          >
            Historial
          </button>
        </div>

        <div class="right-panels">
          <div v-show="rightTab === 'format' && !guideMode" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Propiedades</div>
                <div class="text-muted panel-subtitle">Slot y capa activa.</div>

                <div class="mt-3" v-if="selectedSlot">
                  <div class="summary-row">
                    <div class="summary-label">Slot</div>
                    <div class="summary-value">{{ selectedSlotLabel }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Tipo</div>
                    <div class="summary-value">{{ selectedSlotType?.name || 'Sin tipo' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Forma</div>
                    <div class="summary-value">{{ selectedSlotShapeLabel }}</div>
                  </div>

                  <div class="mt-2">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      type="button"
                      @click="toggleSelectedSlotShape"
                    >
                      Ovalar / Redondear
                    </button>
                  </div>

                  <div class="mt-3" v-if="selectedSlotShapeLabel === 'Ovalado'">
                    <label class="form-label xsmall">Rotacion</label>
                    <input
                      class="form-range"
                      type="range"
                      min="-90"
                      max="90"
                      step="1"
                      :value="selectedSlotRotation"
                      @input="onRotationInput($event)"
                    />
                    <div class="text-muted xsmall">{{ selectedSlotRotation }}°</div>
                  </div>

                  <div class="mt-3" v-if="selectedInflation">
                    <label class="form-label xsmall">Inflado</label>
                    <input
                      class="form-range"
                      type="range"
                      :min="selectedInflation.min"
                      :max="selectedInflation.max"
                      :step="selectedInflation.step"
                      :value="selectedInflation.value"
                      @input="onInflationInput($event)"
                    />
                    <div class="text-muted xsmall">
                      {{ Math.round(selectedInflation.value * 100) }}% (min
                      {{ Math.round(selectedInflation.min * 100) }}% - max
                      {{ Math.round(selectedInflation.max * 100) }}%)
                    </div>
                  </div>
                </div>

                <div class="mt-3" v-else>
                  <div class="text-muted small">Selecciona un globo para editarlo.</div>
                </div>

                <div class="mt-4">
                  <div class="fw-bold">Capa activa</div>
                  <div class="summary-row mt-2">
                    <div class="summary-label">Capa</div>
                    <div class="summary-value">{{ activeLayerLabel }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Tipo</div>
                    <div class="summary-value">{{ selectedType?.name || 'Sin tipo' }}</div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Tamaño</div>
                    <div class="summary-value">{{ sizeLabel(selectedType) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-show="rightTab === 'canvas'" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Canvas</div>
                <div class="text-muted panel-subtitle">Guias y herramientas.</div>

                <div class="mt-3 d-flex flex-wrap gap-2">
                  <div class="form-check form-switch">
                    <input
                      id="pattern-mode"
                      v-model="patternMode"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="pattern-mode">Modo patrón</label>
                  </div>
                  <div class="form-check form-switch">
                    <input
                      id="pattern-oval"
                      v-model="patternConfig.useOval"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="pattern-oval">
                      Ovalar nuevos
                    </label>
                  </div>
                  <div class="form-check form-switch">
                    <input
                      id="erase-mode"
                      v-model="eraseMode"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="erase-mode">Borrar</label>
                  </div>
                  <div class="form-check form-switch">
                    <input
                      id="grid-numbers"
                      v-model="showGridNumbers"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="grid-numbers">Grid numbers</label>
                  </div>
                  <div class="form-check form-switch">
                    <input
                      id="color-labels"
                      v-model="showColorLabels"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="color-labels"
                      >Show color labels</label
                    >
                  </div>
                  <div class="form-check form-switch">
                    <input
                      id="size-labels"
                      v-model="showSizeLabels"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="size-labels"
                      >Show size labels</label
                    >
                  </div>
                  <div class="form-check form-switch">
                    <input
                      id="show-dimensions"
                      v-model="showDimensions"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="show-dimensions">Dimensions</label>
                  </div>
                  <div class="form-check form-switch">
                    <input
                      id="flat-colors"
                      v-model="flatColors"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <label class="form-check-label xsmall" for="flat-colors">Flat 2D-colors</label>
                  </div>
                  <div class="field">
                    <span>Units</span>
                    <select v-model="dimensionUnits" class="form-select form-select-sm">
                      <option value="inch">inch</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
                </div>

                <div class="gap-control mt-3">
                  <label class="form-label xsmall mb-0">Separacion</label>
                  <input
                    v-model.number="cellGap"
                    class="form-range"
                    type="range"
                    min="-20"
                    max="20"
                    step="2"
                  />
                </div>

                <div class="mt-3" v-if="patternMode">
                  <div class="text-muted xsmall">Fuente para duplicar</div>
                  <div class="d-flex gap-2 mt-1">
                    <label class="field">
                      <span>Fila</span>
                      <select v-model.number="patternSourceRow" class="form-select form-select-sm">
                        <option v-for="row in patternRowOptions" :key="`prow-${row}`" :value="row">
                          {{ row }}
                        </option>
                      </select>
                    </label>
                    <label class="field">
                      <span>Columna</span>
                      <select v-model.number="patternSourceCol" class="form-select form-select-sm">
                        <option v-for="col in patternColOptions" :key="`pcol-${col}`" :value="col">
                          {{ col }}
                        </option>
                      </select>
                    </label>
                  </div>
                </div>

                <div class="mt-3 d-flex flex-wrap gap-2">
                  <div class="btn-group btn-group-sm" role="group" aria-label="Agregar columnas">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="addColumn('left')"
                      title="Agregar columna izquierda"
                      aria-label="Agregar columna izquierda"
                    >
                      <i class="bi bi-plus-lg"></i>
                      <i class="bi bi-arrow-left-short"></i>
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="addColumn('right')"
                      title="Agregar columna derecha"
                      aria-label="Agregar columna derecha"
                    >
                      <i class="bi bi-plus-lg"></i>
                      <i class="bi bi-arrow-right-short"></i>
                    </button>
                  </div>
                  <div class="btn-group btn-group-sm" role="group" aria-label="Agregar filas">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="addRow('top')"
                      title="Agregar fila arriba"
                      aria-label="Agregar fila arriba"
                    >
                      <i class="bi bi-plus-lg"></i>
                      <i class="bi bi-arrow-up-short"></i>
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="addRow('bottom')"
                      title="Agregar fila abajo"
                      aria-label="Agregar fila abajo"
                    >
                      <i class="bi bi-plus-lg"></i>
                      <i class="bi bi-arrow-down-short"></i>
                    </button>
                  </div>
                  <div
                    class="btn-group btn-group-sm"
                    role="group"
                    aria-label="Quitar columnas"
                    v-if="!patternMode"
                  >
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="removeColumn('left')"
                      title="Quitar columna izquierda"
                      aria-label="Quitar columna izquierda"
                    >
                      <i class="bi bi-dash-lg"></i>
                      <i class="bi bi-arrow-left-short"></i>
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="removeColumn('right')"
                      title="Quitar columna derecha"
                      aria-label="Quitar columna derecha"
                    >
                      <i class="bi bi-dash-lg"></i>
                      <i class="bi bi-arrow-right-short"></i>
                    </button>
                  </div>
                  <div
                    class="btn-group btn-group-sm"
                    role="group"
                    aria-label="Quitar filas"
                    v-if="!patternMode"
                  >
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="removeRow('top')"
                      title="Quitar fila arriba"
                      aria-label="Quitar fila arriba"
                    >
                      <i class="bi bi-dash-lg"></i>
                      <i class="bi bi-arrow-up-short"></i>
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="removeRow('bottom')"
                      title="Quitar fila abajo"
                      aria-label="Quitar fila abajo"
                    >
                      <i class="bi bi-dash-lg"></i>
                      <i class="bi bi-arrow-down-short"></i>
                    </button>
                  </div>
                </div>

                <button
                  class="btn btn-sm btn-outline-secondary mt-3"
                  type="button"
                  @click="clearAll"
                  v-if="!patternMode"
                >
                  Limpiar figura
                </button>
              </div>
            </div>
          </div>

          <div v-show="rightTab === 'calc' && !guideMode" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Resumen</div>
                <div class="text-muted panel-subtitle">Conteo de globos por figura.</div>

                <div class="summary-row mt-3">
                  <div class="summary-label">Figura</div>
                  <div class="summary-value">{{ activeShape?.label || 'Sin figura' }}</div>
                </div>
                <div class="summary-row">
                  <div class="summary-label">Globos pintados</div>
                  <div class="summary-value">{{ filledCount }}</div>
                </div>
                <div class="summary-row">
                  <div class="summary-label">Modo patrón</div>
                  <div class="summary-value">{{ patternMode ? 'Activo' : 'Inactivo' }}</div>
                </div>

                <div class="mt-3">
                  <div class="text-muted xsmall">Materiales</div>
                  <div class="type-summary" v-if="patternCounts.length">
                    <div v-for="row in patternCounts" :key="row.id" class="type-summary__row">
                      <span class="type-summary__name">{{ row.name }}</span>
                      <span class="type-summary__qty">{{ row.qty }}</span>
                    </div>
                  </div>
                  <div v-else class="text-muted small">Sin globos asignados.</div>
                </div>

                <div class="summary-row mt-3">
                  <div class="summary-label">Total</div>
                  <div class="summary-value">${{ patternTotalCost.toFixed(0) }}</div>
                </div>

                <div class="mt-3" v-if="showDimensions && wallDimensions">
                  <div class="text-muted xsmall">Dimensiones</div>
                  <div class="summary-row">
                    <div class="summary-label">Ancho</div>
                    <div class="summary-value">
                      {{ wallDimensions.widthIn.toFixed(1) }} in /
                      {{ wallDimensions.widthCm.toFixed(1) }} cm
                    </div>
                  </div>
                  <div class="summary-row">
                    <div class="summary-label">Alto</div>
                    <div class="summary-value">
                      {{ wallDimensions.heightIn.toFixed(1) }} in /
                      {{ wallDimensions.heightCm.toFixed(1) }} cm
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-show="rightTab === 'history' && !guideMode" class="panel-stack">
            <div class="card border-0 shadow-sm panel-card">
              <div class="card-body">
                <div class="fw-bold">Historial</div>
                <div class="text-muted panel-subtitle">Sin acciones registradas.</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="showStructureModal" class="structure-modal">
      <div class="structure-modal__backdrop" @click="showStructureModal = false"></div>
      <div class="structure-modal__panel">
        <div class="structure-modal__header">
          <div>
            <div class="fw-bold">Editor de estructura</div>
            <div class="text-muted xsmall">Define el bloque base y aplica a la pared.</div>
          </div>
          <button
            class="btn btn-sm btn-outline-secondary"
            type="button"
            @click="showStructureModal = false"
          >
            Cerrar
          </button>
        </div>

        <div class="structure-modal__tools">
          <div class="btn-group btn-group-sm" role="group" aria-label="Herramientas">
            <button
              class="btn"
              :class="structureTool === 'circle' ? 'btn-primary' : 'btn-outline-secondary'"
              type="button"
              @click="structureTool = 'circle'"
            >
              Redondo
            </button>
            <button
              class="btn"
              :class="structureTool === 'oval' ? 'btn-primary' : 'btn-outline-secondary'"
              type="button"
              @click="structureTool = 'oval'"
            >
              Ovalado
            </button>
            <button
              class="btn"
              :class="structureTool === 'smallCircle' ? 'btn-primary' : 'btn-outline-secondary'"
              type="button"
              @click="structureTool = 'smallCircle'"
            >
              Conector
            </button>
            <button
              class="btn"
              :class="structureTool === 'erase' ? 'btn-danger' : 'btn-outline-danger'"
              type="button"
              @click="structureTool = 'erase'"
            >
              Borrar
            </button>
          </div>

          <div class="structure-modal__actions">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="applyStructureToWall"
            >
              Aplicar estructura
            </button>
            <button class="btn btn-sm btn-outline-primary" type="button" @click="openGuideImport">
              Importar guia JSON
            </button>
            <button class="btn btn-sm btn-outline-danger" type="button" @click="clearStructure">
              Limpiar estructura
            </button>
          </div>

          <div class="structure-modal__zoom">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="structureZoomOut"
            >
              -
            </button>
            <span class="stage-zoom">{{ structureZoomLabel }}</span>
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="structureZoomIn">
              +
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="resetStructureView"
            >
              Reset
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="fitStructureView"
            >
              Ajustar
            </button>
          </div>

          <div class="structure-modal__presets">
            <select v-model="activePresetId" class="form-select form-select-sm">
              <option value="">Selecciona un patrón</option>
              <option v-for="preset in patternPresets" :key="preset.id" :value="preset.id">
                {{ preset.name }}
              </option>
            </select>
            <div class="btn-group btn-group-sm" role="group" aria-label="Patrones">
              <button class="btn btn-outline-secondary" type="button" @click="savePreset">
                Guardar
              </button>
              <button class="btn btn-outline-secondary" type="button" @click="loadPreset">
                Cargar
              </button>
              <button class="btn btn-outline-danger" type="button" @click="deletePreset">
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div class="structure-modal__body">
          <div
            class="structure-modal__canvas"
            ref="structureStageHost"
            @wheel.passive="onStructureWheel"
            @mousedown="onStructureMouseDown"
            @mousemove="onStructureMouseMove"
            @mouseup="onStructureMouseUp"
            @mouseleave="onStructureMouseUp"
          >
            <div class="structure-modal__stage" :style="structureStageTransform">
              <div class="tile-preview__grid structure-modal__grid" :style="structureGridStyle">
                <div class="tile-preview__labels tile-preview__labels--top">
                  <span
                    v-for="col in tilePreviewCols"
                    :key="`tile-col-struct-modal-${col}`"
                    class="tile-preview__label"
                    :style="tilePreviewColStyle(col)"
                  >
                    {{ columnLabel(col) }}
                  </span>
                </div>
                <div class="tile-preview__labels tile-preview__labels--left">
                  <span
                    v-for="row in tilePreviewRows"
                    :key="`tile-row-struct-modal-${row}`"
                    class="tile-preview__label"
                    :style="tilePreviewRowStyle(row)"
                  >
                    {{ row }}
                  </span>
                </div>
                <button
                  v-for="slot in structurePreviewSlots"
                  :key="`struct-modal-${slot.id}`"
                  type="button"
                  class="tile-preview__slot"
                  :class="`tile-preview__slot--${structureSlotShape(slot)}`"
                  :style="tileSlotStyle(slot)"
                  @click="toggleStructureSlot(slot)"
                ></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <input
      ref="guideImportInput"
      type="file"
      accept="application/json"
      class="d-none"
      @change="onImportGuideFile"
    />
  </EditorLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog.store'
import { useProjectsStore } from '@/stores/projects.store'
import { gridShapes } from '@/data/grid-shapes'
import { MAX_DISPLAY_SCALE, MIN_DISPLAY_SCALE, PX_PER_CM } from '@/constants/canvas'
import EditorLayout from '@/layouts/EditorLayout.vue'
import ToolbarTop from '@/components/editor/ToolbarTop.vue'

const router = useRouter()
const catalog = useCatalogStore()
const projects = useProjectsStore()

const shapes = gridShapes.filter((shape) => shape.id === 'hybrid-wall-8x14')

const activeShapeId = ref('hybrid-wall-8x14')
const fillsByLayer = ref({ back: {}, front: {}, connectors: {} })
const shapeOverride = ref({})
const eraseMode = ref(false)
const showGuides = ref(true)
const showCoordinates = ref(true)
const cellGap = ref(0)
const activeLayer = ref('front')
const layerVisibility = ref({ back: true, front: true, connectors: true })
const connectorFreeMode = ref(false)
const layerSettings = ref({
  back: { typeId: '' },
  front: { typeId: '' },
  connectors: { typeId: '' },
})
const selectedFamily = ref('')
const selectedTypeId = ref('')
const selectedColor = ref('#ff3b30')
const leftTab = ref('catalog')
const rightTab = ref('canvas')
const guideMode = computed(() => projects.activeProject?.template?.type === 'guide-wall')
const isLoadingProject = ref(false)
const guideWallConfig = ref(null)
const guideCanvasConfig = ref(null)
const patternMode = ref(true)
const patternPainted = ref({})
const selectedSlotId = ref('')
const showGridNumbers = ref(true)
const showColorLabels = ref(false)
const showSizeLabels = ref(true)
const showDimensions = ref(true)
const flatColors = ref(false)
const dimensionUnits = ref('inch')
const tileMode = ref(false)
const tileConfig = ref({ rows: 2, cols: 2 })
const tilePainted = ref({})
const tileLock = ref(false)
const structureMode = ref(false)
const structureTool = ref('circle')
const structureSlots = ref({})
const showStructureModal = ref(false)
const patternPresets = ref([])
const activePresetId = ref('')
const patternConfig = ref({
  rows: 11,
  cols: 10,
  cellW: 52,
  cellH: 44,
  ovalW: 64,
  ovalH: 52,
  circleR: 24,
  smallR: 9,
  useOval: false,
})
const patternSourceRow = ref(1)
const patternSourceCol = ref(1)

const stageRef = ref(null)
const stageScale = ref(1)
const displayScale = ref(1)
const stagePos = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const spacePressed = ref(false)
const structureStageHost = ref(null)
const structureStageScale = ref(1)
const structureStagePos = ref({ x: 0, y: 0 })
const structureIsPanning = ref(false)
const structurePanStart = ref({ x: 0, y: 0 })
const guideImportInput = ref(null)

const layers = [
  { id: 'back', label: 'Atras', short: 'A', type: 'base' },
  { id: 'front', label: 'Adelante', short: 'F', type: 'base' },
  { id: 'connectors', label: 'Conectores', short: 'C', type: 'connector' },
]

onMounted(() => {
  projects.init()
  if (Array.isArray(catalog.categories) && catalog.categories.length) return
  if (typeof catalog.init === 'function') catalog.init()
})

const onKeyDown = (e) => {
  if (e.code === 'Space') {
    spacePressed.value = true
    e.preventDefault()
  }
}

const onKeyUp = (e) => {
  if (e.code === 'Space') {
    spacePressed.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

onMounted(() => {
  window.addEventListener('guide-import-request', openGuideImport)
})

onBeforeUnmount(() => {
  window.removeEventListener('guide-import-request', openGuideImport)
})

function resetGridState() {
  activeShapeId.value = 'hybrid-wall-8x14'
  fillsByLayer.value = { back: {}, front: {}, connectors: {} }
  shapeOverride.value = {}
  eraseMode.value = false
  showGuides.value = true
  showCoordinates.value = true
  cellGap.value = 0
  activeLayer.value = 'front'
  layerVisibility.value = { back: true, front: true, connectors: true }
  connectorFreeMode.value = false
  layerSettings.value = {
    back: { typeId: '' },
    front: { typeId: '' },
    connectors: { typeId: '' },
  }
  selectedFamily.value = ''
  selectedTypeId.value = ''
  selectedColor.value = '#ff3b30'
  leftTab.value = 'catalog'
  rightTab.value = 'canvas'
  patternMode.value = true
  patternPainted.value = {}
  selectedSlotId.value = ''
  showGridNumbers.value = true
  showColorLabels.value = false
  showSizeLabels.value = true
  showDimensions.value = true
  flatColors.value = false
  dimensionUnits.value = 'inch'
  tileMode.value = false
  tileConfig.value = { rows: 2, cols: 2 }
  tilePainted.value = {}
  tileLock.value = false
  structureMode.value = false
  structureTool.value = 'circle'
  structureSlots.value = {}
  showStructureModal.value = false
  patternPresets.value = []
  activePresetId.value = ''
  guideWallConfig.value = null
  guideCanvasConfig.value = null
  patternConfig.value = {
    rows: 11,
    cols: 10,
    cellW: 52,
    cellH: 44,
    ovalW: 64,
    ovalH: 52,
    circleR: 24,
    smallR: 9,
    useOval: false,
  }
  patternSourceRow.value = 1
  patternSourceCol.value = 1
  stageScale.value = 1
  displayScale.value = 1
  stagePos.value = { x: 0, y: 0 }
  isPanning.value = false
  panStart.value = { x: 0, y: 0 }
  spacePressed.value = false
  structureStageScale.value = 1
  structureStagePos.value = { x: 0, y: 0 }
  structureIsPanning.value = false
  structurePanStart.value = { x: 0, y: 0 }
}

function loadActiveProject() {
  const activeProject = projects.activeProject
  if (!activeProject) {
    router.push('/')
    return
  }

  isLoadingProject.value = true
  resetGridState()

  const isGuide = activeProject?.template?.type === 'guide-wall'
  if (isGuide) {
    leftTab.value = 'templates'
    rightTab.value = 'canvas'
    structureMode.value = true
  }

  const guideData = activeProject?.data?.guide
  const gridData = activeProject?.data?.grid
  const templateShape = activeProject?.template?.params?.shapeId
  if (guideData?.shapeId) activeShapeId.value = guideData.shapeId
  else if (gridData?.shapeId) activeShapeId.value = gridData.shapeId
  else if (templateShape) activeShapeId.value = templateShape
  if (activeShapeId.value !== 'hybrid-wall-8x14') activeShapeId.value = 'hybrid-wall-8x14'

  if (isGuide) {
    if (guideData?.shape && typeof guideData.shape === 'object') {
      shapeOverride.value = guideData.shape
    }
    if (guideData?.pattern && typeof guideData.pattern === 'object') {
      if (guideData.pattern.config && typeof guideData.pattern.config === 'object') {
        patternConfig.value = { ...patternConfig.value, ...guideData.pattern.config }
      }
      if (guideData.pattern.options && typeof guideData.pattern.options === 'object') {
        showGridNumbers.value = guideData.pattern.options.showGridNumbers !== false
        showDimensions.value = guideData.pattern.options.showDimensions !== false
        flatColors.value = !!guideData.pattern.options.flatColors
        dimensionUnits.value = guideData.pattern.options.dimensionUnits || 'inch'
      }
      if (guideData.pattern.tile && typeof guideData.pattern.tile === 'object') {
        if (typeof guideData.pattern.tile.mode === 'boolean')
          tileMode.value = guideData.pattern.tile.mode
        if (guideData.pattern.tile.config) {
          tileConfig.value = { ...tileConfig.value, ...guideData.pattern.tile.config }
        }
      }
      if (guideData.pattern.structure && typeof guideData.pattern.structure === 'object') {
        if (guideData.pattern.structure.slots)
          structureSlots.value = guideData.pattern.structure.slots
        if (guideData.pattern.structure.tile) {
          tileConfig.value = { ...tileConfig.value, ...guideData.pattern.structure.tile }
        }
      }
      if (Array.isArray(guideData.pattern.presets)) {
        patternPresets.value = guideData.pattern.presets
      }
      if (guideData.pattern.activePresetId) {
        activePresetId.value = guideData.pattern.activePresetId
      }
    }
    if (guideData?.guideWall && typeof guideData.guideWall === 'object') {
      guideWallConfig.value = guideData.guideWall
    } else {
      guideWallConfig.value = resolveGuideWallConfig(guideData, null)
    }
    guideCanvasConfig.value = normalizeCanvasConfig(guideData?.canvas)
    displayScale.value = resolveDisplayScale(guideData)
    isLoadingProject.value = false
    nextTick(() => {
      fitView()
    })
    return
  }

  if (gridData?.fillsByLayer && typeof gridData.fillsByLayer === 'object') {
    fillsByLayer.value = normalizeLayerFills(gridData.fillsByLayer)
  } else if (gridData?.fills && typeof gridData.fills === 'object') {
    fillsByLayer.value = normalizeLayerFills({ front: gridData.fills })
  }

  if (gridData?.shape && typeof gridData.shape === 'object') {
    shapeOverride.value = gridData.shape
  }
  if (gridData?.guideWall && typeof gridData.guideWall === 'object') {
    guideWallConfig.value = gridData.guideWall
  }
  guideCanvasConfig.value = normalizeCanvasConfig(gridData?.guideCanvas || gridData?.canvas)
  displayScale.value = resolveDisplayScale(gridData)

  if (gridData?.selectedTypeId) selectedTypeId.value = gridData.selectedTypeId
  if (gridData?.selectedColor) selectedColor.value = gridData.selectedColor
  if (gridData?.activeLayer) activeLayer.value = gridData.activeLayer
  if (gridData?.layerVisibility && typeof gridData.layerVisibility === 'object') {
    layerVisibility.value = {
      back: gridData.layerVisibility.back !== false,
      front: gridData.layerVisibility.front !== false,
      connectors: gridData.layerVisibility.connectors !== false,
    }
  }
  if (typeof gridData?.connectorFreeMode === 'boolean') {
    connectorFreeMode.value = gridData.connectorFreeMode
  }
  if (gridData?.layerSettings && typeof gridData.layerSettings === 'object') {
    layerSettings.value = normalizeLayerSettings(gridData.layerSettings)
  }
  const activeSettings = layerSettings.value?.[activeLayer.value]
  if (activeSettings?.typeId) selectedTypeId.value = activeSettings.typeId
  if (gridData?.pattern && typeof gridData.pattern === 'object') {
    if (gridData.pattern.painted) patternPainted.value = gridData.pattern.painted
    if (typeof gridData.pattern.mode === 'boolean') patternMode.value = gridData.pattern.mode
    if (gridData.pattern.config && typeof gridData.pattern.config === 'object') {
      patternConfig.value = { ...patternConfig.value, ...gridData.pattern.config }
    }
    if (gridData.pattern.options && typeof gridData.pattern.options === 'object') {
      showGridNumbers.value = gridData.pattern.options.showGridNumbers !== false
      showColorLabels.value = !!gridData.pattern.options.showColorLabels
      showSizeLabels.value = gridData.pattern.options.showSizeLabels !== false
      showDimensions.value = gridData.pattern.options.showDimensions !== false
      flatColors.value = !!gridData.pattern.options.flatColors
      dimensionUnits.value = gridData.pattern.options.dimensionUnits || 'inch'
    }
    if (gridData.pattern.tile && typeof gridData.pattern.tile === 'object') {
      if (typeof gridData.pattern.tile.mode === 'boolean')
        tileMode.value = gridData.pattern.tile.mode
      if (gridData.pattern.tile.config) {
        tileConfig.value = { ...tileConfig.value, ...gridData.pattern.tile.config }
      }
      if (gridData.pattern.tile.painted) tilePainted.value = gridData.pattern.tile.painted
    }
    if (gridData.pattern.structure && typeof gridData.pattern.structure === 'object') {
      if (gridData.pattern.structure.slots) structureSlots.value = gridData.pattern.structure.slots
      if (gridData.pattern.structure.tile) {
        tileConfig.value = { ...tileConfig.value, ...gridData.pattern.structure.tile }
      }
    }
    if (Array.isArray(gridData.pattern.presets)) {
      patternPresets.value = gridData.pattern.presets
    }
    if (gridData.pattern.activePresetId) {
      activePresetId.value = gridData.pattern.activePresetId
    }
  }

  isLoadingProject.value = false
  nextTick(() => {
    fitView()
  })
}

onMounted(() => {
  loadActiveProject()
})

watch(
  () => projects.activeProjectId,
  () => {
    loadActiveProject()
  },
)

const categories = computed(() => catalog.categories || [])
const families = computed(() => categories.value.map((category) => category.family))

const selectedCategory = computed(() => {
  const list = categories.value || []
  if (!list.length) return null
  if (!selectedFamily.value) return list[0]
  return list.find((c) => c.family === selectedFamily.value) || list[0]
})

const categoryTypes = computed(() => selectedCategory.value?.types || [])
const selectedType = computed(() => catalog.typeById(selectedTypeId.value) || null)
const selectedTypeColors = computed(() => selectedType.value?.colors || [])

watch(
  categories,
  (list) => {
    if (!selectedFamily.value && list?.length) selectedFamily.value = list[0].family
  },
  { immediate: true },
)

watch(
  categoryTypes,
  (list) => {
    if (!list?.length) return
    if (list.some((t) => t.id === selectedTypeId.value)) return
    selectedTypeId.value = list[0].id
  },
  { immediate: true },
)

watch(
  categoryTypes,
  (list) => {
    if (!list?.length) return
    const baseSettings = layerSettings.value
    const updated = { ...baseSettings }
    let changed = false
    const biggest = pickDefaultTypeId(list, 'max')
    const smallest = pickDefaultTypeId(list, 'min')
    for (const layer of layers) {
      const current = baseSettings?.[layer.id]?.typeId
      if (!current) {
        const nextId = layer.id === 'connectors' ? smallest : biggest
        updated[layer.id] = { typeId: nextId }
        changed = true
      }
    }
    if (changed) {
      layerSettings.value = updated
      if (updated?.[activeLayer.value]?.typeId) {
        selectedTypeId.value = updated[activeLayer.value].typeId
      }
    }
  },
  { immediate: true },
)

watch(selectedType, (type) => {
  const colors = type?.colors || []
  if (!colors.length) return
  if (!selectedColor.value || !colors.includes(selectedColor.value)) {
    selectedColor.value = colors[0]
  }
})

watch(
  activeLayer,
  (next) => {
    const settings = layerSettings.value?.[next]
    if (settings?.typeId) {
      selectedTypeId.value = settings.typeId
    }
  },
  { immediate: true },
)

watch(
  connectorFreeMode,
  () => {
    saveGrid()
  },
  { immediate: false },
)

watch(
  () => patternConfig.value.useOval,
  () => {
    saveGrid()
  },
  { immediate: false },
)

watch(
  () => [
    patternConfig.value.rows,
    patternConfig.value.cols,
    patternConfig.value.cellW,
    patternConfig.value.cellH,
  ],
  () => {
    normalizePatternConfigBase()
    saveGrid()
  },
  { immediate: false },
)

watch(
  showStructureModal,
  async (open) => {
    if (!open) return
    structureMode.value = true
    await nextTick()
    fitStructureView()
  },
  { immediate: false },
)

watch(
  tileLock,
  (locked) => {
    if (!locked) return
    tileConfig.value = { ...tileConfig.value, rows: 2, cols: 2 }
  },
  { immediate: true },
)

watch(
  () => patternConfig.value.rows,
  (rows) => {
    const max = Math.max(1, Number(rows || 1))
    patternSourceRow.value = clamp(patternSourceRow.value, 1, max)
  },
  { immediate: true },
)

watch(
  () => patternConfig.value.cols,
  (cols) => {
    const max = Math.max(1, Number(cols || 1))
    patternSourceCol.value = clamp(patternSourceCol.value, 1, max)
  },
  { immediate: true },
)

const activeShapeBase = computed(
  () => shapes.find((s) => s.id === activeShapeId.value) || shapes[0],
)
const activeShape = computed(() => applyShapeOverride(activeShapeBase.value, shapeOverride.value))

const occupiedBaseCells = computed(() => {
  const set = new Set()
  const baseLayers = [fillsByLayer.value?.back || {}, fillsByLayer.value?.front || {}]
  for (const layer of baseLayers) {
    for (const id of Object.keys(layer)) set.add(id)
  }
  return set
})

const layerCells = computed(() => {
  const shape = activeShape.value
  const map = {}
  for (const layer of layers) {
    const fills = getLayerFills(layer.id)
    if (layer.type === 'connector') {
      map[layer.id] = buildConnectorCells(
        shape,
        fills,
        occupiedBaseCells.value,
        connectorFreeMode.value,
      )
    } else {
      map[layer.id] = buildCells(shape, fills, { prefix: '' })
    }
  }
  return map
})
const gridStyle = computed(() => ({
  '--grid-cols': `${activeShape.value?.cols || 1}`,
  '--grid-rows': `${activeShape.value?.rows || 1}`,
  '--cell-size': '32px',
  '--cell-gap': `${Math.max(0, Number(cellGap.value || 0))}px`,
}))

const renderScale = computed(() => stageScale.value * displayScale.value)

const stageTransform = computed(() => ({
  transform: `translate(${stagePos.value.x}px, ${stagePos.value.y}px) scale(${renderScale.value})`,
  width: `${effectivePixelSize.value.width}px`,
  height: `${effectivePixelSize.value.height}px`,
  transformOrigin: '0 0',
}))

const structureStageTransform = computed(() => ({
  transform: `translate(${structureStagePos.value.x}px, ${structureStagePos.value.y}px) scale(${structureStageScale.value})`,
}))

const zoomLabel = computed(() => `${Math.round(renderScale.value * 100)}%`)
const structureZoomLabel = computed(() => `${Math.round(structureStageScale.value * 100)}%`)

function layerGridStyle(layer) {
  const base = gridStyle.value
  if (layer?.type !== 'connector') return base
  const rows = Math.max(0, Number(activeShape.value?.rows || 1) - 1)
  const cols = Math.max(0, Number(activeShape.value?.cols || 1) - 1)
  return {
    ...base,
    '--grid-cols': `${Math.max(0, cols)}`,
    '--grid-rows': `${Math.max(0, rows)}`,
  }
}

function layerStyle(layer) {
  const scale = layerScale(layer?.id)
  return {
    '--layer-scale': `${scale}`,
  }
}

function layerScale(layerId) {
  const type = layerTypeMap.value?.[layerId] || null
  const sizeIn = Number(type?.sizeIn || 0)
  if (!Number.isFinite(sizeIn) || sizeIn <= 0) return 1
  const base = 6
  const scale = sizeIn / base
  return Math.max(0.4, Math.min(2, scale))
}

function layerShapeClass(layerId) {
  const type = layerTypeMap.value?.[layerId] || null
  const balloonType = String(type?.balloonType || '').toLowerCase()
  if (balloonType.includes('twisting')) return 'grid-layer--twisting'
  if (balloonType.includes('especial')) return 'grid-layer--special'
  return ''
}

const colLabels = computed(() => {
  const count = Number(activeShape.value?.cols || 0)
  return Array.from({ length: count }, (_, i) => columnLabel(i + 1))
})

const rowLabels = computed(() => {
  const count = Number(activeShape.value?.rows || 0)
  return Array.from({ length: count }, (_, i) => i + 1)
})

const activeLayerLabel = computed(() => {
  const match = layers.find((layer) => layer.id === activeLayer.value)
  return match?.label || 'Capa'
})

const patternSlots = computed(() => buildPatternSlots(patternConfig.value, cellGap.value))
const structurePatternSlots = computed(() =>
  buildPatternSlotsFromStructure({
    pattern: patternConfig.value,
    tile: tileConfig.value,
    structure: structureSlots.value,
    gap: cellGap.value,
  }),
)
const resolvedPatternSlots = computed(() =>
  Object.keys(structureSlots.value || {}).length ? structurePatternSlots.value : patternSlots.value,
)
const patternRenderedPainted = computed(() =>
  tileMode.value
    ? buildPatternFromTile(resolvedPatternSlots.value, tilePainted.value)
    : patternPainted.value,
)
const structurePreviewSlots = computed(() =>
  buildStructureSlots({
    rows: tileConfig.value.rows,
    cols: tileConfig.value.cols,
    ...patternConfig.value,
  }),
)
const tileSlots = computed(() =>
  buildPatternSlots(
    {
      ...patternConfig.value,
      rows: tileConfig.value.rows,
      cols: tileConfig.value.cols,
    },
    0,
  ),
)

const tilePreviewStyle = computed(() => ({
  '--tile-cols': tileConfig.value.cols,
  '--tile-rows': tileConfig.value.rows,
}))

const structureGridStyle = computed(() => {
  const size = getStructurePixelSize()
  return {
    ...tilePreviewStyle.value,
    width: `${size.width}px`,
    height: `${size.height}px`,
  }
})

const tilePreviewCols = computed(() =>
  Array.from({ length: Number(tileConfig.value.cols || 0) }, (_, i) => i + 1),
)

const tilePreviewRows = computed(() =>
  Array.from({ length: Number(tileConfig.value.rows || 0) }, (_, i) => i + 1),
)

const selectedSlot = computed(() => {
  if (!selectedSlotId.value) return null
  return resolvedPatternSlots.value.find((slot) => slot.id === selectedSlotId.value) || null
})

const selectedSlotEntry = computed(() => getEditableEntry(selectedSlot.value))

const selectedSlotType = computed(() => {
  if (!selectedSlotEntry.value?.typeId) return null
  return catalog.typeById(selectedSlotEntry.value.typeId)
})

const selectedSlotLabel = computed(() => {
  if (!selectedSlot.value) return '—'
  const row = selectedSlot.value.row + 1
  const col = selectedSlot.value.col + 1
  return `${columnLabel(col)}${row}`
})

const selectedSlotShapeLabel = computed(() => {
  if (!selectedSlot.value) return '—'
  const shape = selectedSlotEntry.value?.shapeType || selectedSlot.value.shapeType
  if (shape === 'oval') return 'Ovalado'
  if (shape === 'smallCircle') return 'Conector'
  return 'Redondo'
})

const selectedSlotRotation = computed(() => {
  if (!selectedSlot.value) return 0
  const current = Number(selectedSlotEntry.value?.rotation || 0)
  return clamp(current, -90, 90)
})

const selectedInflation = computed(() => {
  const type = selectedSlotType.value
  if (!type?.inflation) return null
  const min = Number(type.inflation.minScale || 0.8)
  const max = Number(type.inflation.maxScale || 1)
  const step = 0.01
  const current = Number(selectedSlotEntry.value?.scale || type.inflation.defaultScale || 1)
  return {
    min,
    max,
    step,
    value: clamp(current, min, max),
  }
})

const patternCounts = computed(() => {
  const counts = new Map()
  for (const entry of Object.values(patternRenderedPainted.value || {})) {
    if (!entry?.typeId) continue
    counts.set(entry.typeId, (counts.get(entry.typeId) || 0) + 1)
  }
  return [...counts.entries()].map(([id, qty]) => {
    const type = catalog.typeById(id)
    return {
      id,
      qty,
      name: type?.name || id,
      cost: Number(type?.cost || 0),
    }
  })
})

const patternTotalCost = computed(() =>
  patternCounts.value.reduce((acc, row) => acc + row.qty * row.cost, 0),
)

const wallDimensions = computed(() => {
  if (guideWallConfig.value?.widthCm && guideWallConfig.value?.heightCm) {
    const widthCm = Number(guideWallConfig.value.widthCm || 0)
    const heightCm = Number(guideWallConfig.value.heightCm || 0)
    if (Number.isFinite(widthCm) && Number.isFinite(heightCm) && widthCm > 0 && heightCm > 0) {
      return {
        widthIn: widthCm / 2.54,
        heightIn: heightCm / 2.54,
        widthCm,
        heightCm,
      }
    }
  }

  const sizeIn = getWallBaseSizeIn()
  if (!Number.isFinite(sizeIn) || sizeIn <= 0) return null
  const widthIn = sizeIn * Number(patternConfig.value.cols || 0)
  const heightIn = sizeIn * Number(patternConfig.value.rows || 0)
  return {
    widthIn,
    heightIn,
    widthCm: widthIn * 2.54,
    heightCm: heightIn * 2.54,
  }
})

const patternPixelSize = computed(() => {
  const gap = Number(cellGap.value || 0)
  const cellW = Number(patternConfig.value.cellW || 0) + gap
  const cellH = Number(patternConfig.value.cellH || 0) + gap
  const cols = Number(patternConfig.value.cols || 0)
  const rows = Number(patternConfig.value.rows || 0)
  const maxW = Math.max(
    Number(patternConfig.value.ovalW || 0),
    Number(patternConfig.value.circleR || 0) * 2,
  )
  const maxH = Math.max(
    Number(patternConfig.value.ovalH || 0),
    Number(patternConfig.value.circleR || 0) * 2,
  )
  return {
    width: Math.max(0, (cols - 1) * cellW + maxW),
    height: Math.max(0, (rows - 1) * cellH + maxH),
  }
})

const guidePixelSize = computed(() => {
  if (!guideWallConfig.value) return null
  const widthCm = Number(guideWallConfig.value.widthCm || 0)
  const heightCm = Number(guideWallConfig.value.heightCm || 0)
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) return null
  return {
    width: widthCm * PX_PER_CM,
    height: heightCm * PX_PER_CM,
  }
})

const guideCanvasPixelSize = computed(() => {
  if (!guideCanvasConfig.value) return null
  const widthCm = Number(guideCanvasConfig.value.widthCm || 0)
  const heightCm = Number(guideCanvasConfig.value.heightCm || 0)
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) return null
  return {
    width: widthCm * PX_PER_CM,
    height: heightCm * PX_PER_CM,
  }
})

const effectivePixelSize = computed(
  () => guidePixelSize.value || guideCanvasPixelSize.value || patternPixelSize.value,
)

const fitPixelSize = computed(() => {
  if (!guideWallConfig.value) return effectivePixelSize.value
  if (!patternPixelSize.value) return effectivePixelSize.value
  return {
    width: Math.min(patternPixelSize.value.width, effectivePixelSize.value.width),
    height: Math.min(patternPixelSize.value.height, effectivePixelSize.value.height),
  }
})

const dimensionLabelWidth = computed(() => {
  if (!wallDimensions.value) return ''
  const cm = wallDimensions.value.widthCm
  const m = cm / 100
  if (dimensionUnits.value === 'cm') {
    return `${cm.toFixed(1)} cm / ${m.toFixed(2)} m`
  }
  return `${wallDimensions.value.widthIn.toFixed(1)} in / ${m.toFixed(2)} m`
})

const dimensionLabelHeight = computed(() => {
  if (!wallDimensions.value) return ''
  const cm = wallDimensions.value.heightCm
  const m = cm / 100
  if (dimensionUnits.value === 'cm') {
    return `${cm.toFixed(1)} cm / ${m.toFixed(2)} m`
  }
  return `${wallDimensions.value.heightIn.toFixed(1)} in / ${m.toFixed(2)} m`
})

const patternDimWidthStyle = computed(() => ({
  width: `${effectivePixelSize.value.width}px`,
  left: '0px',
  top: `${effectivePixelSize.value.height + 24}px`,
}))

const patternDimHeightStyle = computed(() => ({
  height: `${effectivePixelSize.value.height}px`,
  left: `${effectivePixelSize.value.width + 24}px`,
  top: '0px',
}))

const patternRowOptions = computed(() => {
  const rows = Number(patternConfig.value?.rows || 0)
  return Array.from({ length: rows }, (_, i) => i + 1)
})

const patternColOptions = computed(() => {
  const cols = Number(patternConfig.value?.cols || 0)
  return Array.from({ length: cols }, (_, i) => i + 1)
})

const layerTypeMap = computed(() => {
  const settings = layerSettings.value || {}
  return {
    back: catalog.typeById(settings.back?.typeId) || null,
    front: catalog.typeById(settings.front?.typeId) || null,
    connectors: catalog.typeById(settings.connectors?.typeId) || null,
  }
})

const filledCount = computed(() => {
  const all = fillsByLayer.value || {}
  return Object.values(all).reduce((acc, layer) => acc + Object.keys(layer || {}).length, 0)
})

const typeCounts = computed(() => {
  const counts = new Map()
  Object.values(fillsByLayer.value || {}).forEach((layer) => {
    Object.values(layer || {}).forEach((fill) => {
      if (!fill?.typeId) return
      counts.set(fill.typeId, (counts.get(fill.typeId) || 0) + 1)
    })
  })

  return [...counts.entries()]
    .map(([id, count]) => ({ id, count, name: catalog.typeById(id)?.name || id }))
    .sort((a, b) => b.count - a.count)
})

const sizeCounts = computed(() => {
  if (!activeShape.value?.sizeMap) return []
  const counts = new Map()
  for (const cell of layerCells.value?.front || []) {
    if (!cell.fill || !cell.sizeTag) continue
    counts.set(cell.sizeTag, (counts.get(cell.sizeTag) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => Number(b.size) - Number(a.size))
})

watch(activeShapeId, () => {
  fillsByLayer.value = { back: {}, front: {}, connectors: {} }
  shapeOverride.value = {}
  saveGrid()
  fitView()
})

function selectType(type) {
  if (!type?.id) return
  selectedTypeId.value = type.id
  const settings = layerSettings.value || {}
  const current = settings[activeLayer.value] || { typeId: '' }
  layerSettings.value = {
    ...settings,
    [activeLayer.value]: { ...current, typeId: type.id },
  }
  applyTypeToLayer(type.id, activeLayer.value)
  const colors = type?.colors || []
  if (colors.length) selectedColor.value = colors[0]
  saveGrid()
}

function selectColor(color) {
  selectedColor.value = color
}

function onCellClick(cell, layer) {
  if (!cell?.active) return
  if (eraseMode.value) {
    removeCellFill(cell.id, layer)
    return
  }
  if (!selectedTypeId.value) return

  const layerId = layer?.id || activeLayer.value
  const nextLayer = { ...getLayerFills(layerId) }
  nextLayer[cell.id] = {
    typeId: selectedTypeId.value,
    color: selectedColor.value || '#ff3b30',
  }
  fillsByLayer.value = { ...fillsByLayer.value, [layerId]: nextLayer }
  saveGrid()
}

function removeCellFill(id, layer) {
  const layerId = layer?.id || activeLayer.value
  const nextLayer = { ...getLayerFills(layerId) }
  if (!nextLayer[id]) return
  delete nextLayer[id]
  fillsByLayer.value = { ...fillsByLayer.value, [layerId]: nextLayer }
  saveGrid()
}

function clearAll() {
  fillsByLayer.value = { back: {}, front: {}, connectors: {} }
  saveGrid()
}

function applyTypeToLayer(typeId, layerId) {
  const nextLayer = { ...getLayerFills(layerId) }
  let changed = false
  for (const key of Object.keys(nextLayer)) {
    nextLayer[key] = { ...nextLayer[key], typeId }
    changed = true
  }
  if (changed) {
    fillsByLayer.value = { ...fillsByLayer.value, [layerId]: nextLayer }
  }
  return changed
}

function addColumn(side) {
  if (patternMode.value) {
    addPatternColumn(side)
    return
  }
  const base = activeShapeBase.value
  if (!base) return
  const currentCols = Number(activeShape.value?.cols || base.cols || 1)
  const nextCols = currentCols + 1
  const isRadial = isRadialShape(activeShape.value)
  const nextMask = isRadial
    ? generateRadialMask(activeShape.value, {
        rows: activeShape.value.rows,
        cols: nextCols,
        delta: 0.5,
        offsetX: radialOffsetForColumn(side, 1),
      })
    : addColumnToMask(activeShape.value?.mask, side)
  const nextSizeMap = isRadial
    ? activeShape.value?.sizeMap
    : addColumnToMask(activeShape.value?.sizeMap, side)
  const nextRadial = isRadial ? nextRadialDimensions(activeShape.value, 0.5) : {}
  shapeOverride.value = {
    ...shapeOverride.value,
    cols: nextCols,
    ...nextRadial,
    mask: nextMask,
    sizeMap: nextSizeMap,
  }

  if (side === 'left' && !isRadial) {
    shiftAllFills(0, 1)
  }
  saveGrid()
}

function addRow(position) {
  if (patternMode.value) {
    addPatternRow(position)
    return
  }
  const base = activeShapeBase.value
  if (!base) return
  const currentRows = Number(activeShape.value?.rows || base.rows || 1)
  const nextRows = currentRows + 1
  const isRadial = isRadialShape(activeShape.value)
  const nextMask = isRadial
    ? generateRadialMask(activeShape.value, {
        rows: nextRows,
        cols: activeShape.value.cols,
        delta: 0.5,
        offsetY: radialOffsetForRow(position, 1),
      })
    : addRowToMask(activeShape.value?.mask, position)
  const nextSizeMap = isRadial
    ? activeShape.value?.sizeMap
    : addRowToMask(activeShape.value?.sizeMap, position)
  const nextRadial = isRadial ? nextRadialDimensions(activeShape.value, 0.5) : {}
  shapeOverride.value = {
    ...shapeOverride.value,
    rows: nextRows,
    ...nextRadial,
    mask: nextMask,
    sizeMap: nextSizeMap,
  }

  if (position === 'top' && !isRadial) {
    shiftAllFills(1, 0)
  }
  saveGrid()
}

function removeColumn(side) {
  const base = activeShapeBase.value
  if (!base) return
  const currentCols = Number(activeShape.value?.cols || base.cols || 1)
  if (currentCols <= 1) return
  const nextCols = currentCols - 1
  const isRadial = isRadialShape(activeShape.value)
  const nextMask = isRadial
    ? generateRadialMask(activeShape.value, {
        rows: activeShape.value.rows,
        cols: nextCols,
        delta: -0.5,
        offsetX: radialOffsetForColumn(side, -1),
      })
    : removeColumnFromMask(activeShape.value?.mask, side)
  const nextSizeMap = isRadial
    ? activeShape.value?.sizeMap
    : removeColumnFromMask(activeShape.value?.sizeMap, side)
  const nextRadial = isRadial ? nextRadialDimensions(activeShape.value, -0.5) : {}
  shapeOverride.value = {
    ...shapeOverride.value,
    cols: nextCols,
    ...nextRadial,
    mask: nextMask,
    sizeMap: nextSizeMap,
  }

  if (side === 'left' && !isRadial) {
    shiftAllFills(0, -1)
  }
  pruneFills(nextCols, Number(activeShape.value?.rows || base.rows || 1))
  saveGrid()
}

function removeRow(position) {
  const base = activeShapeBase.value
  if (!base) return
  const currentRows = Number(activeShape.value?.rows || base.rows || 1)
  if (currentRows <= 1) return
  const nextRows = currentRows - 1
  const isRadial = isRadialShape(activeShape.value)
  const nextMask = isRadial
    ? generateRadialMask(activeShape.value, {
        rows: nextRows,
        cols: activeShape.value.cols,
        delta: -0.5,
        offsetY: radialOffsetForRow(position, -1),
      })
    : removeRowFromMask(activeShape.value?.mask, position)
  const nextSizeMap = isRadial
    ? activeShape.value?.sizeMap
    : removeRowFromMask(activeShape.value?.sizeMap, position)
  const nextRadial = isRadial ? nextRadialDimensions(activeShape.value, -0.5) : {}
  shapeOverride.value = {
    ...shapeOverride.value,
    rows: nextRows,
    ...nextRadial,
    mask: nextMask,
    sizeMap: nextSizeMap,
  }

  if (position === 'top' && !isRadial) {
    shiftAllFills(-1, 0)
  }
  pruneFills(Number(activeShape.value?.cols || base.cols || 1), nextRows)
  saveGrid()
}

function shiftAllFills(rowOffset, colOffset) {
  const shapeId = activeShapeId.value
  const next = { back: {}, front: {}, connectors: {} }
  for (const [key, value] of Object.entries(fillsByLayer.value?.back || {})) {
    const nextId = shiftCellId(shapeId, key, rowOffset, colOffset)
    if (nextId) next.back[nextId] = value
  }
  for (const [key, value] of Object.entries(fillsByLayer.value?.front || {})) {
    const nextId = shiftCellId(shapeId, key, rowOffset, colOffset)
    if (nextId) next.front[nextId] = value
  }
  for (const [key, value] of Object.entries(fillsByLayer.value?.connectors || {})) {
    const nextId = shiftCellId(shapeId, key, rowOffset, colOffset, 'c')
    if (nextId) next.connectors[nextId] = value
  }
  fillsByLayer.value = next
}

function pruneFills(cols, rows) {
  const shapeId = activeShapeId.value
  const next = { back: {}, front: {}, connectors: {} }
  for (const [key, value] of Object.entries(fillsByLayer.value?.back || {})) {
    if (cellInBounds(shapeId, key, rows, cols)) next.back[key] = value
  }
  for (const [key, value] of Object.entries(fillsByLayer.value?.front || {})) {
    if (cellInBounds(shapeId, key, rows, cols)) next.front[key] = value
  }
  const connectorRows = Math.max(0, rows - 1)
  const connectorCols = Math.max(0, cols - 1)
  for (const [key, value] of Object.entries(fillsByLayer.value?.connectors || {})) {
    if (cellInBounds(shapeId, key, connectorRows, connectorCols, 'c')) {
      next.connectors[key] = value
    }
  }
  fillsByLayer.value = next
}

function saveGrid() {
  if (isLoadingProject.value) return
  const activeProject = projects.activeProject
  if (!activeProject) return
  if (guideMode.value) {
    projects.updateProjectData(activeProject.id, {
      mode: 'guide-wall',
      guide: {
        shapeId: activeShapeId.value,
        shape: shapeOverride.value,
        guideWall: guideWallConfig.value,
        canvas: guideCanvasConfig.value,
        displayScale: displayScale.value,
        pattern: {
          config: patternConfig.value,
          options: {
            showGridNumbers: showGridNumbers.value,
            showDimensions: showDimensions.value,
            flatColors: flatColors.value,
            dimensionUnits: dimensionUnits.value,
          },
          tile: {
            mode: tileMode.value,
            config: tileConfig.value,
          },
          structure: {
            mode: structureMode.value,
            slots: structureSlots.value,
            tile: tileConfig.value,
          },
          presets: patternPresets.value,
          activePresetId: activePresetId.value,
        },
      },
    })
    return
  }
  projects.updateProjectData(activeProject.id, {
    mode: 'grid',
    grid: {
      shapeId: activeShapeId.value,
      shape: shapeOverride.value,
      guideWall: guideWallConfig.value,
      guideCanvas: guideCanvasConfig.value,
      displayScale: displayScale.value,
      fillsByLayer: fillsByLayer.value,
      selectedTypeId: selectedTypeId.value,
      selectedColor: selectedColor.value,
      activeLayer: activeLayer.value,
      layerVisibility: layerVisibility.value,
      connectorFreeMode: connectorFreeMode.value,
      layerSettings: layerSettings.value,
      pattern: {
        mode: patternMode.value,
        painted: patternPainted.value,
        config: patternConfig.value,
        options: {
          showGridNumbers: showGridNumbers.value,
          showColorLabels: showColorLabels.value,
          showSizeLabels: showSizeLabels.value,
          showDimensions: showDimensions.value,
          flatColors: flatColors.value,
          dimensionUnits: dimensionUnits.value,
        },
        tile: {
          mode: tileMode.value,
          config: tileConfig.value,
          painted: tilePainted.value,
        },
        structure: {
          mode: structureMode.value,
          slots: structureSlots.value,
          tile: tileConfig.value,
        },
        presets: patternPresets.value,
        activePresetId: activePresetId.value,
      },
    },
  })
}

function createFillFromGuide() {
  const activeProject = projects.activeProject
  if (!activeProject) return
  const baseName = String(activeProject.name || '').trim() || 'Guia'
  const project = projects.createProject({
    name: `${baseName} - relleno`,
    template: {
      type: 'grid',
      params: { shapeId: activeShapeId.value },
    },
    data: {
      mode: 'grid',
      grid: {
        shapeId: activeShapeId.value,
        shape: shapeOverride.value,
        fillsByLayer: { back: {}, front: {}, connectors: {} },
        selectedTypeId: '',
        selectedColor: '#ff3b30',
        activeLayer: 'front',
        layerVisibility: { back: true, front: true, connectors: true },
        connectorFreeMode: false,
        layerSettings: {
          back: { typeId: '' },
          front: { typeId: '' },
          connectors: { typeId: '' },
        },
        pattern: {
          mode: true,
          painted: {},
          config: patternConfig.value,
          options: {
            showGridNumbers: showGridNumbers.value,
            showColorLabels: false,
            showSizeLabels: true,
            showDimensions: showDimensions.value,
            flatColors: flatColors.value,
            dimensionUnits: dimensionUnits.value,
          },
          tile: {
            mode: tileMode.value,
            config: tileConfig.value,
            painted: {},
          },
          structure: {
            mode: true,
            slots: structureSlots.value,
            tile: tileConfig.value,
          },
          presets: patternPresets.value,
          activePresetId: activePresetId.value,
        },
      },
    },
  })
  if (!project?.id) return
  router.push('/grid')
}

function normalizeLayerFills(input) {
  const base = input && typeof input === 'object' ? input : {}
  return {
    back: base.back && typeof base.back === 'object' ? base.back : {},
    front: base.front && typeof base.front === 'object' ? base.front : {},
    connectors: base.connectors && typeof base.connectors === 'object' ? base.connectors : {},
  }
}

function normalizeLayerSettings(input) {
  const base = input && typeof input === 'object' ? input : {}
  return {
    back: { typeId: base.back?.typeId || '' },
    front: { typeId: base.front?.typeId || '' },
    connectors: { typeId: base.connectors?.typeId || '' },
  }
}

function pickDefaultTypeId(list, mode) {
  if (!Array.isArray(list) || !list.length) return ''
  const bySize = [...list].filter((t) => Number.isFinite(t.sizeIn))
  if (!bySize.length) return list[0].id
  bySize.sort((a, b) => Number(a.sizeIn || 0) - Number(b.sizeIn || 0))
  if (mode === 'min') return bySize[0].id
  if (mode === 'max') return bySize[bySize.length - 1].id
  return bySize[0].id
}

function getLayerFills(layerId) {
  const all = fillsByLayer.value || {}
  return all[layerId] && typeof all[layerId] === 'object' ? all[layerId] : {}
}

function toggleLayerVisibility(layerId) {
  const current = layerVisibility.value || {}
  layerVisibility.value = {
    ...current,
    [layerId]: !current[layerId],
  }
  if (layerId === activeLayer.value && !layerVisibility.value[layerId]) {
    const fallback = layers.find((l) => layerVisibility.value[l.id])
    if (fallback) activeLayer.value = fallback.id
  }
  saveGrid()
}

function slotFill(slot) {
  return patternRenderedPainted.value?.[slot.id] || null
}

function slotEffectiveShape(slot) {
  const fill = slotFill(slot)
  return fill?.shapeType || slot.shapeType
}

function tileSlotShape(slot) {
  const key = getTileKeyForSlot(slot)
  const entry = key ? tilePainted.value?.[key] : null
  return entry?.shapeType || slot.shapeType
}

function slotType(slot) {
  const fill = slotFill(slot)
  if (!fill?.typeId) return null
  return catalog.typeById(fill.typeId)
}

function getEditableEntry(slot) {
  if (!slot) return null
  if (!tileMode.value) return patternPainted.value?.[slot.id] || null
  const key = getTileKeyForSlot(slot)
  if (!key) return null
  return tilePainted.value?.[key] || null
}

function slotSizeLabel(slot) {
  const type = slotType(slot)
  if (!type) return ''
  if (dimensionUnits.value === 'cm') {
    const cm = Number(type.sizeCm || 0) || Number(type.sizeIn || 0) * 2.54
    if (!Number.isFinite(cm) || !cm) return ''
    return `${Math.round(cm)}cm`
  }
  const inches = Number(type.sizeIn || 0)
  if (!Number.isFinite(inches) || !inches) return ''
  return `${inches}"`
}

function slotColorLabel(slot) {
  const fill = slotFill(slot)
  return fill?.color || ''
}

function getWallBaseSizeIn() {
  const selectedSize = Number(selectedType.value?.sizeIn || 0)
  if (Number.isFinite(selectedSize) && selectedSize > 0) return selectedSize
  let maxSize = 0
  for (const entry of Object.values(patternPainted.value || {})) {
    const type = catalog.typeById(entry?.typeId)
    const size = Number(type?.sizeIn || 0)
    if (Number.isFinite(size) && size > maxSize) maxSize = size
  }
  return maxSize
}

function onSlotClick(slot, event) {
  if (guideMode.value) return
  if (!patternMode.value) return
  if (!slot) return
  selectedSlotId.value = slot.id
  const isErase = event?.altKey || eraseMode.value
  const current = getEditableEntry(slot)

  if (isErase) {
    if (!current) return
    if (tileMode.value) {
      const key = getTileKeyForSlot(slot)
      if (!key) return
      const next = { ...tilePainted.value }
      delete next[key]
      tilePainted.value = next
    } else {
      const next = { ...patternPainted.value }
      delete next[slot.id]
      patternPainted.value = next
    }
    saveGrid()
    return
  }

  if (!selectedTypeId.value) return
  const type = catalog.typeById(selectedTypeId.value)
  const defaultScale = Number(type?.inflation?.defaultScale || 1)
  const shapeType =
    slot.shapeType === 'smallCircle'
      ? 'smallCircle'
      : slot.shapeType === 'oval'
        ? 'oval'
        : patternConfig.value.useOval
          ? 'oval'
          : 'circle'
  if (tileMode.value) {
    const key = getTileKeyForSlot(slot)
    if (!key) return
    const next = { ...tilePainted.value }
    next[key] = {
      typeId: selectedTypeId.value,
      color: selectedColor.value || '#ff3b30',
      shapeType,
      scale: defaultScale,
    }
    tilePainted.value = next
  } else {
    const next = { ...patternPainted.value }
    next[slot.id] = {
      typeId: selectedTypeId.value,
      color: selectedColor.value || '#ff3b30',
      shapeType,
      scale: defaultScale,
    }
    patternPainted.value = next
  }
  saveGrid()
}

function toggleSelectedSlotShape() {
  if (!selectedSlot.value) return
  const current = selectedSlotEntry.value
  if (!current) return
  if (current.shapeType === 'smallCircle') return
  const next = tileMode.value ? { ...tilePainted.value } : { ...patternPainted.value }
  const nextShape = current.shapeType === 'oval' ? 'circle' : 'oval'
  const nextRotation = nextShape === 'oval' ? current.rotation || 0 : 0
  const key = tileMode.value ? getTileKeyForSlot(selectedSlot.value) : selectedSlotId.value
  if (!key) return
  next[key] = { ...current, shapeType: nextShape, rotation: nextRotation }
  if (tileMode.value) tilePainted.value = next
  else patternPainted.value = next
  saveGrid()
}

function onRotationInput(event) {
  if (!selectedSlot.value) return
  const current = selectedSlotEntry.value
  if (!current || current.shapeType !== 'oval') return
  const nextValue = clamp(Number(event?.target?.value), -90, 90)
  const next = { ...patternPainted.value }
  next[selectedSlotId.value] = { ...current, rotation: nextValue }
  patternPainted.value = next
  saveGrid()
}

function onInflationInput(event) {
  if (!selectedSlot.value || !selectedInflation.value) return
  const nextValue = clamp(
    Number(event?.target?.value),
    selectedInflation.value.min,
    selectedInflation.value.max,
  )
  const current = selectedSlotEntry.value
  if (!current) return
  const next = tileMode.value ? { ...tilePainted.value } : { ...patternPainted.value }
  const key = tileMode.value ? getTileKeyForSlot(selectedSlot.value) : selectedSlotId.value
  if (!key) return
  next[key] = { ...current, scale: nextValue }
  if (tileMode.value) tilePainted.value = next
  else patternPainted.value = next
  saveGrid()
}

function addPatternColumn(side) {
  const cols = Number(patternConfig.value.cols || 0)
  if (!cols) return
  const nextCols = cols + 1
  const original = patternPainted.value || {}
  const next = {}

  const sourceCol = clamp(patternSourceCol.value, 1, cols) - 1

  for (const [id, value] of Object.entries(original)) {
    const parsed = parseSlotId(id)
    if (!parsed) continue
    const { kind, row, col } = parsed
    const targetCol = side === 'left' ? col + 1 : col
    const targetId = buildPatternId(kind, row, targetCol)
    next[targetId] = value
  }

  for (const [id, value] of Object.entries(original)) {
    const parsed = parseSlotId(id)
    if (!parsed || parsed.kind !== 'main') continue
    if (parsed.col !== sourceCol) continue
    const targetCol = side === 'left' ? 0 : nextCols - 1
    const targetId = buildPatternId(parsed.kind, parsed.row, targetCol, parsed.shapeType)
    next[targetId] = value
  }

  if (cols >= 2) {
    const sourceSmallCol = clamp(sourceCol, 0, cols - 2)
    for (const [id, value] of Object.entries(original)) {
      const parsed = parseSlotId(id)
      if (!parsed || parsed.kind !== 'small') continue
      if (parsed.col !== sourceSmallCol) continue
      const targetCol = side === 'left' ? 0 : nextCols - 2
      const targetId = buildPatternId(parsed.kind, parsed.row, targetCol)
      next[targetId] = value
    }
  }

  patternPainted.value = next
  patternConfig.value = { ...patternConfig.value, cols: nextCols }
  saveGrid()
}

function addPatternRow(position) {
  const rows = Number(patternConfig.value.rows || 0)
  if (!rows) return
  const nextRows = rows + 1
  const original = patternPainted.value || {}
  const next = {}

  const sourceRow = clamp(patternSourceRow.value, 1, rows) - 1

  for (const [id, value] of Object.entries(original)) {
    const parsed = parseSlotId(id)
    if (!parsed) continue
    const { kind, row, col } = parsed
    const targetRow = position === 'top' ? row + 1 : row
    const targetId = buildPatternId(kind, targetRow, col, parsed.shapeType)
    next[targetId] = value
  }

  for (const [id, value] of Object.entries(original)) {
    const parsed = parseSlotId(id)
    if (!parsed || parsed.kind !== 'main') continue
    if (parsed.row !== sourceRow) continue
    const targetRow = position === 'top' ? 0 : nextRows - 1
    const targetId = buildPatternId(parsed.kind, targetRow, parsed.col, parsed.shapeType)
    next[targetId] = value
  }

  if (rows >= 2) {
    const sourceSmallRow = clamp(sourceRow, 0, rows - 2)
    for (const [id, value] of Object.entries(original)) {
      const parsed = parseSlotId(id)
      if (!parsed || parsed.kind !== 'small') continue
      if (parsed.row !== sourceSmallRow) continue
      const targetRow = position === 'top' ? 0 : nextRows - 2
      const targetId = buildPatternId(parsed.kind, targetRow, parsed.col)
      next[targetId] = value
    }
  }

  patternPainted.value = next
  patternConfig.value = { ...patternConfig.value, rows: nextRows }
  saveGrid()
}

function applyTileToPattern() {
  const expanded = buildPatternFromTile(resolvedPatternSlots.value, tilePainted.value)
  patternPainted.value = expanded
  tileMode.value = false
  saveGrid()
}

function copyTileFromPattern() {
  const rows = Number(tileConfig.value.rows || 0)
  const cols = Number(tileConfig.value.cols || 0)
  if (!rows || !cols) return
  const next = {}
  for (const [id, value] of Object.entries(patternPainted.value || {})) {
    const parsed = parseSlotId(id)
    if (!parsed) continue
    if (parsed.kind === 'small') {
      if (parsed.row >= rows - 1 || parsed.col >= cols - 1) continue
      next[`small-${parsed.row}-${parsed.col}`] = value
      continue
    }
    if (parsed.row >= rows || parsed.col >= cols) continue
    next[`main-${parsed.row}-${parsed.col}`] = value
  }
  tilePainted.value = next
  saveGrid()
}

function clearTile() {
  tilePainted.value = {}
  saveGrid()
}

function applyStructureToWall() {
  if (!Object.keys(structureSlots.value || {}).length) return
  structureMode.value = false
  showStructureModal.value = false
  saveGrid()
}

function clearStructure() {
  structureSlots.value = {}
  saveGrid()
}

function savePreset() {
  const id = String(Date.now())
  const name = `Patron ${patternPresets.value.length + 1}`
  const preset = {
    id,
    name,
    tile: { ...tileConfig.value },
    structure: { ...structureSlots.value },
  }
  patternPresets.value = [...patternPresets.value, preset]
  activePresetId.value = id
  saveGrid()
}

function loadPreset() {
  const preset = patternPresets.value.find((p) => p.id === activePresetId.value)
  if (!preset) return
  tileConfig.value = { ...tileConfig.value, ...preset.tile }
  structureSlots.value = { ...preset.structure }
  saveGrid()
}

function deletePreset() {
  if (!activePresetId.value) return
  patternPresets.value = patternPresets.value.filter((p) => p.id !== activePresetId.value)
  activePresetId.value = ''
  saveGrid()
}

function normalizeCanvasConfig(raw) {
  if (!raw || typeof raw !== 'object') return null
  const widthCm = Number(raw.widthCm || 0)
  const heightCm = Number(raw.heightCm || 0)
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) return null
  if (widthCm <= 0 || heightCm <= 0) return null
  return { widthCm, heightCm }
}

function clampDisplayScale(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 1
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, n))
}

function resolveDisplayScale(data) {
  const raw = Number(data?.displayScale ?? data?.canvas?.displayScale ?? 1)
  if (!Number.isFinite(raw)) return 1
  return clampDisplayScale(raw)
}

function resolveGuideWallConfig(data, fallback) {
  if (fallback && typeof fallback === 'object') return fallback
  const widthCm = Number(data?.canvas?.widthCm || 0)
  const heightCm = Number(data?.canvas?.heightCm || 0)
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) return null
  if (widthCm <= 0 || heightCm <= 0) return null
  return { widthCm, heightCm }
}

async function onImportGuideFile(e) {
  const file = e.target.files?.[0] || null
  e.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const result = buildStructureFromGuideJson(data)
    if (!result || !Object.keys(result.slots || {}).length) {
      window.alert('La guia no contiene elementos importables.')
      return
    }

    const safeRows = Number.isFinite(Number(result.rows))
      ? Number(result.rows)
      : patternConfig.value.rows
    const safeCols = Number.isFinite(Number(result.cols))
      ? Number(result.cols)
      : patternConfig.value.cols
    const nextRows = Math.max(1, Math.round(Number(safeRows || 1)))
    const nextCols = Math.max(1, Math.round(Number(safeCols || 1)))
    const nextConfig = {
      ...patternConfig.value,
      ...result.patternConfig,
      rows: nextRows,
      cols: nextCols,
    }
    patternConfig.value = nextConfig
    tileConfig.value = { ...tileConfig.value, rows: nextRows, cols: nextCols }
    guideWallConfig.value = resolveGuideWallConfig(data, result.guideWall)
    guideCanvasConfig.value = normalizeCanvasConfig(data?.canvas)
    displayScale.value = resolveDisplayScale(data)
    cellGap.value = 0
    structureSlots.value = result.slots
    structureMode.value = true
    patternMode.value = true
    tileMode.value = false
    patternPainted.value = {}
    tilePainted.value = {}
    fillsByLayer.value = { back: {}, front: {}, connectors: {} }
    selectedSlotId.value = ''
    saveGrid()
    showStructureModal.value = true
    nextTick(() => {
      fitView()
    })
    window.alert('Guia importada. Estructura actualizada.')
  } catch {
    window.alert('No se pudo importar la guia. Verifica que el JSON sea válido.')
  }
}

function parseSlotId(id) {
  const text = String(id || '')
  const parts = text.split('-')
  if (parts.length < 3) return null
  const prefix = parts[0]
  const row = Number(parts[1])
  const col = Number(parts[2])
  if (!Number.isFinite(row) || !Number.isFinite(col)) return null
  if (prefix === 'small') {
    return { kind: 'small', row, col, shapeType: 'smallCircle' }
  }
  if (prefix === 'main') {
    return { kind: 'main', row, col, shapeType: 'circle' }
  }
  if (prefix === 'circle' || prefix === 'oval') {
    return { kind: 'main', row, col, shapeType: prefix }
  }
  return null
}

function buildPatternId(kind, row, col, shapeType) {
  if (kind === 'small') return `small-${row}-${col}`
  const type = shapeType === 'oval' ? 'oval' : 'circle'
  return `${type}-${row}-${col}`
}

function buildStructureFromGuideJson(data) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : []
  const symbols = Array.isArray(data?.symbols) ? data.symbols : []
  if (!nodes.length) return null

  const symbolMap = new Map(symbols.map((s) => [String(s.id), s]))
  const shapes = []

  const root = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }

  const walk = (list, parent) => {
    for (const n of list) {
      if (!n || n.visible === false) continue
      const kind = String(n.kind || 'balloon')
      const isSymbol = kind === 'symbol' && n.symbolId
      const world = applyTransform(parent, n)

      if (isSymbol) {
        const symbol = symbolMap.get(String(n.symbolId))
        if (symbol?.nodes?.length) walk(symbol.nodes, world)
        continue
      }

      if (kind === 'text' || kind === 'image') continue

      const baseRx = Number(n?.meta?.radiusX ?? 46)
      const baseRy = Number(n?.meta?.radiusY ?? 60)
      const rx = (Number.isFinite(baseRx) ? baseRx : 46) * Math.abs(world.scaleX)
      const ry = (Number.isFinite(baseRy) ? baseRy : 60) * Math.abs(world.scaleY)
      shapes.push({ x: world.x, y: world.y, rx, ry })
    }
  }

  walk(nodes, root)

  if (!shapes.length) return null

  const minX = Math.min(...shapes.map((s) => s.x))
  const minY = Math.min(...shapes.map((s) => s.y))

  const sizes = shapes.map((s) => Math.max(s.rx, s.ry)).sort((a, b) => a - b)
  const medianSize = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0
  const smallThreshold = medianSize ? medianSize * 0.7 : 0
  const smallShapes = sizes.length
    ? shapes.filter((s) => Math.max(s.rx, s.ry) <= smallThreshold)
    : []
  const mainShapes = smallShapes.length ? shapes.filter((s) => !smallShapes.includes(s)) : shapes

  const guideWall = data?.guideWall
  const originX = minX
  const originY = minY

  const mainXs = mainShapes.map((s) => s.x - originX)
  const mainYs = mainShapes.map((s) => s.y - originY)
  const mergeTolerance = Math.max(4, Math.min(16, medianSize * 0.3 || 6))
  const uniqX = uniquePositions(mainXs, mergeTolerance)
  const uniqY = uniquePositions(mainYs, mergeTolerance)

  const sortedX = uniqX.slice().sort((a, b) => a - b)
  const sortedY = uniqY.slice().sort((a, b) => a - b)

  const inferredCellW = medianDiff(sortedX)
  const inferredCellH = medianDiff(sortedY)
  const colsFromShapes = Math.max(1, sortedX.length)
  const rowsFromShapes = Math.max(1, sortedY.length)

  const circleShapes = mainShapes.filter(
    (s) => Math.abs(s.rx - s.ry) <= Math.max(2, Math.max(s.rx, s.ry) * 0.1),
  )
  const ovalShapes = mainShapes.filter((s) => !circleShapes.includes(s))

  const circleR = medianValue(circleShapes.map((s) => s.rx))
  const ovalW = medianValue(ovalShapes.map((s) => s.rx * 2))
  const ovalH = medianValue(ovalShapes.map((s) => s.ry * 2))
  const smallR = medianValue(smallShapes.map((s) => Math.max(s.rx, s.ry)))
  const maxW = Math.max(...shapes.map((s) => s.rx * 2))
  const maxH = Math.max(...shapes.map((s) => s.ry * 2))

  let cellW = Math.max(10, inferredCellW || Number(patternConfig.value.cellW || 70))
  let cellH = Math.max(10, inferredCellH || Number(patternConfig.value.cellH || 56))
  if (Number.isFinite(maxW) && maxW > 0) cellW = Math.max(cellW, maxW * 0.6)
  if (Number.isFinite(maxH) && maxH > 0) cellH = Math.max(cellH, maxH * 0.6)

  const smallRResolved = Math.max(4, smallR || Number(patternConfig.value.smallR || 10))
  const circleRResolved = Math.max(6, circleR || Number(patternConfig.value.circleR || 20))

  const slots = {}
  let maxRow = 0
  let maxCol = 0

  for (const shape of shapes) {
    const localX = shape.x - originX
    const localY = shape.y - originY
    const row = nearestIndex(localY, sortedY)
    const col = nearestIndex(localX, sortedX)
    if (row < 0 || col < 0) continue

    const maxRadius = Math.max(shape.rx, shape.ry)
    const isSmall = maxRadius <= smallRResolved * 1.2
    const isOval = Math.abs(shape.rx - shape.ry) > Math.max(2, circleRResolved * 0.2)

    if (isSmall) {
      if (rowsFromShapes < 2 || colsFromShapes < 2) continue
      const rowSmall = betweenIndex(localY, sortedY)
      const colSmall = betweenIndex(localX, sortedX)
      if (rowSmall < 0 || colSmall < 0) continue
      const id = `small-${rowSmall}-${colSmall}`
      slots[id] = { shapeType: 'smallCircle' }
      maxRow = Math.max(maxRow, rowSmall + 2)
      maxCol = Math.max(maxCol, colSmall + 2)
      continue
    }

    const shapeType = isOval ? 'oval' : 'circle'
    const id = `main-${row}-${col}`
    slots[id] = { shapeType }
    maxRow = Math.max(maxRow, row + 1)
    maxCol = Math.max(maxCol, col + 1)
  }

  maxCol = Math.max(maxCol, colsFromShapes)
  maxRow = Math.max(maxRow, rowsFromShapes)

  const finalRows = Math.max(1, maxRow)
  const finalCols = Math.max(1, maxCol)

  return {
    slots,
    rows: finalRows,
    cols: finalCols,
    guideWall: guideWall && typeof guideWall === 'object' ? guideWall : null,
    patternConfig: {
      cellW,
      cellH,
      circleR: circleRResolved || patternConfig.value.circleR,
      ovalW: Math.max(10, ovalW || patternConfig.value.ovalW),
      ovalH: Math.max(10, ovalH || patternConfig.value.ovalH),
      smallR: smallRResolved || patternConfig.value.smallR,
      useOval: false,
    },
  }
}

function uniquePositions(values, tolerance) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return []
  const groups = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i += 1) {
    const lastGroup = groups[groups.length - 1]
    const lastValue = lastGroup[lastGroup.length - 1]
    if (Math.abs(sorted[i] - lastValue) <= tolerance) {
      lastGroup.push(sorted[i])
    } else {
      groups.push([sorted[i]])
    }
  }
  return groups.map((g) => g.reduce((sum, v) => sum + v, 0) / g.length)
}

function medianDiff(values) {
  if (!values || values.length < 2) return 0
  const diffs = []
  for (let i = 1; i < values.length; i += 1) {
    const d = values[i] - values[i - 1]
    if (Number.isFinite(d) && d > 0) diffs.push(d)
  }
  if (!diffs.length) return 0
  diffs.sort((a, b) => a - b)
  return diffs[Math.floor(diffs.length / 2)]
}

function medianValue(values) {
  const nums = values.filter((v) => Number.isFinite(v))
  if (!nums.length) return 0
  nums.sort((a, b) => a - b)
  return nums[Math.floor(nums.length / 2)]
}

function nearestIndex(value, centers) {
  if (!centers?.length) return 0
  let best = 0
  let bestDiff = Math.abs(value - centers[0])
  for (let i = 1; i < centers.length; i += 1) {
    const diff = Math.abs(value - centers[i])
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

function betweenIndex(value, centers) {
  if (!centers?.length || centers.length < 2) return -1
  for (let i = 0; i < centers.length - 1; i += 1) {
    const mid = (centers[i] + centers[i + 1]) / 2
    if (value < mid) return i
  }
  return centers.length - 2
}

function applyTransform(parent, node) {
  const px = Number(node?.x || 0)
  const py = Number(node?.y || 0)
  const parentScaleX = Number.isFinite(Number(parent?.scaleX)) ? Number(parent.scaleX) : 1
  const parentScaleY = Number.isFinite(Number(parent?.scaleY)) ? Number(parent.scaleY) : 1
  const parentRot = Number.isFinite(Number(parent?.rotation)) ? Number(parent.rotation) : 0
  const angle = (parentRot * Math.PI) / 180
  const ox = px * parentScaleX
  const oy = py * parentScaleY
  const worldX = (parent?.x || 0) + ox * Math.cos(angle) - oy * Math.sin(angle)
  const worldY = (parent?.y || 0) + ox * Math.sin(angle) + oy * Math.cos(angle)
  const scaleX = parentScaleX * (Number.isFinite(Number(node?.scaleX)) ? Number(node.scaleX) : 1)
  const scaleY = parentScaleY * (Number.isFinite(Number(node?.scaleY)) ? Number(node.scaleY) : 1)
  const rotation = parentRot + (Number.isFinite(Number(node?.rotation)) ? Number(node.rotation) : 0)
  return { x: worldX, y: worldY, scaleX, scaleY, rotation }
}

function getTileKeyForSlot(slot) {
  if (!slot) return null
  const tileRows = Number(tileConfig.value.rows || 0)
  const tileCols = Number(tileConfig.value.cols || 0)
  if (!tileRows || !tileCols) return null
  if (slot.shapeType === 'smallCircle') {
    const maxRows = Math.max(1, tileRows - 1)
    const maxCols = Math.max(1, tileCols - 1)
    const row = slot.row % maxRows
    const col = slot.col % maxCols
    return `small-${row}-${col}`
  }
  const row = slot.row % tileRows
  const col = slot.col % tileCols
  return `main-${row}-${col}`
}

function buildPatternFromTile(slots, painted) {
  const result = {}
  for (const slot of slots) {
    const key = getTileKeyForSlot(slot)
    if (!key) continue
    const entry = painted?.[key]
    if (!entry) continue
    const shapeType =
      slot.shapeType === 'smallCircle' ? 'smallCircle' : entry.shapeType || slot.shapeType
    result[slot.id] = { ...entry, shapeType }
  }
  return result
}

function structureSlotShape(slot) {
  const entry = structureSlots.value?.[slot.id]
  return entry?.shapeType || slot.shapeType
}

function toggleStructureSlot(slot) {
  if (!structureMode.value) return
  if (!slot) return
  const next = { ...structureSlots.value }
  if (structureTool.value === 'erase') {
    delete next[slot.id]
    structureSlots.value = next
    return
  }
  if (slot.shapeType === 'smallCircle') {
    next[slot.id] = { shapeType: 'smallCircle' }
  } else {
    next[slot.id] = { shapeType: structureTool.value }
  }
  structureSlots.value = next
}

function normalizePatternConfigBase() {
  const nextRows = Math.max(1, Math.round(Number(patternConfig.value.rows || 1)))
  const nextCols = Math.max(1, Math.round(Number(patternConfig.value.cols || 1)))
  const nextCellW = Math.max(10, Math.round(Number(patternConfig.value.cellW || 10)))
  const nextCellH = Math.max(10, Math.round(Number(patternConfig.value.cellH || 10)))
  if (
    nextRows === patternConfig.value.rows &&
    nextCols === patternConfig.value.cols &&
    nextCellW === patternConfig.value.cellW &&
    nextCellH === patternConfig.value.cellH
  ) {
    return
  }
  patternConfig.value = {
    ...patternConfig.value,
    rows: nextRows,
    cols: nextCols,
    cellW: nextCellW,
    cellH: nextCellH,
  }
}

function clamp(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function slotStyle(slot) {
  const fill = slotFill(slot)
  const shape = slotEffectiveShape(slot)
  const scale = Number(fill?.scale || 1)
  const base = {
    left: `${slot.x}px`,
    top: `${slot.y}px`,
  }
  if (shape === 'oval') {
    const w = Number(slot.w || patternConfig.value.ovalW || 0)
    const h = Number(slot.h || patternConfig.value.ovalH || 0)
    const sw = w * scale
    const sh = h * scale
    base.width = `${sw}px`
    base.height = `${sh}px`
    base.left = `${slot.x + (w - sw) / 2}px`
    base.top = `${slot.y + (h - sh) / 2}px`
    const rotation = Number(fill?.rotation || 0)
    base.transform = `rotate(${rotation}deg)`
    base.transformOrigin = 'center'
  }
  if (shape === 'circle') {
    const r = Number(slot.r || patternConfig.value.circleR || 0)
    const d = r * 2
    const sd = d * scale
    base.width = `${sd}px`
    base.height = `${sd}px`
    base.left = `${slot.x + (d - sd) / 2}px`
    base.top = `${slot.y + (d - sd) / 2}px`
  }
  if (shape === 'smallCircle') {
    const r = Number(slot.r || patternConfig.value.smallR || 0)
    const d = r * 2
    const sd = d * scale
    base.width = `${sd}px`
    base.height = `${sd}px`
    base.left = `${slot.x + (d - sd) / 2}px`
    base.top = `${slot.y + (d - sd) / 2}px`
  }
  if (fill?.color) {
    base.backgroundColor = fill.color
  }
  return base
}

function tileSlotStyle(slot) {
  const key = getTileKeyForSlot(slot)
  const entry = key ? tilePainted.value?.[key] : null
  const shape = entry?.shapeType || slot.shapeType
  const fill = entry?.color || ''
  const scale = Number(entry?.scale || 1)
  const base = {
    left: `${slot.x / 2}px`,
    top: `${slot.y / 2}px`,
  }
  if (shape === 'oval') {
    base.width = `${(slot.w * scale) / 2}px`
    base.height = `${(slot.h * scale) / 2}px`
  }
  if (shape === 'circle' || shape === 'smallCircle') {
    const d = slot.r * 2
    base.width = `${(d * scale) / 2}px`
    base.height = `${(d * scale) / 2}px`
  }
  if (fill) base.backgroundColor = fill
  return base
}

function tilePreviewColStyle(col) {
  const cellW = Number(patternConfig.value.cellW || 0) / 2
  const x = (col - 1) * cellW
  return { left: `${x}px` }
}

function tilePreviewRowStyle(row) {
  const cellH = Number(patternConfig.value.cellH || 0) / 2
  const y = (row - 1) * cellH
  return { top: `${y}px` }
}

function buildStructureSlots(config) {
  const rows = Number(config.rows || 0)
  const cols = Number(config.cols || 0)
  if (!rows || !cols) return []
  const gap = 0
  const cellW = Number(config.cellW || 70) + gap
  const cellH = Number(config.cellH || 56) + gap
  const ovalW = Number(config.ovalW || 56)
  const ovalH = Number(config.ovalH || 38)
  const circleR = Number(config.circleR || 20)
  const smallR = Number(config.smallR || 10)
  const slots = []

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cx = c * cellW
      const cy = r * cellH
      slots.push({
        id: `main-${r}-${c}`,
        row: r,
        col: c,
        shapeType: 'circle',
        x: cx - circleR,
        y: cy - circleR,
        r: circleR,
        w: ovalW,
        h: ovalH,
      })
    }
  }

  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const cx = c * cellW + cellW / 2
      const cy = r * cellH + cellH / 2
      slots.push({
        id: `small-${r}-${c}`,
        row: r,
        col: c,
        shapeType: 'smallCircle',
        x: cx - smallR,
        y: cy - smallR,
        r: smallR,
      })
    }
  }
  return slots
}

function patternColLabelStyle(col) {
  const gap = Number(cellGap.value || 0)
  const cellW = Number(patternConfig.value.cellW || 70) + gap
  const x = (col - 1) * cellW
  return { left: `${x}px` }
}

function patternRowLabelStyle(row) {
  const gap = Number(cellGap.value || 0)
  const cellH = Number(patternConfig.value.cellH || 56) + gap
  const y = (row - 1) * cellH
  return { top: `${y}px` }
}

function buildPatternSlots(config, gapValue) {
  if (!config) return []
  const rows = Number(config.rows || 0)
  const cols = Number(config.cols || 0)
  const slots = []
  const gap = Number(gapValue || 0)
  const cellW = Number(config.cellW || 70) + gap
  const cellH = Number(config.cellH || 56) + gap
  const ovalW = Number(config.ovalW || 56)
  const ovalH = Number(config.ovalH || 38)
  const circleR = Number(config.circleR || 20)
  const smallR = Number(config.smallR || 10)

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cx = c * cellW
      const cy = r * cellH
      if (config.useOval) {
        slots.push({
          id: `oval-${r}-${c}`,
          row: r,
          col: c,
          shapeType: 'oval',
          x: cx - ovalW / 2,
          y: cy - ovalH / 2,
          w: ovalW,
          h: ovalH,
        })
      } else {
        slots.push({
          id: `circle-${r}-${c}`,
          row: r,
          col: c,
          shapeType: 'circle',
          x: cx - circleR,
          y: cy - circleR,
          r: circleR,
        })
      }
    }
  }

  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const cx = c * cellW + cellW / 2
      const cy = r * cellH + cellH / 2
      slots.push({
        id: `small-${r}-${c}`,
        row: r,
        col: c,
        shapeType: 'smallCircle',
        x: cx - smallR,
        y: cy - smallR,
        r: smallR,
      })
    }
  }
  return slots
}

function buildPatternSlotsFromStructure({ pattern, tile, structure, gap }) {
  const slots = []
  const rows = Number(pattern?.rows || 0)
  const cols = Number(pattern?.cols || 0)
  const tileRows = Number(tile?.rows || 0)
  const tileCols = Number(tile?.cols || 0)
  if (!rows || !cols || !tileRows || !tileCols) return slots
  const gapValue = Number(gap || 0)
  const cellW = Number(pattern?.cellW || 70) + gapValue
  const cellH = Number(pattern?.cellH || 56) + gapValue
  const ovalW = Number(pattern?.ovalW || 56)
  const ovalH = Number(pattern?.ovalH || 38)
  const circleR = Number(pattern?.circleR || 20)
  const smallR = Number(pattern?.smallR || 10)

  const tileRowsCount = Math.ceil(rows / tileRows)
  const tileColsCount = Math.ceil(cols / tileCols)

  for (let tr = 0; tr < tileRowsCount; tr += 1) {
    for (let tc = 0; tc < tileColsCount; tc += 1) {
      const rowOffset = tr * tileRows
      const colOffset = tc * tileCols
      for (const [key, value] of Object.entries(structure || {})) {
        const parsed = parseSlotId(key)
        if (!parsed) continue
        if (parsed.kind === 'small') {
          const r = rowOffset + parsed.row
          const c = colOffset + parsed.col
          if (r >= rows - 1 || c >= cols - 1) continue
          const cx = c * cellW + cellW / 2
          const cy = r * cellH + cellH / 2
          slots.push({
            id: `small-${r}-${c}`,
            row: r,
            col: c,
            shapeType: 'smallCircle',
            x: cx - smallR,
            y: cy - smallR,
            r: smallR,
          })
          continue
        }
        const r = rowOffset + parsed.row
        const c = colOffset + parsed.col
        if (r >= rows || c >= cols) continue
        const cx = c * cellW
        const cy = r * cellH
        const shapeType = value?.shapeType === 'oval' ? 'oval' : 'circle'
        if (shapeType === 'oval') {
          slots.push({
            id: `oval-${r}-${c}`,
            row: r,
            col: c,
            shapeType: 'oval',
            x: cx - ovalW / 2,
            y: cy - ovalH / 2,
            w: ovalW,
            h: ovalH,
          })
        } else {
          slots.push({
            id: `circle-${r}-${c}`,
            row: r,
            col: c,
            shapeType: 'circle',
            x: cx - circleR,
            y: cy - circleR,
            r: circleR,
          })
        }
      }
    }
  }

  return slots
}

const MIN_VIEW_SCALE = 0.2
const MAX_VIEW_SCALE = 4
const WHEEL_SCALE_BY = 1.06
const BUTTON_SCALE_BY = 1.12

function clampScale(value) {
  return Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, value))
}

function getStagePointer(e, host) {
  if (!host) return null
  const rect = host.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function zoomToScale(nextScale, pointer = null) {
  const host = stageRef.value?.parentElement
  if (!host) {
    stageScale.value = nextScale
    return
  }
  const rect = host.getBoundingClientRect()
  const originX = pointer?.x ?? rect.width / 2
  const originY = pointer?.y ?? rect.height / 2
  const currentRenderScale = renderScale.value || 1
  const nextRenderScale = nextScale * (displayScale.value || 1)
  const pointTo = {
    x: (originX - stagePos.value.x) / currentRenderScale,
    y: (originY - stagePos.value.y) / currentRenderScale,
  }
  stagePos.value = {
    x: originX - pointTo.x * nextRenderScale,
    y: originY - pointTo.y * nextRenderScale,
  }
  stageScale.value = nextScale
}

function zoomBy(scaleBy, pointer = null) {
  const next = clampScale(stageScale.value * scaleBy)
  if (next === stageScale.value) return
  zoomToScale(next, pointer)
}

function onWheel(e) {
  e.preventDefault()
  const host = stageRef.value?.parentElement
  const pointer = getStagePointer(e, host)
  const scaleBy = e.deltaY > 0 ? 1 / WHEEL_SCALE_BY : WHEEL_SCALE_BY
  zoomBy(scaleBy, pointer)
}

function onStructureWheel(e) {
  const scaleBy = e.deltaY > 0 ? 1 / WHEEL_SCALE_BY : WHEEL_SCALE_BY
  const next = clampScale(structureStageScale.value * scaleBy)
  structureStageScale.value = next
}

function zoomIn() {
  zoomBy(BUTTON_SCALE_BY)
}

function zoomOut() {
  zoomBy(1 / BUTTON_SCALE_BY)
}

function structureZoomIn() {
  structureStageScale.value = clampScale(structureStageScale.value * BUTTON_SCALE_BY)
}

function structureZoomOut() {
  structureStageScale.value = clampScale(structureStageScale.value / BUTTON_SCALE_BY)
}

function resetView() {
  stageScale.value = 1
  stagePos.value = { x: 0, y: 0 }
}

function resetStructureView() {
  structureStageScale.value = 1
  structureStagePos.value = { x: 0, y: 0 }
}

function openGuideImport() {
  guideImportInput.value?.click?.()
}

function fitView() {
  const host = stageRef.value?.parentElement
  if (!host) return
  const fitSize = fitPixelSize.value || effectivePixelSize.value
  const gridW = fitSize.width || 1
  const gridH = fitSize.height || 1
  const padding = 40
  const scale = Math.min(
    (host.clientWidth - padding) / gridW,
    (host.clientHeight - padding) / gridH,
  )
  const safeDisplay = displayScale.value || 1
  const nextScale = clampScale(scale / safeDisplay)
  const nextRenderScale = nextScale * safeDisplay
  stageScale.value = nextScale
  const offsetX = (host.clientWidth - gridW * nextRenderScale) / 2
  const offsetY = (host.clientHeight - gridH * nextRenderScale) / 2
  stagePos.value = { x: offsetX, y: offsetY }
}

function fitStructureView() {
  const host = structureStageHost.value
  if (!host) return
  const size = getStructurePixelSize()
  if (!size.width || !size.height) return
  const padding = 40
  const scale = Math.min(
    (host.clientWidth - padding) / size.width,
    (host.clientHeight - padding) / size.height,
    2.5,
  )
  structureStageScale.value = clampScale(scale)
  const offsetX = (host.clientWidth - size.width * structureStageScale.value) / 2
  const offsetY = (host.clientHeight - size.height * structureStageScale.value) / 2
  structureStagePos.value = { x: offsetX, y: offsetY }
}

function onStageMouseDown(e) {
  if (e.button !== 0 && e.button !== 1) return
  if (e.button === 0 && !spacePressed.value) return
  isPanning.value = true
  panStart.value = {
    x: e.clientX - stagePos.value.x,
    y: e.clientY - stagePos.value.y,
  }
}

function onStageMouseMove(e) {
  if (!isPanning.value) return
  stagePos.value = {
    x: e.clientX - panStart.value.x,
    y: e.clientY - panStart.value.y,
  }
}

function onStageMouseUp() {
  isPanning.value = false
}

function onStructureMouseDown(e) {
  if (e.button !== 0 && e.button !== 1) return
  if (e.button === 0 && !spacePressed.value) return
  structureIsPanning.value = true
  structurePanStart.value = {
    x: e.clientX - structureStagePos.value.x,
    y: e.clientY - structureStagePos.value.y,
  }
}

function onStructureMouseMove(e) {
  if (!structureIsPanning.value) return
  structureStagePos.value = {
    x: e.clientX - structurePanStart.value.x,
    y: e.clientY - structurePanStart.value.y,
  }
}

function onStructureMouseUp() {
  structureIsPanning.value = false
}

function sizeLabel(type) {
  if (!type) return '—'
  if (Number.isFinite(type.sizeIn)) return `${type.sizeIn}"`
  if (Number.isFinite(type?.default?.radiusY)) return `${Math.round(type.default.radiusY)} px`
  return '—'
}

function getStructurePixelSize() {
  const rows = Number(tileConfig.value.rows || 0)
  const cols = Number(tileConfig.value.cols || 0)
  if (!rows || !cols) return { width: 0, height: 0 }
  const cellW = Number(patternConfig.value.cellW || 0)
  const cellH = Number(patternConfig.value.cellH || 0)
  const circleSize = Number(patternConfig.value.circleR || 0) * 2
  const ovalW = Number(patternConfig.value.ovalW || 0)
  const ovalH = Number(patternConfig.value.ovalH || 0)
  const width = (cols - 1) * cellW + Math.max(circleSize, ovalW)
  const height = (rows - 1) * cellH + Math.max(circleSize, ovalH)
  return {
    width: Math.max(0, width),
    height: Math.max(0, height),
  }
}

function buildCells(shape, fillMap = {}, { prefix = '' } = {}) {
  if (!shape) return []
  const rows = Number(shape.rows || 1)
  const cols = Number(shape.cols || 1)
  const cx = (cols - 1) / 2
  const cy = (rows - 1) / 2
  const outer = Number(shape.outer || 0)
  const inner = Number(shape.inner || 0)
  const mask = Array.isArray(shape.mask) ? shape.mask : null
  const sizeMap = Array.isArray(shape.sizeMap) ? shape.sizeMap : null
  const cells = []

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let active = true
      if (mask) {
        active = maskCellActive(mask, r, c)
      } else if (shape.type === 'column') {
        active = c === 0
      } else if (shape.type === 'ring' || shape.type === 'arch') {
        const dx = c - cx
        const dy = r - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        active = dist <= outer && dist >= inner
        if (shape.type === 'arch') active = active && r <= cy
      } else if (shape.type === 'checker') {
        active = (r + c) % 2 === 0
      } else if (shape.type === 'rect' || shape.type === 'mixed') {
        active = true
      }

      const id = buildCellId(shape.id, r, c, prefix)
      const sizeTag = sizeMap ? mapSizeTag(sizeMap, r, c) : ''
      cells.push({
        id,
        row: r,
        col: c,
        active,
        fill: fillMap[id] || null,
        sizeTag,
      })
    }
  }

  return cells
}

function buildConnectorCells(shape, fillMap = {}, occupied = new Set(), freeMode = false) {
  if (!shape) return []
  const rows = Math.max(0, Number(shape.rows || 1) - 1)
  const cols = Math.max(0, Number(shape.cols || 1) - 1)
  if (!rows || !cols) return []
  const baseMask = Array.isArray(shape.mask) ? shape.mask : null
  const cells = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let active = true
      if (!freeMode && occupied.size) {
        const a = buildCellId(shape.id, r, c)
        const b = buildCellId(shape.id, r + 1, c)
        const d = buildCellId(shape.id, r, c + 1)
        const e = buildCellId(shape.id, r + 1, c + 1)
        active = occupied.has(a) && occupied.has(b) && occupied.has(d) && occupied.has(e)
      }
      if (baseMask) {
        active =
          active &&
          maskCellActive(baseMask, r, c) &&
          maskCellActive(baseMask, r + 1, c) &&
          maskCellActive(baseMask, r, c + 1) &&
          maskCellActive(baseMask, r + 1, c + 1)
      }
      const id = buildCellId(shape.id, r, c, 'c')
      cells.push({
        id,
        row: r,
        col: c,
        active,
        fill: fillMap[id] || null,
        sizeTag: '6',
      })
    }
  }
  return cells
}

function buildCellId(shapeId, row, col, prefix = '') {
  const tag = prefix ? `${prefix}-` : ''
  return `${shapeId}-${tag}${row}-${col}`
}

function shiftCellId(shapeId, key, rowOffset, colOffset, prefix = '') {
  const parts = String(key).split('-')
  if (parts.length < 3) return null
  const c = Number(parts.pop())
  const r = Number(parts.pop())
  const id = parts.join('-')
  const tag = prefix ? `${shapeId}-${prefix}` : shapeId
  if (!id.startsWith(tag)) return null
  const nr = r + rowOffset
  const nc = c + colOffset
  return buildCellId(shapeId, nr, nc, prefix)
}

function cellInBounds(shapeId, key, rows, cols, prefix = '') {
  const parts = String(key).split('-')
  if (parts.length < 3) return false
  const c = Number(parts.pop())
  const r = Number(parts.pop())
  const id = parts.join('-')
  const tag = prefix ? `${shapeId}-${prefix}` : shapeId
  if (!id.startsWith(tag)) return false
  if (r < 0 || c < 0) return false
  if (r >= rows || c >= cols) return false
  return true
}

function applyShapeOverride(base, override = {}) {
  if (!base) return null
  const rows = Number(override?.rows || base.rows || 1)
  const cols = Number(override?.cols || base.cols || 1)
  const rawMask = override?.mask ?? base.mask
  const rawSizeMap = override?.sizeMap ?? base.sizeMap
  const mask = expandMask(rawMask, rows, cols)
  const sizeMap = expandMask(rawSizeMap, rows, cols)
  return {
    ...base,
    rows,
    cols,
    outer: Number(override?.outer ?? base.outer ?? 0),
    inner: Number(override?.inner ?? base.inner ?? 0),
    mask,
    sizeMap,
  }
}

function isRadialShape(shape) {
  return shape?.type === 'ring' || shape?.type === 'arch'
}

function nextRadialDimensions(shape, delta) {
  const outer = Number(shape?.outer ?? 0)
  const inner = Number(shape?.inner ?? 0)
  const nextOuter = Math.max(1, outer + delta)
  const nextInner = Math.max(0, Math.min(inner + delta, nextOuter - 0.5))
  return { outer: nextOuter, inner: nextInner }
}

function radialOffsetForColumn(side, deltaCols) {
  if (!side) return 0
  const dir = side === 'left' ? -1 : side === 'right' ? 1 : 0
  return dir * 0.5 * Math.sign(deltaCols)
  return 0
}

function radialOffsetForRow(side, deltaRows) {
  if (!side) return 0
  const dir = side === 'top' ? -1 : side === 'bottom' ? 1 : 0
  return dir * 0.5 * Math.sign(deltaRows)
  return 0
}

function generateRadialMask(shape, { rows, cols, delta, offsetX = 0, offsetY = 0 }) {
  const { outer, inner } = nextRadialDimensions(shape, delta)
  return buildRadialMask({
    type: shape?.type,
    rows,
    cols,
    outer,
    inner,
    offsetX,
    offsetY,
  })
}

function buildRadialMask({ type, rows, cols, outer, inner, offsetX = 0, offsetY = 0 }) {
  const cx = (cols - 1) / 2 + offsetX
  const baseCy = type === 'arch' ? rows - 1 : (rows - 1) / 2
  const cy = baseCy + offsetY
  const mask = []
  for (let r = 0; r < rows; r += 1) {
    let line = ''
    for (let c = 0; c < cols; c += 1) {
      const dx = c - cx
      const dy = r - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const active = dist <= outer && dist >= inner
      line += active ? '1' : '0'
    }
    mask.push(line)
  }
  return mask
}

function addColumnToMask(mask, side) {
  if (!Array.isArray(mask)) return mask
  return mask.map((line) => {
    const baseLine = String(line || '')
    if (side === 'left') {
      const first = baseLine[0] || '0'
      return `${first}${baseLine}`
    }
    const last = baseLine[baseLine.length - 1] || '0'
    return `${baseLine}${last}`
  })
}

function addRowToMask(mask, side) {
  if (!Array.isArray(mask)) return mask
  if (!mask.length) return mask
  const first = String(mask[0] || '')
  const last = String(mask[mask.length - 1] || '')
  if (side === 'top') return [first, ...mask]
  return [...mask, last]
}

function removeColumnFromMask(mask, side) {
  if (!Array.isArray(mask)) return mask
  return mask.map((line) => {
    const baseLine = String(line || '')
    if (side === 'left') return baseLine.slice(1)
    return baseLine.slice(0, -1)
  })
}

function removeRowFromMask(mask, side) {
  if (!Array.isArray(mask)) return mask
  if (side === 'top') return mask.slice(1)
  return mask.slice(0, -1)
}

function expandMask(mask, rows, cols) {
  if (!Array.isArray(mask)) return mask
  const next = []
  const baseRows = mask.length
  for (let r = 0; r < rows; r += 1) {
    const refRow = Math.min(r, baseRows - 1)
    const line = typeof mask[refRow] === 'string' ? mask[refRow] : ''
    const baseLine = String(line || '')
    const baseLen = baseLine.length
    let padded = baseLine
    if (baseLen < cols) {
      const last = baseLen ? baseLine[baseLen - 1] : '0'
      padded = baseLine + last.repeat(cols - baseLen)
    }
    next.push(padded.slice(0, cols))
  }
  return next
}

function maskCellActive(mask, row, col) {
  const line = mask[row]
  if (!line) return false
  if (Array.isArray(line)) return Boolean(line[col])
  return line[col] === '1'
}

function mapSizeTag(map, row, col) {
  const line = map[row]
  if (!line) return ''
  const value = Array.isArray(line) ? line[col] : line[col]
  if (!value) return ''
  if (value === '6' || value === 's') return '6'
  if (value === '12' || value === 'l') return '12'
  return ''
}

function cellStyle(cell, layer) {
  if (!cell.active) return {}
  if (!cell.fill) return {}
  const style = {
    backgroundColor: cell.fill.color || '#ff3b30',
  }
  if (layer?.id === 'back') {
    style.opacity = 0.75
  }
  return style
}

function cellTitle(cell, layer) {
  if (!cell || !cell.active) return ''
  const col = columnLabel(cell.col + 1)
  const row = cell.row + 1
  const prefix = layer?.type === 'connector' ? 'c' : ''
  return `${prefix}${col}${row}`
}

function columnLabel(index) {
  let label = ''
  let n = Number(index || 0)
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label || 'A'
}
</script>

<style scoped>
.layout-grid {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 12px;
  height: calc(100vh - 56px - 24px);
  outline: none;
}

.grid-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.grid-work {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.center {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.left,
.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.left-tabs,
.right-tabs {
  display: grid;
  gap: 8px;
  background: #f5f7fb;
  border-radius: 14px;
  padding: 6px;
}

.left-tabs {
  grid-template-columns: repeat(3, 1fr);
}

.right-tabs {
  grid-template-columns: repeat(4, 1fr);
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

.left-panels,
.right-panels {
  overflow: auto;
  min-height: 0;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-card {
  border-radius: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-card > .card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.type-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #fff;
  padding: 8px 10px;
  text-align: left;
}

.type-item.active {
  border-color: rgba(13, 110, 253, 0.4);
  background: #f3f7ff;
}

.type-item__title {
  font-weight: 600;
}

.type-item__meta {
  margin-top: 2px;
}

.color-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid transparent;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.color-dot.active {
  border-color: #0d6efd;
}

.color-dot.small {
  width: 14px;
  height: 14px;
  display: inline-block;
}

.work-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.work-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.grid-canvas {
  margin-top: 16px;
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fff 0%, #f8f9fb 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  flex: 1;
  position: relative;
  overflow: hidden;
}

.pattern-stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.pattern-labels {
  position: absolute;
  pointer-events: none;
  font-size: 0.75rem;
  color: #495057;
}

.pattern-labels--top {
  top: -40px;
  left: 0;
  height: 20px;
}

.pattern-labels--left {
  left: -40px;
  top: 0;
  width: 20px;
}

.pattern-label {
  position: absolute;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translate(-10px, -10px);
  font-weight: 700;
}

.pattern-dimensions {
  position: absolute;
  pointer-events: none;
}

.pattern-dim {
  position: absolute;
  border-color: #111;
  color: #111;
  font-weight: 700;
  font-size: 0.85rem;
}

.pattern-dim--width {
  border-bottom: 2px solid #111;
}

.pattern-dim--width::before,
.pattern-dim--width::after {
  content: '';
  position: absolute;
  bottom: -6px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #111;
}

.pattern-dim--width::before {
  left: -6px;
}

.pattern-dim--width::after {
  right: -6px;
  transform: rotate(180deg);
  bottom: 0;
}

.pattern-dim--height {
  border-right: 2px solid #111;
}

.pattern-dim--height::before,
.pattern-dim--height::after {
  content: '';
  position: absolute;
  right: -6px;
  width: 0;
  height: 0;
  border-left: 8px solid #111;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}

.pattern-dim--height::before {
  top: -6px;
}

.pattern-dim--height::after {
  bottom: -6px;
  transform: rotate(180deg);
}

.pattern-dim__label {
  position: absolute;
  background: #fff;
  padding: 0 6px;
  left: 50%;
  transform: translateX(-50%);
  top: 6px;
}

.pattern-dim__label--vertical {
  left: auto;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
}

.pattern-slot {
  position: absolute;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
  background: transparent;
  padding: 0;
}

.pattern-slot--oval {
  border-radius: 999px;
}

.pattern-slot--circle,
.pattern-slot--smallCircle {
  border-radius: 50%;
}

.pattern-slot--smallCircle {
  border-width: 1px;
}

.pattern-slot--filled {
  border-color: rgba(0, 0, 0, 0.3);
}

.pattern-slot--flat {
  border-color: transparent;
}

.pattern-slot__label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.65rem;
  color: #2f2f2f;
  pointer-events: none;
  white-space: nowrap;
}

.tile-preview {
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 10px;
  background: #fafbfc;
  overflow: hidden;
}

.tile-preview__grid {
  position: relative;
  width: 100%;
  min-height: 120px;
}

.tile-preview__labels {
  position: absolute;
  pointer-events: none;
  font-size: 0.6rem;
  color: #6c757d;
}

.tile-preview__labels--top {
  top: -18px;
  left: 0;
}

.tile-preview__labels--left {
  left: -18px;
  top: 0;
}

.tile-preview__label {
  position: absolute;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.structure-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.structure-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 20, 0.4);
}

.structure-modal__panel {
  position: relative;
  margin: 5vh auto 0;
  background: #fff;
  width: min(920px, 92vw);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  padding: 16px;
}

.structure-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 12px;
}

.structure-modal__tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.structure-modal__actions {
  display: inline-flex;
  gap: 8px;
}

.structure-modal__zoom {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.structure-modal__presets {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.structure-modal__presets .form-select {
  min-width: 180px;
}

.structure-modal__body {
  margin-top: 16px;
  padding: 12px;
  border-radius: 16px;
  background: #f7f8fb;
  border: 1px solid rgba(0, 0, 0, 0.06);
  min-height: 380px;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  overflow: hidden;
}

.structure-modal__canvas {
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  cursor: grab;
}

.structure-modal__canvas:active {
  cursor: grabbing;
}

.structure-modal__stage {
  position: relative;
  transform-origin: 0 0;
}

.structure-modal__grid {
  min-height: 320px;
}

.tile-preview__slot {
  position: absolute;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: transparent;
}

.tile-preview__slot--oval {
  border-radius: 999px;
}

.tile-preview__slot--circle,
.tile-preview__slot--smallCircle {
  border-radius: 50%;
}

.pattern-slot--selected {
  box-shadow: 0 0 0 2px rgba(18, 164, 183, 0.5);
}

.pattern-slot--guide {
  background: transparent;
}

.grid-frame {
  display: grid;
  gap: 6px;
  cursor: grab;
}

.grid-frame:active {
  cursor: grabbing;
}

.grid-top {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), var(--cell-size));
  gap: var(--cell-gap);
  margin-left: calc(var(--cell-size) + var(--cell-gap));
}

.grid-body {
  display: grid;
  grid-template-columns: var(--cell-size) auto;
  gap: var(--cell-gap);
  position: relative;
  padding: 6px;
  border-radius: 12px;
}

.grid-body--guides {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px);
  background-size: calc(var(--cell-size) + var(--cell-gap)) calc(var(--cell-size) + var(--cell-gap));
  background-position: var(--cell-size) var(--cell-size);
}

.grid-stack {
  position: relative;
  display: inline-block;
}

.grid-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  transform: translate(var(--layer-offset-x, 0px), var(--layer-offset-y, 0px))
    scale(var(--layer-scale, 1));
  transform-origin: top left;
}

.grid-layer--base {
  position: relative;
  z-index: 1;
}

.grid-layer--inactive {
  pointer-events: none;
  opacity: 0.7;
}

.grid-layer--hidden {
  opacity: 0;
  pointer-events: none;
}

.grid-layer:not(.grid-layer--connector):not(.grid-layer--base) {
  z-index: 2;
}

.grid-layer:not(.grid-layer--inactive) {
  pointer-events: auto;
}

.grid-layer--connector {
  --layer-offset-x: calc((var(--cell-size) + var(--cell-gap)) / 2);
  --layer-offset-y: calc((var(--cell-size) + var(--cell-gap)) / 2);
  z-index: 3;
}

.grid-layer--back .grid-cell {
  opacity: 0.7;
}

.grid-layer--front .grid-cell {
  opacity: 1;
}

.grid-layer--connector .grid-cell {
  z-index: 3;
}

.grid-left {
  display: grid;
  grid-template-rows: repeat(var(--grid-rows), var(--cell-size));
  gap: var(--cell-gap);
}

.grid-label {
  width: var(--cell-size);
  height: var(--cell-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #6c757d;
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), var(--cell-size));
  gap: var(--cell-gap);
}

.grid-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(0, 0, 0, 0.08);
  transition: transform 0.08s ease;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stage-controls {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 18px -12px rgba(0, 0, 0, 0.2);
}

.stage-zoom {
  min-width: 48px;
  text-align: center;
  font-size: 0.8rem;
  color: #495057;
}

.work-actions .btn i + i {
  margin-left: 2px;
}

.shape-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.grid-cell--connector {
  transform: scale(0.6);
  border-width: 1px;
}

.grid-cell--guide-wall {
  background: transparent;
  border-color: rgba(0, 0, 0, 0.14);
}

.grid-cell--guide-wall::before {
  content: '';
  position: absolute;
  width: 90%;
  height: 70%;
  left: 5%;
  top: 15%;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
  border-radius: 999px;
  background: transparent;
}

.grid-cell--guide-wall::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(
      circle,
      transparent 60%,
      rgba(0, 0, 0, 0.18) 61%,
      rgba(0, 0, 0, 0.18) 75%,
      transparent 76%
    ),
    radial-gradient(
      circle,
      transparent 60%,
      rgba(0, 0, 0, 0.18) 61%,
      rgba(0, 0, 0, 0.18) 75%,
      transparent 76%
    ),
    radial-gradient(
      circle,
      transparent 60%,
      rgba(0, 0, 0, 0.18) 61%,
      rgba(0, 0, 0, 0.18) 75%,
      transparent 76%
    ),
    radial-gradient(
      circle,
      transparent 60%,
      rgba(0, 0, 0, 0.18) 61%,
      rgba(0, 0, 0, 0.18) 75%,
      transparent 76%
    );
  background-repeat: no-repeat;
  background-size: 8px 8px;
  background-position:
    50% 6%,
    50% 94%,
    6% 50%,
    94% 50%;
  opacity: 0.7;
  pointer-events: none;
}

.grid-cell--guide-connector {
  background: transparent;
  border-color: rgba(0, 0, 0, 0.16);
}

.grid-cell--guide-connector::before {
  content: '';
  position: absolute;
  inset: 30%;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
  border-radius: 999px;
}

.grid-layer--twisting .grid-cell {
  border-radius: 16px;
}

.grid-layer--special .grid-cell {
  border-radius: 10px;
}

.cell-label {
  font-size: 0.55rem;
  color: #5f6b7a;
  pointer-events: none;
}

.gap-control {
  display: grid;
  gap: 4px;
  min-width: 140px;
}

.grid-cell--size-6 {
  box-shadow: inset 0 0 0 2px rgba(13, 110, 253, 0.25);
}

.grid-cell--size-12 {
  box-shadow: inset 0 0 0 2px rgba(255, 159, 28, 0.25);
}

.grid-cell:hover {
  transform: scale(1.04);
}

.grid-cell--inactive {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  pointer-events: none;
}

.grid-cell--filled {
  border-color: rgba(0, 0, 0, 0.12);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}

.summary-label {
  color: #6c757d;
  font-size: 0.8rem;
}

.summary-value {
  font-weight: 600;
  text-align: right;
}

.type-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.type-summary__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.type-summary__name {
  font-size: 0.85rem;
}

.type-summary__qty {
  font-weight: 600;
}

@media (max-width: 1200px) {
  .grid-shell {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .grid-shell > .grid-panel:last-child {
    grid-column: span 2;
  }
}

@media (max-width: 900px) {
  .grid-shell {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
