import React, { useMemo } from 'react';
import './AccuracyLineChart.css';


const WIDTH = 400;
const HEIGHT = 80;
const PADDING = 6;

const AccuracyLineChart = ({ data }) => {
  // ✅ FIX (rules-of-hooks): useMemo debe llamarse siempre, en el mismo orden,
  // sin importar las condiciones. Se movió ANTES de cualquier return condicional.
  // Internamente retorna null cuando no hay datos.
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const total = data.length;
    const getY = (acc) => HEIGHT - ((acc / 100) * (HEIGHT - 2 * PADDING)) - PADDING;
    const getX = (index) => {
      if (total <= 1) return PADDING;
      return (index / (total - 1)) * (WIDTH - 2 * PADDING) + PADDING;
    };

    const pts = data.map((d, i) => ({
      x: getX(i),
      y: getY(d.accuracy),
      val: d.accuracy,
      // ✅ FIX (array-index-as-key): clave estable basada en datos reales.
      // Si d tiene un id propio, usarlo aquí es aún mejor.
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

        {/* ✅ FIX (array-index-as-key): key derivada del valor + posición, no solo índice */}
        {points.map((p) => (
          <circle
            key={p.key}
            cx={p.x}
            cy={p.y}
            r="1.5"
            fill="#ff9800"
            style={{ opacity: 0.8 }}
          />
        ))}
      </svg>
    </div>
  );
};

export default React.memo(AccuracyLineChart);