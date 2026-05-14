import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { backendService } from '../../services/backendService';
import { Chessboard } from 'react-chessboard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import './StatsDetailView.css';

export const StatsDetailView = () => {
    const { selectedStatCategory, setSelectedStatCategory, setAppMode, setGameId, setTargetPly } = useGameStore(useShallow(state => ({
        selectedStatCategory: state.selectedStatCategory,
        setSelectedStatCategory: state.setSelectedStatCategory,
        setAppMode: state.setAppMode,
        setGameId: state.setGameId,
        setTargetPly: state.setTargetPly
    })));

    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedStatCategory) return;
        
        setLoading(true);
        // Podemos usar los mismos filtros globales de stats si estuvieran en el store, 
        // pero por simplicidad pasamos {} o los guardamos.
        backendService.getStatDetails(selectedStatCategory, {})
            .then(res => {
                setDetails(Array.isArray(res.details) ? res.details : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [selectedStatCategory]);

    if (!selectedStatCategory) return null;

    const getCategoryTitle = () => {
        switch (selectedStatCategory) {
            case 'tilt': return 'Momentos de Colapso Emocional (Tilt)';
            case 'comeback': return 'Remontadas Épicas';
            case 'blown_advantage': return 'Ventajas Desperdiciadas';
            default: return 'Detalles de Estadística';
        }
    };

    const handleBoardClick = (gameId, ply) => {
        // Carga la partida y vuelve al modo análisis
        if (ply !== null && ply !== undefined) setTargetPly(ply);
        setGameId(gameId);
        setAppMode('analysis');
        setSelectedStatCategory(null);
    };

    return (
        <div className="stats-detail-container glass-panel">
            <div className="stats-detail-header">
                <button 
                    className="back-btn" 
                    onClick={() => setSelectedStatCategory(null)}
                >
                    <ArrowLeft size={18} /> Volver
                </button>
                <h2>{getCategoryTitle()}</h2>
                <span className="stats-detail-count">{details.length} posiciones detectadas</span>
            </div>

            {loading ? (
                <div className="stats-detail-loading">
                    <Loader2 className="spinner" size={32} />
                    <p>Analizando historial de posiciones...</p>
                </div>
            ) : details.length === 0 ? (
                <div className="stats-detail-empty">
                    <p>No se encontraron eventos para esta categoría en el historial analizado.</p>
                </div>
            ) : (
                <div className="stats-detail-grid">
                    {details.map((item, idx) => (
                        <div 
                            key={`${item.gameId}-${idx}`} 
                            className="stat-board-card"
                            onClick={() => handleBoardClick(item.gameId, item.ply)}
                        >
                            <div className="stat-board-wrapper">
                                <Chessboard 
                                    position={item.fen} 
                                    arePiecesDraggable={false}
                                    animationDuration={0}
                                    customDarkSquareStyle={{ backgroundColor: '#779556' }}
                                    customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
                                />
                            </div>
                            <div className="stat-board-info">
                                <span className="sbi-game">Partida #{item.gameId}</span>
                                <span className="sbi-action">Click para analizar</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
