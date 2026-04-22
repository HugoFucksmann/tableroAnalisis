Documentación técnica: API Lichess (Opening Explorer)
Resumen de acceso
El endpoint de Opening Explorer ya no permite consultas anónimas. Es obligatorio enviar un Token de Acceso Personal en cada solicitud.
Autenticación (Header)
Toda petición HTTP debe incluir la siguiente cabecera de autenticación:
Authorization: Bearer <TU_TOKEN>
Nota: Obtén tu token en .
Endpoints disponibles
Juegos de usuarios: https://explorer.lichess.ovh/lichess
Juegos de Maestros: https://explorer.lichess.ovh/master
Parámetros de consulta (Query Params)
fen (Obligatorio): Notación FEN de la posición (debe estar codificada para URL).
ratings (Opcional): Filtro de Elo. Se aceptan valores separados por comas. Ejemplo: 1600,1800,2000.
speeds (Opcional): Ritmos de juego. Ejemplo: blitz,rapid,classical.
Respuesta esperada (JSON)
La API devuelve un JSON con:
opening: Información sobre el nombre de la apertura (si es una posición de libro) y código ECO.
moves: Array de objetos con:
uci: Movimiento en formato UCI.
white, draws, black: Conteo de partidas por resultado.
Consideraciones de uso (Rate Limiting)
Lichess impone límites de velocidad para garantizar la estabilidad.
Si recibes un código 429 (Too Many Requests), debes esperar un minuto antes de realizar nuevas peticiones.


2. Autenticación (Header)
Dato faltante: Te faltó incluir la URL donde el usuario puede obtener su token.
Texto para añadir: "Puedes generar tu Token de Acceso Personal (PAT) directamente en las preferencias de tu cuenta de Lichess desde: https://lichess.org/account/security/api-tokens[3]. (Nota: para el Opening Explorer, un token con permisos de lectura básicos o incluso sin scopes específicos es suficiente, a menos que busques juegos privados)."
3. Endpoints disponibles
Dato faltante: Además de los juegos de la comunidad (/lichess) y los maestros (/master), existe un tercer endpoint principal para explorar la base de datos de un usuario en concreto[4].
Texto para añadir:
Juegos de un jugador específico: https://explorer.lichess.ovh/player (Este endpoint requiere los parámetros obligatorios player y color[5]).
Nota sobre infraestructura: Debido a actualizaciones en 2026, si experimentas problemas con el dominio .ovh, Lichess también soporta las consultas equivalentes bajo el subdominio https://explorer.lichess.org[6].
4. Parámetros de consulta (Query Params)
Corrección técnica: El parámetro fen no es estrictamente obligatorio[4]. Si lo omites, la API asume automáticamente que estás consultando la posición inicial del tablero.
Datos faltantes (agrega estos parámetros opcionales a tu lista):
variant (Opcional): Permite buscar en variantes de ajedrez (ej. standard, chess960, atomic). El valor por defecto es standard[5].
play (Opcional): Recibe una lista de movimientos separados por comas en formato UCI (ej. e2e4,c7c5)[4]. Es extremadamente útil para navegar en profundidad sin tener que generar y codificar en URL el código FEN en cada jugada[4][5].
since / until (Opcional): Filtra las partidas por un rango de fechas (en formato YYYY-MM). Exclusivo del endpoint /lichess[7].
Para el endpoint /player: player=<usuario> (obligatorio en dicho endpoint) y color=<white|black> (filtra la base de datos desde la perspectiva del color con el que jugó el usuario)[4].
5. Respuesta esperada (JSON)
Datos faltantes en la estructura JSON: El array moves devuelve métricas adicionales muy valiosas que deberías documentar. Asimismo, la respuesta devuelve partidas de ejemplo.
Texto para añadir:
En el objeto principal (raíz de la respuesta JSON), la API también te da los totales globales de la posición consultada (white, draws, black) sin contar los hijos [5].
En el array de objetos moves, además del UCI y los resultados, se incluye:
san: El movimiento en Notación Algebraica Estándar (ej. "Nf3"), ideal para mostrar en la interfaz de usuario [5].
averageRating: El Elo promedio de los jugadores que realizaron ese movimiento [5].
performance: El rendimiento (performance rating) calculado en base a ese movimiento [5].
Partidas destacadas: La respuesta también incluye los arrays topGames y recentGames[8], los cuales contienen un listado de partidas relevantes jugadas en esa posición con detalles como id, ganadores (winner), información de los jugadores (white, black) y el año (year).