import React, { useEffect } from 'react';
import { Dashboard } from './components/Layout/Dashboard';
import './index.css';
import { useGameStore } from './store/useGameStore';
import { backendService } from './services/backendService';

function App() {

  useEffect(() => {
    // El backend es necesario tanto para el motor remoto como para la API de Puzzles
    backendService.connect();
  }, []);


  return (


    <Dashboard />

  );
}

export default App;
