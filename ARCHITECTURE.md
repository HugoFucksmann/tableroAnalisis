# Tablero de Análisis de Ajedrez - Arquitectura Finalizada

Este documento detalla la estructura modular, las tecnologías y el flujo de datos del proyecto tras la fase de diseño de interfaz.

## 🚀 Tecnologías Core

| Categoría | Tecnología | Detalles |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) | SPA de alto rendimiento. |
| **Lógica de Ajedrez** | [chess.js](https://github.com/jhlywa/chess.js) | Motor de reglas, validación y gestión de PGN/FEN. |
| **Interfaz del Tablero** | [react-chessboard](https://github.com/Clariity/react-chessboard) | Componente visual reactivo y personalizable. |
| **Estado Global** | [Zustand](https://github.com/pmndrs/zustand) | Store centralizado para sincronización en tiempo real. |
| **Motor de Análisis** | Stockfish.js | Ejecución en Web Worker para análisis local sin latencia. |
| **Iconografía** | Lucide React | Set de iconos consistentes y ligeros. |
| **Estilos** | CSS Moderno | Uso de variables HSL, Glassmorphism y Grid Layout. |

## 🏗️ Estructura de Carpetas

```text
src/
├── components/
│   ├── Analysis/
│   │   ├── EvaluationBar      # Barra lateral de ventaja (+/-)
│   │   ├── EvaluationGraph    # Gráfico de tendencia de la partida
│   │   └── OpeningExplorer    # Estadísticas de Lichess DB y filtros ELO
│   ├── Board/
│   │   ├── Board              # Tablero principal con relojes
│   │   └── BoardControls      # Navegación (<< < > >>) y utilidades
│   ├── History/
│   │   └── MoveList           # Visor de PGN con iconos de piezas y valoración
│   ├── Import/
│   │   └── GameImport         # Selector de plataforma (Lichess/Chess.com)
│   └── Layout/
│       └── Dashboard          # Contenedor principal (Grid 1fr 400px)
├── store/
│   └── useGameStore           # Cerebro de la app (Estado, Historia, Eval)
├── services/
│   ├── lichessService         # Cliente API Lichess (Opening Explorer)
│   ├── chessComService        # Cliente API Chess.com (Games)
│   └── stockfishService       # Orquestador del Web Worker
└── utils/
    └── mockData               # Datos de prueba para desarrollo offline
```

## 🧠 Gestión de Estado (Zustand)

El `useGameStore` centraliza la verdad única de la aplicación:
- **Game State:** Instancia de `Chess`, FEN actual e historial completo.
- **Análisis:** Valoración numérica, historial de evaluación (para el gráfico) y sugerencias.
- **Navegación:** Índice del movimiento actual para sincronizar UI y Gráfico.
- **Importación:** Lista de partidas recuperadas y plataforma seleccionada.

## 📡 Integración de APIs (Lichess Opening Explorer)

Basado en la documentación técnica de Lichess, la integración seguirá estas reglas:

### Autenticación
- Requiere **Personal Access Token (PAT)** enviado en la cabecera:
  `Authorization: Bearer <TOKEN>`

### Endpoints
- **Maestros:** `https://explorer.lichess.ovh/master`
- **Comunidad:** `https://explorer.lichess.ovh/lichess` (Filtros por ELO y ritmo).
- **Jugador:** `https://explorer.lichess.ovh/player?player={user}&color={white|black}`

### Datos a Extraer
- **Métricas por jugada:** SAN (notación), UCI, victorias/tablas/derrotas.
- **Metadatos:** Nombre de la apertura, código ECO, ELO promedio y performance.
- **Partidas Reales:** Array de `topGames` para referencia histórica.

## ✨ Experiencia de Usuario (UX)
1.  **Tablero Masivo:** Ocupa el máximo espacio disponible (aspect-ratio 1:1).
2.  **Visualización Pro:** Iconos de valoración (Brillante, Error grave, etc.) en el historial.
3.  **Gráfico Interactivo:** Permite visualizar la "montaña rusa" de la partida y saltar a momentos críticos.
4.  **Minimalismo:** Eliminación de headers innecesarios y reducción de paddings para un enfoque 100% analítico.
