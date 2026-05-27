import React, { useMemo } from 'react';
import './AccuracyLineChart.css';

const WIDTH = 400;
const HEIGHT = 80;
const PADDING = 6;

// Función de Media Móvil para suavizar el gráfico reduciendo el ruido visual
const aplicarMediaMovil = (datos, ventana = 5) => {
  if (!datos) return [];
  return datos.map((d, index) => {
    const inicio = Math.max(0, index - Math.floor(ventana / 2));
    const fin = Math.min(datos.length, inicio + ventana);
    const subConjunto = datos.slice(inicio, fin);

    const suma = subConjunto.reduce((acc, curr) => acc + curr.accuracy, 0);
    const promedio = suma / subConjunto.length;

    return {
      ...d,
      accuracy: promedio // Reemplazamos por el valor suavizado
    };
  });
};

const AccuracyLineChart = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Suavizamos los datos antes de calcular las coordenadas x, y
    // Podés subir el número (ej. 7 u 8) si querés que sea todavía más curvo/suave
    const smoothedData = aplicarMediaMovil(data, 15);
    const total = smoothedData.length;

    const getY = (acc) => HEIGHT - ((acc / 100) * (HEIGHT - 2 * PADDING)) - PADDING;
    const getX = (index) => {
      if (total <= 1) return PADDING;
      return (index / (total - 1)) * (WIDTH - 2 * PADDING) + PADDING;
    };

    const pts = smoothedData.map((d, i) => ({
      x: getX(i),
      y: getY(d.accuracy),
      val: d.accuracy,
      key: `${d.accuracy}-${i}`,
    }));

    const linePts = pts.map(p => `${p.x},${p.y}`).join(' ');

    const first = pts[0];
    const last = pts[pts.length - 1];
    const areaP = [
      `M ${first.x} ${HEIGHT}`,
      ...pts.map(p => `L ${p.x} ${p.y}`),
      `L ${last.x} ${HEIGHT}`,
      'Z',
    ].join(' ');

    return { areaPath: areaP, linePoints: linePts, points: pts };
  }, [data]);

  if (!chartData) {
    return (
      <div className="no-data-chart">No hay suficientes datos para mostrar la tendencia</div>
    );
  }

  const { areaPath, linePoints, points } = chartData;

  return (
    <div className="line-chart-wrapper" style={{ height: '100px', marginTop: '10px' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="graph-svg"
      >
        <defs>
          <linearGradient id="accGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9800" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff9800" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#accGradient)" />

        <line
          x1={PADDING} y1={HEIGHT / 2}
          x2={WIDTH - PADDING} y2={HEIGHT / 2}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {points.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke="#ff9800"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {points.map((p) => (
          <circle
            key={p.key}
            cx={p.x}
            cy={p.y}
            r="1.2" // Achicado levemente para que acompañe la fluidez de la curva
            fill="#ff9800"
            style={{ opacity: 0.6 }}
          />
        ))}
      </svg>
    </div>
  );
};

export default React.memo(AccuracyLineChart);