import React from 'react';
import { Dashboard } from './components/Layout/Dashboard';
import './index.css';

function App() {
  const [errorMsg, setErrorMsg] = React.useState(null);

  React.useEffect(() => {
    const handleErr = (e) => {
      setErrorMsg(e.message || String(e));
    };
    window.addEventListener('error', handleErr);
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
