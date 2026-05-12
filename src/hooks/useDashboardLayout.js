import { useState, useEffect } from 'react';

export const usePanelManagement = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 1100 : false
  );
  const [isImportCollapsed, setIsImportCollapsed] = useState(isMobile);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(isMobile);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const currentIsMobile = window.innerWidth <= 1100;
      if (currentIsMobile !== isMobile) {
        setIsMobile(currentIsMobile);
        setIsImportCollapsed(currentIsMobile);
        setIsExplorerCollapsed(currentIsMobile);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      // Calculamos el ancho desde la derecha
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
