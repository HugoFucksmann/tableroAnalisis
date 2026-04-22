# 🚀 Roadmap de Funcionalidades - Tablero de Análisis

Este documento lista las funcionalidades implementadas y las ideas a futuro para convertir este tablero en una herramienta de análisis de nivel profesional.

## 🟢 Implementado (Core)
- [x] **Motor Stockfish 16 (WASM)**: Análisis en tiempo real en el navegador.
- [x] **Arquitectura Modular**: Zustand Slices para una gestión de estado escalable.
- [x] **Importación de Partidas**: Conexión con APIs de Lichess y Chess.com.
- [x] **Opening Explorer**: Integración con la base de datos de maestros de Lichess.
- [x] **Gráfico de Evaluación**: Visualización interactiva del flujo de la partida.
- [x] **Barra de Evaluación**: Indicador dinámico de ventaja posicional.
- [x] **Filtros de Teoría**: Lógica inteligente para no saturar con jugadas "Book".
- [x] **Persistencia**: Guardado automático de tokens y preferencias.
- [x] **Rotación de Tablero**: Orientación manual y automática según el jugador.

---

## 🟡 Prioridad Alta (Próximamente)
### 1. Diálogo de Promoción
- [ ] Implementar popup para elegir entre Dama, Torre, Alfil o Caballo (actualmente auto-Dama).

### 2. Revisión de Errores (Mistake Review)
- [ ] Añadir botones para saltar directamente al siguiente Error, Imprecisión u Omisión.
- [ ] Resumen de precisión por fases (Apertura, Medio Juego, Final).

### 3. Visualización de Amenazas
- [ ] Toggle para mostrar flechas rojas con las amenazas inmediatas del oponente.

### 4. Sonidos de Partida
- [ ] Efectos de sonido para mover, capturar, jaque y fin de partida.

---

## 🔵 Prioridad Media (Mejoras de UX)
### 5. Análisis Multilínea (Multi-PV)
- [ ] Configurar Stockfish para mostrar las 3 mejores variantes simultáneamente.

### 6. Exportación Pro
- [ ] Botón para descargar PGN con comentarios de evaluación y etiquetas de Stockfish.

### 7. Temas Visuales
- [ ] Selector de temas para el tablero (Madera, Azul, Verde, Oscuro).
- [ ] Modo Oscuro/Claro para la interfaz completa.

---

## ⚪ Ideas a Futuro (Exploración)
- [ ] **PWA (Progressive Web App)**: Hacer la aplicación instalable y disponible offline.
- [ ] **Entrenamiento Personalizado**: Generar puzzles basados en los errores cometidos en las partidas importadas.
- [ ] **Base de Datos Local**: Guardar historial de análisis localmente usando IndexedDB.
- [ ] **Soporte Multilenguaje**: Traducción de etiquetas y menús.
