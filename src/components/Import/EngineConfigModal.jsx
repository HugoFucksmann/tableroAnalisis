import React from 'react';
import { X, Cpu, Layers, Hash, Gauge } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import './EngineConfigModal.css';

const DEFAULT_CONFIG = {
  depth: 18,
  multiPv: 1,
  threads: 2,
  hash: 32,
};

export const EngineConfigModal = ({ onClose }) => {
  const { engineConfig, setEngineConfig } = useGameStore(useShallow(state => ({
    engineConfig: state.engineConfig,
    setEngineConfig: state.setEngineConfig,
  })));

  // Merge with defaults to handle missing keys from old persisted state
  const config = { ...DEFAULT_CONFIG, ...engineConfig };

  const handleChange = (key, value) => {
    setEngineConfig({ ...config, [key]: value });
  };

  const handleReset = () => {
    setEngineConfig(DEFAULT_CONFIG);
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const maxThreads = Math.max(1, (navigator.hardwareConcurrency ?? 4) - 1);

  return (
    <div className="ecm-backdrop" onClick={handleBackdrop}>
      <div className="ecm-modal" role="dialog" aria-modal="true" aria-label="Configuración del motor">

        {/* Header */}
        <div className="ecm-header">
          <div className="ecm-header-title">
            <Cpu size={15} className="ecm-header-icon" />
            <span>Motor de Análisis</span>
          </div>
          <button className="ecm-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={15} />
          </button>
        </div>

        {/* Engine badge */}
        <div className="ecm-engine-badge">
          <div className="ecm-badge-dot" />
          <span className="ecm-badge-name">Stockfish 18 Lite</span>
          <span className="ecm-badge-tag">WASM</span>
        </div>

        {/* Config items */}
        <div className="ecm-body">

          {/* Depth */}
          <ConfigRow
            icon={<Gauge size={14} />}
            label="Profundidad"
            description="Semijugadas que analiza el motor"
            value={config.depth}
            min={10}
            max={25}
            step={1}
            onChange={(v) => handleChange('depth', v)}
            formatValue={(v) => `${v} ply`}
            colorClass="accent-blue"
          />

          {/* MultiPV */}
          <ConfigRow
            icon={<Layers size={14} />}
            label="Líneas alternativas"
            description="Cantidad de variantes por posición"
            value={config.multiPv}
            min={1}
            max={5}
            step={1}
            onChange={(v) => handleChange('multiPv', v)}
            formatValue={(v) => v === 1 ? '1 línea' : `${v} líneas`}
            colorClass="accent-purple"
          />

          {/* Threads */}
          <ConfigRow
            icon={<Cpu size={14} />}
            label="Hilos CPU"
            description={`Núcleos disponibles: ${navigator.hardwareConcurrency ?? '?'}`}
            value={Math.min(config.threads, maxThreads)}
            min={1}
            max={maxThreads}
            step={1}
            onChange={(v) => handleChange('threads', v)}
            formatValue={(v) => v === 1 ? '1 hilo' : `${v} hilos`}
            colorClass="accent-green"
          />

          {/* Hash */}
          <ConfigRow
            icon={<Hash size={14} />}
            label="Memoria Hash"
            description="Tabla de transposición del motor"
            value={config.hash}
            min={16}
            max={256}
            step={16}
            onChange={(v) => handleChange('hash', v)}
            formatValue={(v) => `${v} MB`}
            colorClass="accent-orange"
          />

        </div>

        {/* Footer */}
        <div className="ecm-footer">
          <p className="ecm-footer-note">
            Los cambios se aplican al iniciar el próximo análisis.
          </p>
          <button className="ecm-reset-btn" onClick={handleReset}>
            Restablecer
          </button>
        </div>

      </div>
    </div>
  );
};

/* ── Sub-component: ConfigRow ────────────────────────────────── */
const ConfigRow = ({ icon, label, description, value, min, max, step, onChange, formatValue, colorClass }) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="ecm-row">
      <div className="ecm-row-header">
        <span className={`ecm-row-icon ${colorClass}`}>{icon}</span>
        <div className="ecm-row-labels">
          <span className="ecm-row-label">{label}</span>
          <span className="ecm-row-desc">{description}</span>
        </div>
        <span className={`ecm-row-value ${colorClass}`}>{formatValue(value)}</span>
      </div>
      <div className="ecm-slider-wrap">
        <input
          className={`ecm-slider ${colorClass}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ '--pct': `${pct}%` }}
        />
        <div className="ecm-slider-ticks">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
};
