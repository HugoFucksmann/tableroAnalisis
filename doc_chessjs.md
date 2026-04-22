


# Documentación Rápida: Implementación de `chess.js` (v1.0.0+)

**`chess.js`** es la librería estándar en JavaScript/TypeScript para gestionar todas las reglas y la lógica del ajedrez. 

**Nota crucial:** `chess.js` es **"headless"** (sin interfaz visual). Se encarga de validar movimientos, generar notaciones (FEN/PGN), detectar jaques/mates, etc., pero **no dibuja un tablero**. Se complementa perfectamente con librerías visuales como `react-chessboard`.

---

## 1. Instalación

Para instalar la versión más reciente (con soporte nativo para TypeScript):

```bash
npm install chess.js
# o
yarn add chess.js
```

---

## 2. Inicialización

Para usar la librería, debes importar e instanciar la clase `Chess`.

```javascript
import { Chess } from 'chess.js'; // Módulo ESM

// 1. Iniciar un juego nuevo (posición por defecto)
const game = new Chess();

// 2. Iniciar desde una posición específica usando notación FEN
const customGame = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
```

---

## 3. Métodos Principales (Core API)

A partir de la versión 1.0.0+, la sintaxis se ha modernizado (usando _camelCase_ en lugar de _snake_case_).

### ♟️ Movimientos
*   **`moves(options?)`**: Retorna un array con todos los movimientos legales desde la posición actual. 
    *   `game.moves()` ➡️ `['e4', 'd4', 'Nf3', ...]`
    *   `game.moves({ verbose: true })` ➡️ Devuelve objetos detallados (`{ from: 'e2', to: 'e4', piece: 'p', ... }`).
*   **`move(move)`**: Realiza un movimiento en el tablero. Acepta notación estándar (SAN) o un objeto. 
    *   **⚠️ Importante (v1.0.0+):** Si el movimiento es ilegal, **arroja una excepción (Error)** en lugar de devolver `null`.
    ```javascript
    try {
      game.move('e4'); // SAN estándar
      // o con un objeto:
      game.move({ from: 'g8', to: 'f6', promotion: 'q' });
    } catch (e) {
      console.log('Movimiento inválido');
    }
    ```
*   **`undo()`**: Deshace el último movimiento y retorna un objeto con el movimiento deshecho.

### 🏁 Estado del Juego
Retornan valores booleanos (`true` / `false`) evaluando la posición actual.
*   **`isGameOver()`**: `true` si el juego terminó (por cualquier razón).
*   **`isCheck()`**: `true` si el jugador que tiene el turno está en jaque.
*   **`isCheckmate()`**: `true` si el jugador actual recibió jaque mate.
*   **`isDraw()`**: `true` si es empate (por regla de 50 movimientos, material insuficiente, etc.).
*   **`isStalemate()`**: `true` si hay ahogado (el jugador no tiene movimientos legales pero no está en jaque).
*   **`isThreefoldRepetition()`**: `true` si la misma posición se repitió 3 veces.

### 📝 Formatos y Notación (FEN / PGN)
*   **`fen()`**: Retorna la posición actual del tablero en formato de texto FEN. Muy útil para sincronizar la lógica con el tablero visual.
*   **`pgn()`**: Retorna todo el registro de la partida (movimientos, cabeceras) en formato estándar PGN.
*   **`loadPgn(pgnString)`**: Carga una partida completa a partir de un string PGN.
*   **`history({ verbose?: boolean })`**: Retorna el array del historial de jugadas.

### 🔄 Manipulación del Tablero
*   **`put(piece, square)`**: Coloca una pieza directamente (ej: `{ type: 'p', color: 'w' }`, `'e4'`).
*   **`remove(square)`**: Quita la pieza de una casilla específica.
*   **`clear()`**: Vacía el tablero por completo.

---

## 4. Ejemplo Práctico (Integración con UI)

Este es un flujo clásico de cómo `chess.js` gestiona la lógica mientras interactúas con cualquier entorno (Vanilla o React).

```javascript
import { Chess } from 'chess.js';

// Inicializamos la instancia
const game = new Chess();

// Función que se ejecutaría al arrastrar/soltar una pieza en el tablero visual
function handleMove(sourceSquare, targetSquare) {
  try {
    // Intentamos hacer el movimiento
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Promovemos a reina automáticamente si es necesario
    });
    
    // Si no arrojó error, el movimiento fue válido.
    console.log(`Movimiento exitoso: ${move.san}`);
    
    // Comprobamos el estado posterior al movimiento
    if (game.isCheckmate()) {
      alert(`¡Jaque Mate! Ganan las ${game.turn() === 'w' ? 'Negras' : 'Blancas'}`);
    } else if (game.isDraw()) {
      alert("¡El juego termina en empate!");
    } else if (game.isCheck()) {
      console.log("¡Jaque!");
    }

    // Retornamos true para indicar a la UI que actualice la pieza
    return true;

  } catch (error) {
    // El movimiento fue ilegal
    console.warn("Movimiento inválido:", error.message);
    return false; // Indicamos a la UI que regrese la pieza a su origen
  }
}

// Para obtener el estado actual y enviarlo a tu librería visual (ej. react-chessboard)
const currentBoardPosition = game.fen();
```

---

## 5. Tips y Errores Comunes

1. **Mutabilidad en React:** Instancias como `const game = new Chess()` almacenan un estado mutable internamente. Si usas `chess.js` dentro de React, React no detectará que la partida cambió si solo llamas a `game.move()`. Siempre debes crear una nueva referencia clonando el FEN tras cada jugada válida: `setGame(new Chess(game.fen()))`.
2. **Cambios en V1.0.0 (`game_over` vs `isGameOver`):** Si estás leyendo tutoriales antiguos de ajedrez en JS (versiones pre-1.0), verás métodos con guiones bajos (`game.in_checkmate()`). En las versiones modernas **esto dará error**. Todo migró a `camelCase` (ej. `game.isCheckmate()`).
3. **Manejo de Errores Estricto:** Nunca asumas que `game.move()` devolverá `null` para movimientos inválidos en las versiones actuales. Usa siempre un bloque `try/catch` para capturar la excepción `'Invalid move'`.