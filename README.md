# ♟️ Tablero de Análisis de Ajedrez

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-5-443E38.svg)](https://github.com/pmndrs/zustand)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una plataforma de análisis de ajedrez de **alto rendimiento**, diseñada para ofrecer la potencia de un software de escritorio (`ChessBase`, `Stockfish`) con la accesibilidad de la web moderna.

![Dashboard Preview](src/assets/hero.png)

## ✨ Características Premium

*   **🚀 Motor Stockfish 18 (WASM)**: Análisis local ultra-rápido con soporte multihilo (SIMD).
*   **📥 Importación Inteligente**: Sincronización instantánea con perfiles de **Lichess** y **Chess.com**.
*   **📊 Gráfica de Tendencia**: Visualiza la ventaja a lo largo de la partida con navegación interactiva.
*   **🎯 Clasificación Inteligente**: Algoritmos de precisión que detectan jugadas *Brillantes*, *Mejores* y *Errores* basados en Win Probability.
*   **📖 Explorador de Teoría**: Integración profunda con la base de datos de Lichess (Master & Community).
*   **📱 PWA Ready**: Experiencia nativa instalable con soporte offline y notificaciones.
*   **📤 Exportación Enriquecida**: Genera PGNs anotados con evaluaciones del motor y comentarios.

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **UI Framework** | React 19 (Fiber Architecture) |
| **State Management** | Zustand 5 (Slice Pattern) |
| **Chess Logic** | Chess.js v1.4 |
| **Engine** | Stockfish 18 Multithreaded WASM |
| **Animations** | Framer Motion |
| **Styles** | Modern CSS (Variables, Glassmorphism) |

## 🚀 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/HugoFucksmann/tableroAnalisis.git

# 2. Instalar dependencias
npm install

# 3. Iniciar modo desarrollo
npm run dev
```

## 🏗️ Arquitectura del Sistema

El proyecto sigue una arquitectura de **Servicios Desacoplados** y **Estado Centralizado**. Para una inmersión profunda en las tripas del sistema (WinProb, Mutex de Análisis, Worker Isolation):

👉 [**Leer ARCHITECTURE.md](./ARCHITECTURE.md)**

## 🛡️ Despliegue y Seguridad

Debido al uso de `SharedArrayBuffer` para el multihilo de Stockfish, la aplicación requiere **Aislamiento de Origen Cruzado (COI)**.

Configuración incluida para:
- **Netlify** (`netlify.toml`)
- **Vercel** (`vercel.json`)
- **Vite** (`vite.config.js`)

---
Desarrollado con precisión técnica por **ElColof**.
