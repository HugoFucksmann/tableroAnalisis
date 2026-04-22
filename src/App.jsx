import React from 'react';
import { Dashboard } from './components/Layout/Dashboard';
import { useGameStore } from './store/useGameStore';
import './index.css';

function App() {
  const { 
    setMoveEvaluation, 
    setGamePhase, 
    setOpeningName,
    setEvaluation
  } = useGameStore();

  const [errorMsg, setErrorMsg] = React.useState(null);

  React.useEffect(() => {
    const handleErr = (e) => {
      setErrorMsg(e.message || String(e));
    };
    window.addEventListener('error', handleErr);
    
    // Simular algunas valoraciones estáticas para pruebas visuales
    setMoveEvaluation(0, 'Libro');
    setMoveEvaluation(1, 'Libro');
    setMoveEvaluation(2, 'Excelente');
    setMoveEvaluation(3, 'Brillante');
    setMoveEvaluation(4, 'Imprecisión');
    setMoveEvaluation(5, 'Error grave');
    
    // Simular estado inicial de la barra de estado y gráficos
    setGamePhase('Apertura');
    setOpeningName('Posición Inicial');
    setEvaluation(0.5);
    return () => window.removeEventListener('error', handleErr);
  }, []);

  return (
    <>
      {errorMsg && <div style={{ background: 'red', color: 'white', padding: '10px', position: 'fixed', top: 0, zIndex: 9999 }}>ERROR: {errorMsg}</div>}
      <Dashboard />
    </>
  );
}

export default App;
