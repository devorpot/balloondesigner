# Arquitectura de Estado (Pinia)

## Store principal: editor

### State

- nodes: array de elementos del canvas
- selectedId: id único (compatibilidad)
- selectedIds: array para selección múltiple
- view: { x, y, scale }
- settings: grid, snap, snapStep
- clipboard:
  - node
  - nodes
  - bbox
- autosave:
  - enabled
  - isDirty
  - lastSavedAt

---

## Reglas importantes

1. Nunca mutar nodos fuera del store.
2. Selección múltiple siempre usa selectedIds.
3. selectedId solo debe existir si selectedIds.length === 1.
4. El Transformer siempre depende de selectedIds.
5. No duplicar propiedades en state.
6. Los nodos deben tener id único y asignado a Konva config.
