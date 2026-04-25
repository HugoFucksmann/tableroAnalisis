# TAREA: Implementar Sistema de Generación de Packs de Puzzles por Errores

El objetivo es crear una funcionalidad que permita al usuario analizar un lote de partidas (10-15) de forma automática, detectar errores tácticos graves y guardarlos como un "Pack de Puzzles" para practicar después.

## Requisitos Técnicos:
1. **Servicio de Lote**: Crear `src/services/batchAnalysisService.js`. Debe tomar una lista de partidas, llamar a `analysisQueue.analyzeGame` de forma secuencial (esperando que una termine antes de empezar la otra) y recolectar los resultados.
2. **Extractor de Puzzles**: Crear `src/utils/puzzleExtractor.js`. Esta función debe filtrar los movimientos analizados. Un movimiento califica como puzzle si:
   - Su etiqueta es 'Error' o 'Grave Error'.
   - La evaluación antes del error estaba en el rango [-2.0, 2.0] (no crear puzzles de partidas ya decididas).
   - Guardar el FEN previo, la jugada correcta (bestMove) y la info de la partida.
3. **Persistencia**: Los packs generados deben guardarse en `localStorage` a través de un nuevo estado en `useGameStore.js` llamado `puzzlePacks`.
4. **UI de Generación**: En `GameImport.jsx`, añadir un botón "Generar Pack de Entrenamiento" que analice las partidas cargadas en la lista actual.
5. **Modo Trainer**: Crear un componente `src/components/Training/PuzzleTrainer.jsx`. Cuando se activa un pack, la UI debe cambiar para mostrar solo el tablero. 
   - El usuario debe mover. 
   - Si el movimiento coincide con `bestMove`, mostrar feedback de éxito y pasar al siguiente.
   - Si falla, permitir reintentar o ver la solución.

## Consideraciones:
- No satures el CPU: asegúrate de que el análisis sea secuencial.
- Actualiza el `AnalysisLoadingModal` para mostrar el progreso del lote (ej: "Partida X de Y").
- Mantén el diseño estético premium usando las variables de `index.css`.

Usa los servicios existentes (`stockfishService`, `analysisQueue`, `useGameStore`) como base.
