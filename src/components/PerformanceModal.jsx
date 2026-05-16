import React, { useState, useEffect, useRef } from 'react';
import { SortEngine } from '../core/SortEngine';

const MergeSortIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#1db954" style={{ display: 'block' }}>
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const BubbleSortIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="-399 401 100 100"
        fill="#ff823a"
        baseProfile="tiny"
        xmlns="http://www.w3.org/2000/svg"
        xmlSpace="preserve"
        style={{ display: 'block' }}
    >
        <path d="M-302.1 489c-.6-.2-13.8-3.5-21.4-6.3 15.7-3.6 21.3-17.9 21.3-28.8 0-18.1-15-32.8-33.4-32.8s-33.4 14.7-33.4 32.8c0 4.6 1 9 2.7 12.9v-.1l5.6 1c1.8.4 6.4 1.3 13.7 2.5 8.2 1.4 13.6.3 18.1-3.8 2.8-2.6 4.5-6.1 4.7-9.9s-1-7.5-3.5-10.4c-4-4.6-11-5-15.5-.9-3.6 3.3-4.1 9-1 12.6 2.4 2.8 6.8 3.1 9.5.7 1-.9 1.6-2.1 1.6-3.3.1-1-.2-2-.8-2.7-.5-.6-1.3-.9-2.2-.9-.6 0-1.4.3-2 .7-.1.1-.2.1-.2.2-.1.1-.2.1-.3.2h-.3c-.1 0-.2.1-.3.1-.8 0-1.5-.7-1.5-1.6s.7-1.6 1.5-1.6c.3 0 2.4-.7 3.3-.7 1.7-.2 3.1.4 4.3 1.6 1.1 1.3 1.7 2.9 1.6 4.7-.1 2.1-1 4-2.6 5.4-3.9 3.5-10.1 3.1-13.7-.9-4.1-4.8-3.6-12.5 1.3-16.9 5.7-5.2 14.6-4.7 19.7 1.2 3 3.5 4.5 8 4.3 12.6-.3 4.7-2.3 8.9-5.7 12-3.8 3.5-8.3 5.2-14 5.2-2 0-4.2-.2-6.5-.6-5-.9-10.2-1.8-13.8-2.4-1.4-.3-2.6-.5-3.3-.6-.4-.1-.7-.1-.8-.1l-1.5-.3c-5.1-1.2-7.8-13.2-7.8-14.3V433c0-1.6-1.2-2.8-2.8-2.8h-.5c-1.5 0-2.8 1.3-2.8 2.8v21.8a7.16 7.16 0 0 1-5.9 3.1c-2.3 0-4.4-1.1-5.7-2.9v-22c0-1.6-1.2-2.8-2.8-2.8h-.5c-1.5 0-2.8 1.3-2.8 2.8v22.5c0 1-2.6 38.5 28.9 38.8 17.6.2 67.5 0 67.5 0 1.4 0 2.6-1.2 2.6-2.7s-1.5-2.2-2.9-2.6" />
    </svg>
);

