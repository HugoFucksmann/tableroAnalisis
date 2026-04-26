# ♟️ Tablero de Análisis de Ajedrez

Una aplicación web moderna y profesional para el análisis de partidas de ajedrez, diseñada para ofrecer la experiencia de un software de escritorio con la flexibilidad de la web.

![Dashboard Preview](src/assets/hero.png)

## 🚀 Características Principales

- **Análisis en Tiempo Real**: Integración con **Stockfish 18 WASM** ejecutándose localmente en tu navegador.
- **Importación Directa**: Carga tus partidas de **Lichess** y **Chess.com** simplemente ingresando tu nombre de usuario.
- **Explorador de Aperturas**: Conexión con la base de datos de Lichess para identificar teoría y estadísticas de jugadas.
- **Gráfica de Evaluación**: Visualización dinámica de la ventaja a lo largo de la partida.
- **Clasificación de Jugadas**: Identificación automática de jugadas *Brillantes*, *Mejores*, *Excelentes*, *Imprecisiones* y *Errores*.
- **PWA (Progressive Web App)**: Instálala en tu escritorio o móvil y úsala con rendimiento nativo.
- **Exportación PGN**: Descarga tus análisis con comentarios detallados y evaluaciones del motor.

## 🛠️ Tecnologías

- **Frontend**: React 19, Vite 8, Framer Motion.
- **Estado**: Zustand 5.
- **Ajedrez**: Chess.js, React-Chessboard.
- **Motor**: Stockfish 18 (Multithreaded WASM).

## 📦 Instalación y Uso

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/HugoFucksmann/tableroAnalisis.git
   cd tableroAnalisis
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Construir para producción:**
   ```bash
   npm run build
   ```

## 📖 Documentación Técnica

Para una inmersión profunda en la arquitectura del sistema, el flujo de datos y las decisiones de diseño, consulta nuestro archivo:
👉 [**ARCHITECTURE.md](./ARCHITECTURE.md)**

## 🛡️ Configuración de Seguridad
La aplicación requiere un entorno con `Cross-Origin Isolation` para habilitar el soporte de múltiples hilos en Stockfish. Asegúrate de que tu servidor de hosting soporte las cabeceras `COOP` y `COEP`.

---
Desarrollado con ❤️ por ElColof.
