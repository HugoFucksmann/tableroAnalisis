import React, { useEffect } from 'react';
import { Dashboard } from './components/Layout/Dashboard';
import './index.css';
import { useGameStore } from './store/useGameStore';
import { backendService } from './services/backendService';

function App() {

  useEffect(() => {
    const config = useGameStore.getState().engineConfig;
    if (config?.engineMode === 'remote') {
      backendService.connect();
    }
  }, []);


  return (


    <Dashboard />

  );
}

export default App;
