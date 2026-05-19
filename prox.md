Lo que el equipo de IT debe hacer es agregar una excepción de "Salida Directa"
  (Bypass) en el Firewall de la empresa.

  Para que Antigravity funcione, ellos deben permitir que tu computadora se conecte a
  internet sin pasar por el proxy (o con paso libre) para estos destinos específicos:

  Los datos que les tenés que pasar:

   1. Dominios (Whitelist):
       * *.googleapis.com (específicamente daily-cloudcode-pa.googleapis.com y
         cloudcode-pa.googleapis.com)
       * *.antigravity.google
   2. Protocolo:
       * HTTPS (Puerto 443)
       * Importante: Deben permitir tráfico gRPC. Algunos firewalls modernos filtran gRPC
         pensando que es tráfico sospechoso, pero Antigravity lo usa para que la IA "hable".
   3. Razón técnica:
       * La aplicación Antigravity utiliza un binario estático que no soporta autenticación
         vía Proxy HTTP (ignora las variables HTTP_PROXY). Por lo tanto, requiere una
         conexión directa (dial tcp) a los endpoints de Google Cloud Code.

  Resumen para IT: *"Necesito que mi IP tenga salida directa (sin proxy) al puerto 443 para
  los dominios de Google Cloud Code (`*.googleapis.com`), ya que la herramienta de desarrollo
  que uso no es compatible con el filtrado del proxy actual."*
