# ♟️ Chess Analysis Platform — Frontend

> Aplicación web SPA de alta fidelidad optimizada para el análisis interactivo de partidas de ajedrez, visualización de estadísticas avanzadas y gestión de repertorios tácticos mediante comunicación en tiempo real con motores de evaluación.

<p align="left">
  <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zustand_5-443E38?style=flat-square&logo=react&logoColor=white" alt="Zustand 5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Framer_Motion-F024B6?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion" />
</p>

Esta interfaz web traslada la potencia de una herramienta de análisis de escritorio al navegador web, controlando flujos de datos bidireccionales de alta frecuencia y asegurando un renderizado de tablero de alto rendimiento y baja latencia.

---

## 〉 Arquitectura del Sistema y Desafíos Técnicos

El desarrollo de la plataforma se centró en la optimización del rendimiento en el navegador y el manejo concurrente de estados complejos de juego:

*   **Sincronización mediante Puente de Análisis (Analysis Bridge):** Se implementó un patrón de diseño tipo *Mutex* gestionado por el cliente. Esto garantiza que las solicitudes de análisis en tiempo real (Live Engine) y análisis de partidas completas (Full Game) no interfieran entre sí, cancelando procesos previos de forma segura y evitando condiciones de carrera (*race conditions*).
*   **Aislamiento de Origen Cruzado (COOP/COEP):** Para permitir la ejecución del motor Stockfish en fallback local vía WebAssembly (WASM) multihilo, la aplicación expone cabeceras seguras (`Cross-Origin-Opener-Policy` y `Cross-Origin-Embedder-Policy`). Esto habilita al navegador el acceso a búferes de memoria compartida (`SharedArrayBuffer`), maximizando el aprovechamiento de la CPU local.
*   **Gestión de Estado Atómica con Zustand 5:** La manipulación de árboles de variantes y evaluaciones se gestiona mediante almacenes de datos atómicos. El uso de selectores optimizados evita renderizados en cascada en el tablero táctico ante actualizaciones de centipawns de alta frecuencia generadas por el WebSocket.
*   **Interoperabilidad Universal:** Módulos de integración con las APIs públicas de **Lichess** y **Chess.com** para importación inmediata de historiales, emparejado con un motor de parsing de PGN robusto capaz de reconstruir variantes secundarias y comentarios analíticos.

---

## 〉 Stack Tecnológico

| Capa | Tecnología | Implementación / Rol |
| :--- | :--- | :--- |
| **Frontend** | React 19 (Fiber) | Reconciliación de UI ágil y manejo de ciclo de vida del tablero |
| **Estado Global** | Zustand 5 | Estado atómico para variantes de jugadas, configuraciones y UI |
| **Comunicación** | WebSockets (Socket.io-client) | Consumo de flujos de análisis de subprocesos externos |
| **Visualización** | Tailwind CSS & Framer Motion | Animaciones de interfaz, transformaciones del tablero y Glassmorphism |
| **Lógica de Ajedrez** | Chess.js (v1.4) | Motor de reglas, generación de movimientos legales y estado PGN/FEN |
| **Optimización** | COOP/COEP Config | Soporte nativo para hilos compartidos WASM en despliegues estáticos |

---

## 〉 Flujo de Renderizado y Sincronización Mutex

```text
[ Interfaz de Usuario ] ──▶ [ Intento de Movimiento ] ──▶ [ Validación Legal (Chess.js) ]
         ▲                                                             │
         │                                                             ▼
         │                                               [ Cancelación de Análisis Activo ]
         │                                                             │
         │                                                             ▼
  [ Dibujar Tablero ] ◀─── [ WebSocket Event: Progress ] ◀─── [ Enviar FEN por Socket ]
```

---

## 〉 Estructura del Proyecto

La base de código prioriza el desacoplamiento de la lógica del tablero del estado visual de la aplicación, facilitando su escalabilidad y testing:

```text
tableroAnalisis/
├── public/                 # Recursos estáticos (sonidos de piezas, assets gráficos)
├── src/
│   ├── api/                # Integraciones HTTP con plataformas externas (Chess.com, Lichess)
│   ├── components/         # Componentes de interfaz estructurados por contexto
│   │   ├── board/          # Renderizador de tablero y controles tácticos de entrada
│   │   ├── dashboard/      # Paneles gráficos de rendimiento y visualización de Big Data
│   │   └── sidebar/        # Configuración del motor, hilos, profundidad y líneas múltiples
│   ├── hooks/              # Custom hooks de control (WebSockets, atajos de teclado, audio)
│   ├── lib/                # Utilidades de conversión de formatos, parseo de PGN y comentarios
│   ├── store/              # Almacenes de Zustand divididos por dominio (game, engine, UI)
│   ├── App.jsx             # Punto de entrada de renderizado reactivo
│   └── main.jsx            # Configuración de inicialización y wrappers globales
├── vercel.json             # Cabeceras de seguridad COOP/COEP para despliegues en Vercel
└── netlify.toml            # Cabeceras de seguridad COOP/COEP para despliegues en Netlify
```

---

## 〉 Características Funcionales Destacadas

*   **Dashboard Estadístico Avanzado:** Gráficos e indicadores interactivos que exponen métricas clave del jugador: precisión de juego agregada, efectividad por apertura, distribución de tipos de error y patrones de errores asociados a la gestión del tiempo.
*   **Academia de Puzzles Integrada:** El cliente filtra localmente los análisis guardados en base de datos para identificar jugadas fallidas, aislando el tablero y proponiendo problemas de resolución interactiva basados en los errores reales del usuario.
*   **Anotación Automática y Exportación:** Módulo de exportación que analiza las evaluaciones de Stockfish y compila un archivo PGN estándar enriquecido con la nomenclatura internacional de anotación de ajedrez (e.g., `!!` Excelente, `??` Error Grave) junto con evaluaciones numéricas adjuntas en formato de comentario.

---

## 〉 Configuración e Instalación

### Requisitos Previos
*   Node.js v20 o superior
*   Instancia del [backend de análisis](https://github.com/HugoFucksmann/backendTablero) ejecutándose localmente o en un servidor accesible.

### Pasos de Instalación

1.  Clonar el repositorio e instalar dependencias del proyecto:
    ```bash
    git clone https://github.com/HugoFucksmann/tableroAnalisis.git
    cd tableroAnalisis
    npm install
    ```
2.  Configurar la URL de conexión WebSocket creando un archivo `.env` en el directorio raíz:
    ```env
    VITE_BACKEND_URL=ws://localhost:9001
    ```
3.  Iniciar el entorno local de desarrollo:
    ```bash
    npm run dev
    ```

La aplicación compilará los módulos de forma optimizada y levantará el cliente web, conectándose de manera asíncrona al servicio de análisis configurado.