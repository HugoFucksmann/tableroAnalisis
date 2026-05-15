import { useState, useEffect } from 'react';

export const usePanelManagement = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 1100 : false
  );

  // BUG MEDIO/BAJO SOLUCIONADO: Se inicializan y se independiza la sincronización
  const [isImportCollapsed, setIsImportCollapsed] = useState(isMobile);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(isMobile);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Efecto 1: Escuchar cambios de tamaño de ventana pura y exclusivamente
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Efecto 2: Reaccionar a los cambios de isMobile para forzar el colapso correcto
  useEffect(() => {
    if (isMobile) {
      setIsImportCollapsed(true);
      setIsExplorerCollapsed(true);
    }
  }, [isMobile]);

  return {
    isMobile,
    isImportCollapsed, setIsImportCollapsed,
    isExplorerCollapsed, setIsExplorerCollapsed,
    isHistoryCollapsed, setIsHistoryCollapsed
  };
};

export const useSidebarResize = (isMobile) => {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || isMobile) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) {
        setWidth(newWidth);
        localStorage.setItem('sidebarWidth', newWidth);
      }
    };

    const stopResizing = () => {
      setIsResizing(false);
      document.body.classList.remove('is-resizing');
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, isMobile]);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add('is-resizing');
  };

  return { width, isResizing, startResizing };
};