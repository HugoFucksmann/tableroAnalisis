# ♟️ Tablero de Análisis de Ajedrez Pro

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-5-443E38.svg)](https://github.com/pmndrs/zustand)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF.svg?logo=framer)](https://www.framer.com/motion/)
[![Lucide](https://img.shields.io/badge/Lucide-Icons-orange.svg)](https://lucide.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una plataforma de análisis de ajedrez de **alto rendimiento**, diseñada para ofrecer la potencia de un software de escritorio con la elegancia y accesibilidad de la web moderna.

![Dashboard Preview](src/assets/hero.png)

## ✨ Características Premium

- **🚀 Motor Dual Inteligente**: Alterna sin interrupciones entre **Stockfish 18 WASM** (multihilo en navegador) y un **Motor Nativo** remoto vía WebSockets para potencia extrema.
- **📊 Análisis de Precisión**: Algoritmo avanzado que clasifica cada jugada como *Brillante*, *Genial*, *Mejor*, *Inexactitud*, *Error* o *Blunder* basado en variaciones de probabilidad de victoria (WinProb).
- **🧩 Academia de Puzzles**: Genera automáticamente problemas tácticos basados exclusivamente en **tus propios errores** en partidas reales.
- **📥 Importación Universal**: Sincronización instantánea con **Lichess** y **Chess.com** mediante nombres de usuario o archivos PGN/FEN.
- **📈 Gráfica de Evaluación Dinámica**: Visualización interactiva de la ventaja que permite saltar a momentos críticos de la partida con un click.
- **📖 Explorador de Teoría**: Integración con la Master Database de Lichess para estudiar aperturas y ver qué juegan los Grandes Maestros.
- **✨ Estética Modernista**: Interfaz basada en *Glassmorphism*, animaciones fluidas con Framer Motion y soporte completo para temas oscuros premium.

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | React 19 (Fiber Architecture) |
| **Estado** | Zustand 5 (Slice Pattern & Persistence) |
| **Motor Web** | Stockfish 18 (Multithreaded WASM + SharedArrayBuffer) |
| **Interfaz** | Framer Motion & CSS Moderno (Custom Properties) |
| **Iconografía** | Lucide React |
| **Lógica Ajedrez** | Chess.js v1.4 |

## 🚀 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/HugoFucksmann/tableroAnalisis.git

# 2. Instalar dependencias
npm install

# 3. Iniciar entorno de desarrollo
npm run dev
```

> [!IMPORTANT]
> Para utilizar el **Motor Nativo**, asegúrate de tener el [Backend](https://github.com/HugoFucksmann/backendTablero) ejecutándose localmente.

## 🏗️ Arquitectura y Rendimiento

El sistema utiliza un **Análisis Mutex** para evitar colisiones entre el motor WASM y el remoto, asegurando que los recursos de tu PC se utilicen de forma óptima. El estado se gestiona de forma centralizada pero desacoplada, permitiendo una navegación fluida incluso durante cálculos intensivos.

## 🛡️ Configuración de Seguridad (COOP/COEP)

Debido al uso de `SharedArrayBuffer` para el multihilo de Stockfish, la aplicación requiere **Aislamiento de Origen Cruzado (COI)**.

Configuración optimizada incluida para:
- **Netlify**: `netlify.toml`
- **Vercel**: `vercel.json`
- **Vite**: `vite.config.js`

---
Diseñado y desarrollado con precisión técnica por **ElColof**.
