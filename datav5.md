Ahora sí tengo todo claro. El issue #176 de GitHub confirma que react-chessboard (Clariity, la que usás) en sus versiones recientes todavía usa props directas, NO el objeto options. Pero el README del repositorio principal (v5.6.x) dice que usa options={{...}}. Hay una bifurcación entre el repo Clariity (v5, nueva API con options) y forks anteriores que usan props directas.
Lo que tu agente describió, y lo que usás ("react-chessboard": "^5.10.0"), es el Clariity v5 con options={{}}.
Voy a revisar los nombres exactos de las keys dentro de options en v5:Se buscó en la webSe buscó en la webAhora tengo todo lo que necesito. La v5 de react-chessboard es un rewrite completo anunciado en junio 2025 como beta fmhy, y la nueva API de v5 usa un prop options único en lugar de props individuales, con keys como squareStyles, onPieceDrop, showNotation, animationDurationInMs unpkg. Eso confirma que tu código está bien estructuralmente, pero los nombres de las keys cambiaron en v5. Voy a inspeccionar el paquete instalado directamente para obtener los nombres exactos:Se ejecutaron 6 comandosSe ejecutaron 6 comandosPerfecto. Ahora tengo la API exacta de v5.10.0. Los cambios críticos son:

customArrows → arrows (y es Arrow[] con objetos {startSquare, endSquare, color}, NO arrays)
customSquareStyles → squareStyles
customDarkSquareStyle → darkSquareStyle
customLightSquareStyle → lightSquareStyle
animationDuration → animationDurationInMs
onPieceDrop recibe { piece, sourceSquare, targetSquare } (targetSquare puede ser null)
boardOrientation se mantiene igual

Ahora genero los dos archivos completos corregidos:Se crearon 2 archivos, archivo leídoSe crearon 2 archivos, archivo leídoAcá tenés los dos archivos listos. Bajé e inspeccioné el paquete react-chessboard@5.10.0 directamente para sacar los tipos exactos del archivo ChessboardProvider.d.ts. Los cambios reales de v5 que estaban rompiendo todo:
En Board.jsx:

customArrows → arrows dentro de options
customSquareStyles → squareStyles
customDarkSquareStyle → darkSquareStyle
customLightSquareStyle → lightSquareStyle
animationDuration → animationDurationInMs
El formato de cada flecha cambió de ['e2','e4','color'] a { startSquare, endSquare, color }
onPieceDrop ahora guarda targetSquare como null si se suelta fuera del tablero (agregué el guard)

En OpeningExplorer.jsx:

sanToArrow actualizado para devolver el objeto { startSquare, endSquare, color } de v5
Agregué la lógica que compara la jugada actual contra los movimientos de Lichess y llama a setMoveEvaluation(currentMoveIndex, 'Libro') — esto es lo que faltaba para el emoji 📖
Agregué setMoveEvaluation e history al destructuring del store
Las flechas de libro se muestran al cargar datos (las 3 principales en tenue) y se limpian al salir del explorador