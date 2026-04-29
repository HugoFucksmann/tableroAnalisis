import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Cpu, Layers, Hash, Gauge, Server, Laptop } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { backendService } from '../../services/backendService';
import './EngineConfigModal.css';

const DEFAULT_CONFIG = {
  engineMode: 'local',
  depth: 18,
  multiPv: 1,
  liveDepth: 16,
  liveMultiPv: 3,
  threads: 2,
  hash: 32,
};

export const EngineConfigModal = ({ onClose }) => {
  const { engineConfig, setEngineConfig } = useGameStore(useShallow(state => ({
    engineConfig: state.engineConfig,
    setEngineConfig: state.setEngineConfig,
  })));

  // Merge con defaults y forzar refresh de UI de estado de red
  const config = { ...DEFAULT_CONFIG, ...engineConfig };
  const [isConnected, setIsConnected] = useState(backendService.isConnected);

  // Efecto para escuchar si el WebSocket cambia de estado mientras el modal está abierto
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected !== backendService.isConnected) {
        setIsConnected(backendService.isConnected);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleChange = (key, value) => {
    if (key === 'engineMode') {
      if (value === 'remote') backendService.connect();
      else backendService.disconnect();
    }
    setEngineConfig({ ...config, [key]: value });
  };

  const handleReset = () => {
    backendService.disconnect(); // Default es local
    setEngineConfig(DEFAULT_CONFIG);
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const maxThreads = Math.max(1, (navigator.hardwareConcurrency ?? 4) - 1);
  const isRemote = config.engineMode === 'remote';

  return createPortal(
    <div className="ecm-backdrop" onClick={handleBackdrop}>
      <div className="ecm-modal premium-scroll" role="dialog" aria-modal="true" aria-label="Configuración del motor">

        <div className="ecm-header">
          <div className="ecm-header-title">
            <Cpu size={15} className="ecm-header-icon" />
            <span>Motor de Análisis</span>
          </div>
          <button className="ecm-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={15} />
          </button>
        </div>

        <div className="ecm-engine-badge">
          <div className={`ecm-badge-dot ${isRemote ? (isConnected ? 'connected' : 'connecting') : ''}`}
            style={{ backgroundColor: isRemote ? (isConnected ? '#10b981' : '#f59e0b') : '#3b82f6' }} />
          <span className="ecm-badge-name">Stockfish 18</span>
          <span className="ecm-badge-tag">{isRemote ? (isConnected ? 'NATIVO' : 'CONECTANDO...') : 'WASM (LOCAL)'}</span>
        </div>

        <div className="ecm-body">

          {/* SELECCIÓN DE MOTOR */}
          <div className="ecm-section">
            <h4 className="ecm-section-title">Origen de Procesamiento</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => handleChange('engineMode', 'local')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  backgroundColor: !isRemote ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: !isRemote ? '#60a5fa' : '#9ca3af', fontWeight: 'bold'
                }}
              >
                <Laptop size={16} /> Navegador
              </button>
              <button
                onClick={() => handleChange('engineMode', 'remote')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  backgroundColor: isRemote ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: isRemote ? '#34d399' : '#9ca3af', fontWeight: 'bold'
                }}
              >
                <Server size={16} /> Backend Nativo
              </button>
            </div>
            {isRemote && !isConnected && (
              <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '-8px', marginBottom: '10px' }}>
                Esperando conexión a ws://localhost:9001... (Usa local como respaldo)
              </div>
            )}
          </div>

          <div className="ecm-section">
            <h4 className="ecm-section-title">Hardware y Recursos</h4>
            <div>
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
          </div>

          <div className="ecm-section">
            <h4 className="ecm-section-title">Análisis de Partida (Completo)</h4>
            <ConfigRow
              icon={<Gauge size={14} />}
              label="Profundidad"
              description="Profundidad objetivo para cada jugada"
              value={config.depth}
              min={10}
              max={25}
              step={1}
              onChange={(v) => handleChange('depth', v)}
              formatValue={(v) => `${v} ply`}
              colorClass="accent-blue"
            />
            <ConfigRow
              icon={<Layers size={14} />}
              label="Líneas (MultiPV)"
              description="Cantidad de variantes analizadas"
              value={config.multiPv}
              min={1}
              max={5}
              step={1}
              onChange={(v) => handleChange('multiPv', v)}
              formatValue={(v) => v === 1 ? '1 línea' : `${v} líneas`}
              colorClass="accent-purple"
            />
          </div>

          <div className="ecm-section">
            <h4 className="ecm-section-title">Análisis en Vivo (Exploración)</h4>
            <ConfigRow
              icon={<Gauge size={14} />}
              label="Profundidad"
              description="Profundidad para las flechas en el tablero"
              value={config.liveDepth}
              min={10}
              max={25}
              step={1}
              onChange={(v) => handleChange('liveDepth', v)}
              formatValue={(v) => `${v} ply`}
              colorClass="accent-blue"
            />
            <ConfigRow
              icon={<Layers size={14} />}
              label="Flechas (MultiPV)"
              description="Cantidad de flechas simultáneas"
              value={config.liveMultiPv}
              min={1}
              max={5}
              step={1}
              onChange={(v) => handleChange('liveMultiPv', v)}
              formatValue={(v) => v === 1 ? '1 flecha' : `${v} flechas`}
              colorClass="accent-purple"
            />
          </div>

        </div>

        <div className="ecm-footer">
          <p className="ecm-footer-note">
            Los cambios se aplican al iniciar el próximo análisis.
          </p>
          <button className="ecm-reset-btn" onClick={handleReset}>
            Restablecer
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

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