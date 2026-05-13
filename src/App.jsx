import React, { useEffect } from 'react';
import { Dashboard } from './components/Layout/Dashboard';
import './index.css';
import { useGameStore } from './store/useGameStore';
import { backendService } from './services/backendService';
import { LazyMotion, domAnimation } from 'framer-motion';

function App() {

  useEffect(() => {
    // El backend es necesario tanto para el motor remoto como para la API de Puzzles
    backendService.connect();
  }, []);


  return (
    <LazyMotion features={domAnimation}>
      <Dashboard />
    </LazyMotion>
  );
}

export default App;
