# 📝 Lista de Pendientes (Technical Audit TODOs)

Esta lista contiene las mejoras, correcciones y deudas técnicas identificadas durante la auditoría técnica completa del proyecto.

## 🔴 Prioridad Alta (Crítico / Bugs)

- [ ] **Refactorizar Store (Redundancia):** Eliminar propiedades de análisis en `gameSlice.js` (`evaluationHistory`, `moveEvaluations`, etc.) y consolidarlas en `analysisSlice.js`. Actualmente hay riesgo de desincronización.
- [ ] **Error Boundaries:** Implementar componentes de Error Boundary en secciones críticas (Tablero, Gráfica) para evitar cierres inesperados de la aplicación por errores en librerías externas.
- [ ] **AbortController en API:** Añadir soporte para cancelar peticiones de red en `fetchOpeningExplorer` y `fetchLichessGames` en `gameApi.js`.
- [ ] **Pieza de Promoción:** Permitir al usuario elegir la pieza de promoción en `Board.jsx` (actualmente siempre es 'q').

## 🟡 Prioridad Media (Optimización / UX)

- [ ] **Responsividad Dinámica:** Convertir `isMobileViewport` en `Dashboard.jsx` en un hook de escucha (`useWindowSize`) para que los paneles se colapsen/expandan automáticamente al redimensionar.
- [ ] **Caché de Relojes:** Pre-calcular los relojes durante el proceso de `loadPgn` en lugar de iterar sobre todo el historial en cada movimiento dentro del hook `useAnalysisSync`.
- [ ] **Análisis de Apertura Paralelo:** Optimizar `OpeningService.js` para realizar peticiones en lotes (si la API lo permite) o mejorar la velocidad de detección de libros en partidas largas.
- [ ] **Magic Numbers:** Eliminar el `setTimeout` de 300ms en `useAnalysisSync.js` y reemplazarlo por una lógica basada en estados de carga o promesas.

## 🟢 Prioridad Baja (Mantenimiento / Calidad)

- [ ] **Migración a TypeScript:** Iniciar la migración de archivos `.js`/`.jsx` a `.ts`/`.tsx` para ganar seguridad de tipos, especialmente en las reglas de evaluación y interfaces de Stockfish.
- [ ] **Validación de FEN:** Añadir una capa de validación más robusta para FENs personalizados antes de enviarlos a Stockfish.
- [ ] **Sonidos Personalizados:** Permitir desactivar los sonidos de ajedrez desde la `uiSlice`.
- [ ] **Documentación de API:** Completar `apilichessdoc.md` con ejemplos de respuestas reales para facilitar el desarrollo de nuevas características.

## 🔍 Validaciones Técnicas de la Auditoría
### [V-01] Fuga de Promesas en StockfishService
- **Estado:** Confirmado.
- **Detalle:** `destroy()` termina el proceso pero deja la `Promise` de `analyzePosition` colgada.
- **Fix:** `destroy()` debe disparar un rechazo (`reject`) en todos los resolvers activos antes de limpiar la lista.
### [V-02] Bloqueo de Renderizado en AnalysisQueue
- **Estado:** Confirmado.
- **Detalle:** `#tryResolveMove` es demasiado estricto. Impide mostrar resultados del motor si la API de aperturas está pendiente.
- **Fix:** Permitir la resolución parcial: mostrar la evaluación del motor inmediatamente y actualizar el label de "Libro" asíncronamente cuando llegue el dato de la API.
### [V-03] Colisión de Propiedades en Zustand
- **Estado:** Confirmado.
- **Detalle:** El spread de slices causa que `gameSlice` y `analysisSlice` compitan por las mismas keys.
- **Fix:** Mover toda la lógica de gestión de `evaluationHistory` y `moveEvaluations` a `analysisSlice.js`. `gameSlice` solo debe disparar acciones, no mutar ese estado.

*Auditado el 26 de abril de 2026.*