const EmptyChartIcon = () => (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px' }}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);

export default function PerformanceModal({ isOpen, onClose, playlist }) {
    const [sortConfig, setSortConfig] = useState({ key: 'name', algorithm: 'merge', ascending: true });
    const [telemetry, setTelemetry] = useState(null);
    const [history, setHistory] = useState([]);
    const [localPlaylist, setLocalPlaylist] = useState([...playlist]);

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e) => {
        if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'select') return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    if (!isOpen) return null;

    const runSort = () => {
        const startTime = performance.now();
        let result;

        if (sortConfig.algorithm === 'bubble') {
            result = SortEngine.bubbleSort(localPlaylist, sortConfig.key, sortConfig.ascending);
        } else {
            result = SortEngine.mergeSort(localPlaylist, sortConfig.key, sortConfig.ascending);
        }

        const endTime = performance.now();
        const duration = parseFloat((endTime - startTime).toFixed(4));

        setLocalPlaylist(result);

        const currentTelemetry = {
            algorithm: sortConfig.algorithm === 'merge' ? 'Merge Sort' : 'Bubble Sort',
            complexity: sortConfig.algorithm === 'merge' ? 'O(n log n)' : 'O(n²)',
            time: duration,
            items: localPlaylist.length
        };

        setTelemetry(currentTelemetry);

        setHistory(prev => {
            const newHistory = [...prev, { id: Date.now(), ...currentTelemetry }];
            return newHistory.slice(-10);
        });
    };

    const maxTime = Math.max(...history.map(h => h.time), 0.1);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
        }}>
            <div className="custom-modal" style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                width: '900px',
                height: '650px',
                minWidth: '750px',
                minHeight: '550px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                resize: 'both',
                pointerEvents: 'auto',
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.05s ease-out'
            }}>

                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        padding: '20px',
                        borderBottom: '1px solid #333',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0,
                        cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#1db954', pointerEvents: 'none' }}>Performance Dashboard</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* COLUNA ESQUERDA: LISTA E CONTROLES */}
                    <div style={{ flex: 1, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', padding: '20px', backgroundColor: '#181818' }}>
                        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                                <div style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 10 }}>
                                    {sortConfig.algorithm === 'merge' ? <MergeSortIcon /> : <BubbleSortIcon />}
                                </div>
                                <select
                                    className="modal-input"
                                    style={{ marginBottom: 0, width: '100%', paddingLeft: '35px' }}
                                    value={sortConfig.algorithm}
                                    onChange={(e) => setSortConfig({...sortConfig, algorithm: e.target.value})}
                                >
                                    <option value="merge">Merge Sort (Rápido)</option>
                                    <option value="bubble">Bubble Sort (Lento)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    className="modal-input"
                                    style={{ flex: 1, marginBottom: 0 }}
                                    value={sortConfig.key}
                                    onChange={(e) => setSortConfig({...sortConfig, key: e.target.value})}
                                >
                                    <option value="name">Por Título</option>
                                    <option value="artist">Por Artista</option>
                                    <option value="album">Por Álbum</option>
                                    <option value="mtime">Por Modificação</option>
                                </select>
                                <button className="modal-btn save" style={{ borderRadius: '6px' }} onClick={runSort}>ORDENAR</button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #333', borderRadius: '8px', padding: '5px' }}>
                            {localPlaylist.slice(0, 100).map((t, i) => (
                                <div key={i} style={{ fontSize: '11px', padding: '6px', borderBottom: '1px solid #222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ccc' }}>
                                    <span style={{ color: '#1db954', marginRight: '8px' }}>{i+1}.</span> {t.name}
                                </div>
                            ))}
                            {localPlaylist.length > 100 && <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', padding: '10px' }}>+ {localPlaylist.length - 100} músicas</div>}
                        </div>
                    </div>

                    {/* COLUNA DIREITA: TELEMETRIA */}
                    <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#121212' }}>
                        {!telemetry ? (
                            <div style={{ color: '#555', margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <EmptyChartIcon />
                                <p>Clique em <b>ORDENAR</b> para iniciar a coleta de dados e gerar o gráfico comparativo.</p>
                            </div>
                        ) : (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                                <h3 style={{ color: '#1db954', fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>Resultados da Última Execução</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px', flexShrink: 0 }}>
                                    <DataCard label="Algoritmo" value={telemetry.algorithm} />
                                    <DataCard label="Complexidade" value={telemetry.complexity} color={telemetry.algorithm === 'Merge Sort' ? '#1db954' : '#ff823a'} />
                                    <DataCard label="Itens" value={telemetry.items} />
                                    <DataCard label="Tempo" value={`${telemetry.time} ms`} color="#bc84ee" />
                                </div>

                                {/* GRÁFICO DE BARRAS */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '280px' }}>
                                    <h4 style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'left' }}>Histórico de Execuções (ms)</h4>
                                    <div style={{
                                        flex: 1,
                                        backgroundColor: '#181818',
                                        borderRadius: '12px',
                                        border: '1px solid #333',
                                        padding: '15px',
                                        display: 'flex',
                                        gap: '8px',
                                        overflow: 'hidden'
                                    }}>
                                        {history.map((run) => {
                                            const heightPct = Math.max((run.time / maxTime) * 100, 5);
                                            const isMerge = run.algorithm === 'Merge Sort';

                                            return (
                                                <div key={run.id} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>

                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '9px', color: '#888', marginBottom: '6px' }}>{run.time}</span>
                                                        <div style={{
                                                            width: '100%',
                                                            maxWidth: '40px',
                                                            backgroundColor: isMerge ? '#1db954' : '#ff823a',
                                                            height: `${heightPct}%`,
                                                            borderRadius: '4px 4px 0 0',
                                                            transition: 'height 0.4s ease-out'
                                                        }}></div>
                                                    </div>

                                                    <div style={{ height: '50px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '5px' }}>
                                                        <span style={{ fontSize: '9px', color: '#ccc', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                            {isMerge ? 'Merge' : 'Bubble'}
                                                        </span>
                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', fontSize: '11px', color: '#888', flexShrink: 0 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#1db954', borderRadius: '2px' }}></div> Merge Sort O(n log n)</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#ff823a', borderRadius: '2px' }}></div> Bubble Sort O(n²)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const DataCard = ({ label, value, color = "#1db954" }) => (
    <div style={{ padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '10px', border: '1px solid #333', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{value}</div>
    </div>
);