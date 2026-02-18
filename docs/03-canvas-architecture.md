# Arquitectura del Canvas

## Componentes

- CanvasStage.vue
- ContextMenu.vue
- LayerPanel.vue

## Responsabilidades

CanvasStage:
- Renderizar stage
- Manejar zoom
- Manejar pan
- Manejar selección
- Manejar drag múltiple
- Conectar Transformer con selectedIds

## Reglas

- No guardar estado local duplicado.
- El watch del Transformer depende de store.selectedIds.
- Todos los shapes deben tener config.id.
- Eventos:
  - onNodeClick
  - onNodeDragMove
  - onStageClick (clear selection)
