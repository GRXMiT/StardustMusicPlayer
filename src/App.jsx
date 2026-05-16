import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import TitleBar from './components/TitleBar';
import AudioVisualizer from './components/AudioVisualizer';
import SettingsModal from './components/SettingsModal';
import { audioService } from './service/AudioService';
import placeholderImg from './assets/placeholder.png';
import { SortEngine } from './core/SortEngine';
import PerformanceModal from './components/PerformanceModal';

const ScrollingText = ({ text, className, style }) => {
    const shouldAnimate = text && text.length > 20;
    return (
        <div className="scrolling-text-container" style={style}>
            <div className={`scrolling-text ${shouldAnimate ? 'animate' : ''} ${className}`}>
                {text} {shouldAnimate ? <span style={{paddingLeft: '50px'}}>{text}</span> : ''}
            </div>
        </div>
    );
};

const TrackRowImage = ({ trackPath, isPlayingCurrent, displayTrackPicture }) => {
    const [localCover, setLocalCover] = React.useState(placeholderImg);
    const [isVisible, setIsVisible] = React.useState(false);
    const imgRef = React.useRef(null);

    React.useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, {
            rootMargin: '100px'
        });

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [trackPath]);

    React.useEffect(() => {
        if (!isVisible) return;

        let isMounted = true;
        const fetchCoverAsync = async () => {
            if (window.electronAPI && window.electronAPI.getTrackCover) {
                try {
                    const details = await window.electronAPI.getTrackCover(trackPath);
                    if (isMounted && details && details.picture) {
                        setLocalCover(details.picture);
                    }
                } catch (err) {
                    console.error("Erro ao carregar capa:", err);
                }
            }
        };

        fetchCoverAsync();
        return () => { isMounted = false; };
    }, [isVisible, trackPath]);

    const finalCover = (isPlayingCurrent && displayTrackPicture) ? displayTrackPicture : localCover;

    return (
        <img
            ref={imgRef}
            src={finalCover}
            alt="Cover"
            style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { e.target.src = placeholderImg; }}
        />
    );
};

const defaultVisualizerSettings = {
    // Bars
    bar1Enabled: true, bar1DataPoints: 16, bar1Channel: 'Both', bar1Render: 'Normal', bar1Reverse: false, bar1Strength: 25, bar1Width: 8, bar1Gap: 4, bar1Opacity: 100, bar1Rotation: 0, bar1HeightLimit: 0, bar1Mode: 'Square', bar1DrawType: 'Bars', bar1CircleSize: 132, bar1ArcDegrees: 360, bar1Rotate: false, bar1RotateCCW: false, bar1RotDuration: 60, bar1Caps: 'Round', bar1OffsetX: 0, bar1OffsetY: 0,
    bar2Enabled: false, bar2DataPoints: 256, bar2Channel: 'Both', bar2Render: 'Repeat', bar2Reverse: false, bar2Strength: 75, bar2Width: 10, bar2Gap: 20, bar2Opacity: 100, bar2Rotation: 0, bar2HeightLimit: 0, bar2Mode: 'Linear', bar2DrawType: 'Bars', bar2CircleSize: 50, bar2ArcDegrees: 360, bar2Rotate: true, bar2RotateCCW: true, bar2RotDuration: 30, bar2Caps: 'Round', bar2OffsetX: 0, bar2OffsetY: 0,

    // Background & Visuals
    bgEnabled: false, bgType: 'Video', bgColor: '#ffffff', bgImage: '', bgVideo: '', bgScaleToFit: true, bgVideoVolume: 0, bgVideoSpeed: 100, bgPauseIdle: false, bgSlideshowFolder: '', bgPerspective: false, bgPerspectiveStrength: 30, bgPerspectiveDist: 1000, bgPerspectiveStatic: false,
    gridEnabled: false, gridColor: '#f6f4f4', gridPointsX: 30, gridPointsY: 20, gridType: 'Square', gridVis: 80,

    // Clock & Logo
    clockEnabled: false, clockColor: '#ffffff', clock24h: true, clockSecs: true, clockSep: true, clockScale: 93, clockOffsetX: 0, clockOffsetY: 0, clockFont: 'Impact',
    logoSource: 'Album Cover', customLogoImage: '', logoSize: 297, logoShape: 'Square', logoFit: 'Fill Space (Default Cover)', logoShadowEnabled: true, logoOffsetX: 0, logoOffsetY: 0,

    // Audio & Effects
    confettiEnabled: true, confettiMinSound: 150, confettiSize: 15, confettiBurstSize: 36, confettiSpeed: 100,
    audioSmoothDelay: 0, effGlow: false, effShake: true, effBounce: true, effColorEffects: true,
    eqEnabled: true, eqUseForEffects: true, eq200: 100, eq400: 100, eq750: 100, eq1500: 100, eq3000: 100, eq6000: 100, eq9000: 100, eq12000: 100,

    // Colors & Intensities
    useSolidColor: true, solidColor: '#ffffff', baseHue: 360, endHue: 1,
    fgBounceIntensity: 50, bgBounceIntensity: 0, fgShakeIntensity: 15, bgShakeIntensity: 0,
    showFps: false
};

export default function App() {
    // ====================================================
    // NOVOS ESTADOS: MVP e Estrutura de Dados (Fila)
    // ====================================================
    const [appState, setAppState] = useState('welcome'); // Controla a tela inicial vs player
    const [sortConfig, setSortConfig] = useState({ key: 'name', ascending: true, algorithm: 'merge' });
    const [queueList, setQueueList] = useState([]);
    const [queuePlayingTrack, setQueuePlayingTrack] = useState(null); // Música atual vinda da fila
    const [playlistsData, setPlaylistsData] = useState({});
    const [viewMode, setViewMode] = useState({ type: 'library', name: null }); // Controla o que aparece na lista de músicas

    // Estado para o menu de contexto
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, data: null });

    // Estado para o modal de nova playlist
    const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const [playlist, setPlaylist] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);

    const [visibleCount, setVisibleCount] = useState(50);
    useEffect(() => {
        setVisibleCount(50);
    }, [searchQuery, viewMode]);

    const [isShuffle, setIsShuffle] = useState(() => localStorage.getItem('player_shuffle') === 'true');
    const [repeatMode, setRepeatMode] = useState(() => parseInt(localStorage.getItem('player_repeat') || '0', 10));

    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('player_volume') || '1'));

    const [visualizerSettings, setVisualizerSettings] = useState(() => {
        const saved = localStorage.getItem('player_visualizer_settings');
        return saved ? { ...defaultVisualizerSettings, ...JSON.parse(saved) } : defaultVisualizerSettings;
    });

    const [leftWidth, setLeftWidth] = useState(260);
    const [rightWidth, setRightWidth] = useState(260);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const isDraggingLeft = useRef(false);
    const isDraggingRight = useRef(false);
    const volumeBeforeMute = useRef(1);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPerfModalOpen, setIsPerformanceModalOpen] = useState(false);
    const [folders, setFolders] = useState([]);
    const [currentTrackDetails, setCurrentTrackDetails] = useState(null);

    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const currentTimeRef = useRef(null);

    const currentTrack = queuePlayingTrack;

    const filteredPlaylist = useMemo(() => {
        let source = viewMode.type === 'library' ? [...playlist] : [...(playlistsData[viewMode.name] || [])];

        // 1. Aplica a Busca
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            source = source.filter(track =>
                track.name?.toLowerCase().includes(lowerQuery) ||
                track.artist?.toLowerCase().includes(lowerQuery) ||
                track.album?.toLowerCase().includes(lowerQuery)
            );
        }

        if (source.length === 0) return source;

        // 2. Aplica a Ordenação + Telemetria
        const startTime = performance.now();
        let sortedSource;

        if (sortConfig.algorithm === 'bubble') {
            sortedSource = SortEngine.bubbleSort(source, sortConfig.key, sortConfig.ascending);
        } else {
            sortedSource = SortEngine.mergeSort(source, sortConfig.key, sortConfig.ascending);
        }

        const endTime = performance.now();
        const timeTaken = (endTime - startTime).toFixed(2);

        // Dispara o log no console simulando o Dashboard (mostre isso pro professor!)
        console.log(`[Telemetria] Algoritmo: ${sortConfig.algorithm.toUpperCase()} | Campo: ${sortConfig.key} | Itens: ${source.length} | Tempo: ${timeTaken} ms`);

        return sortedSource;
    }, [playlist, playlistsData, viewMode, searchQuery, sortConfig]);

    const displayedTracks = filteredPlaylist.slice(0, visibleCount);

    // ====================================================
    // INTEGRAÇÃO COM A QUEUE E O SERVIÇO
    // ====================================================

    // Inicialização pela Tela de Boas Vindas
    const handleStartApp = async () => {
        try {
            if (window.electronAPI) {
                // Carrega a Fila
                if (window.electronAPI.readQueue) {
                    const savedData = await window.electronAPI.readQueue();
                    setQueueList([...audioService.restoreSavedSession(savedData)]);
                    if (savedData.length > 0) {
                        setQueuePlayingTrack(savedData[0]);
                    }
                }
                // Carrega as Playlists
                if (window.electronAPI.readPlaylists) {
                    const savedPlaylists = await window.electronAPI.readPlaylists();
                    setPlaylistsData({...audioService.restorePlaylists(savedPlaylists)});
                }
            }
            setAppState('player');
        } catch (error) {
            console.error("Error starting app:", error);
            setAppState('player');
        }
    };

    // Adiciona uma música à fila O(1)
    const enqueueTrack = (track, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        try {
            const updatedQueue = audioService.enqueueFullTrack(track);
            setQueueList([...updatedQueue]);
            if (!queuePlayingTrack) {
                playNextFromQueue();
            }
        } catch (error) {
            alert("Error enqueuing track: " + error.message);
        }
    };

    // Limpar toda a fila da interface e do disco O(1)
    const handleClearQueue = useCallback(() => {
        const updatedQueue = audioService.clearQueue();
        setQueueList(updatedQueue);
    }, []);

    // Toca a próxima música da fila (Dequeue O(1))
    const playNextFromQueue = useCallback(() => {
        try {
            if (audioService.queue.isEmpty()) {
                setQueuePlayingTrack(null);
                setIsPlaying(false);
                setQueueList([]);
                return false;
            }

            const nextTrack = audioService.playNext();
            setQueuePlayingTrack(nextTrack);
            setQueueList([...audioService.getQueue()]);
            setIsPlaying(true);
            return true;
        } catch (error) {
            console.error("Erro ao tocar da fila:", error);
            setQueuePlayingTrack(null);
            setIsPlaying(false);
            return false;
        }
    }, []);

    // Quando clicar em uma música na lista
    const handlePlayTrackFromList = (track, index) => {
        const source = viewMode.type === 'library' ? playlist : (playlistsData[viewMode.name] || []);
        const realIndex = source.findIndex(t => t.path === track.path);
        
        // Gera uma nova fila baseada na lista atual, começando pela música clicada
        const newQueue = audioService.generateQueue(source, realIndex, isShuffle);
        setQueueList(newQueue);
        playNextFromQueue();
    };

    const loadTracksFromFolders = useCallback(async (foldersToLoad) => {
        if (!window.electronAPI || foldersToLoad.length === 0) return;
        try {
            const tracks = await window.electronAPI.readFolders(foldersToLoad);
            setPlaylist(tracks);
        } catch (e) {
            console.error("Error loading tracks:", e);
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            let savedFolders = JSON.parse(localStorage.getItem('musicFolders')) || [];
            if (savedFolders.length === 0 && window.electronAPI) {
                try {
                    const defaultFolder = await window.electronAPI.getDefaultMusicFolder();
                    if (defaultFolder) {
                        savedFolders = [defaultFolder];
                        localStorage.setItem('musicFolders', JSON.stringify(savedFolders));
                    }
                } catch (e) {
                    console.error("Error getting default folder:", e);
                }
            }
            setFolders(savedFolders);
            if (savedFolders.length > 0) {
                await loadTracksFromFolders(savedFolders);
            }
        };
        loadInitialData().catch(console.error);
    }, [loadTracksFromFolders]);

    useEffect(() => {
        localStorage.setItem('player_shuffle', isShuffle.toString());
        localStorage.setItem('player_repeat', repeatMode.toString());
    }, [isShuffle, repeatMode]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
        localStorage.setItem('player_volume', volume.toString());
    }, [volume]);

    useEffect(() => {
        localStorage.setItem('player_visualizer_settings', JSON.stringify(visualizerSettings));
    }, [visualizerSettings]);

    useEffect(() => {
        const fetchCover = async () => {
            if (currentTrack && window.electronAPI) {
                setCurrentTrackDetails(null);
                try {
                    const details = await window.electronAPI.getTrackCover(currentTrack.path);
                    if (details) setCurrentTrackDetails(details);
                } catch (err) {
                    console.error("Error loading cover", err);
                }
            } else if (!currentTrack) {
                setCurrentTrackDetails(null);
            }
        };
        fetchCover().catch(console.error);
    }, [currentTrack]);

    const displayTrack = useMemo(() => {
        if (!currentTrack) return null;
        return {
            ...currentTrack,
            name: currentTrackDetails?.name || currentTrack.name,
            artist: currentTrackDetails?.artist || currentTrack.artist,
            album: currentTrackDetails?.album || currentTrack.album,
            picture: currentTrackDetails?.picture || placeholderImg
        };
    }, [currentTrack, currentTrackDetails]);

    const handleAddFolder = async () => {
        if (window.electronAPI) {
            const folderPath = await window.electronAPI.selectFolder();
            if (folderPath && !folders.includes(folderPath)) {
                const newFolders = [...folders, folderPath];
                setFolders(newFolders);
                localStorage.setItem('musicFolders', JSON.stringify(newFolders));
                await loadTracksFromFolders(newFolders);
            }
        }
    };

    const handleRemoveFolder = async (folderToRemove) => {
        const newFolders = folders.filter(f => f !== folderToRemove);
        setFolders(newFolders);
        localStorage.setItem('musicFolders', JSON.stringify(newFolders));
        await loadTracksFromFolders(newFolders);
    };

    useEffect(() => {
        if (audioRef.current && currentTrack) {
            if (isPlaying) {
                audioRef.current.play().catch(err => console.log("Waiting for interaction:", err));
            } else {
                audioRef.current.pause();
            }
        } else if (audioRef.current && !currentTrack) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
    }, [isPlaying, currentTrack]);

    const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);

    const toggleMute = () => {
        if (volume > 0) {
            volumeBeforeMute.current = volume;
            setVolume(0);
        } else {
            setVolume(volumeBeforeMute.current > 0 ? volumeBeforeMute.current : 1);
        }
    };

    const nextTrack = useCallback(() => {
        playNextFromQueue();
    }, [playNextFromQueue]);

    const prevTrack = useCallback(() => {
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }
        if (audioRef.current) audioRef.current.currentTime = 0;
    }, []);

    useEffect(() => {
        if (displayTrack && 'mediaSession' in navigator) {
            let safeArtwork = [];
            if (displayTrack.picture && displayTrack.picture.length < 250000) {
                safeArtwork = [{
                    src: displayTrack.picture,
                    sizes: '512x512',
                    type: displayTrack.picture.split(';')[0].replace('data:', '')
                }];
            }

            navigator.mediaSession.metadata = new MediaMetadata({
                title: displayTrack.name,
                artist: displayTrack.artist || 'MusicPlayer',
                album: displayTrack.album || 'Your Library',
                artwork: safeArtwork
            });
            navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
            navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
            navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
            navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
        }
    }, [displayTrack, prevTrack, nextTrack]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            switch (e.code) {
                case 'Space': e.preventDefault(); togglePlay(); break;
                case 'ArrowRight': e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5); break;
                case 'ArrowLeft': e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5); break;
                case 'ArrowUp': e.preventDefault(); setVolume(v => Math.min(1, v + 0.05)); break;
                case 'ArrowDown': e.preventDefault(); setVolume(v => Math.max(0, v - 0.05)); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingLeft.current) {
                const maxWidth = window.innerWidth * 0.4;
                setLeftWidth(Math.max(150, Math.min(e.clientX, maxWidth)));
            }
            if (isDraggingRight.current) {
                const maxWidth = window.innerWidth * 0.4;
                setRightWidth(Math.max(150, Math.min(window.innerWidth - e.clientX, maxWidth)));
            }
        };
        const handleMouseUp = () => {
            if (isDraggingLeft.current || isDraggingRight.current) {
                isDraggingLeft.current = false;
                isDraggingRight.current = false;
                document.body.style.cursor = 'default';
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        const handleResize = () => {
            if (window.innerWidth >= 900) {
                setLeftWidth(w => Math.min(w, window.innerWidth * 0.4));
                setRightWidth(w => Math.min(w, window.innerWidth * 0.4));
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        let frameId;
        const updateProgress = () => {
            if (audioRef.current && progressRef.current && currentTimeRef.current) {
                const ct = audioRef.current.currentTime;
                const dur = audioRef.current.duration || 1;

                const mins = Math.floor(ct / 60);
                const secs = Math.floor(ct % 60);
                currentTimeRef.current.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                const pct = (ct / dur) * 100;
                progressRef.current.value = ct;
                progressRef.current.style.setProperty('--progress', `${pct}%`);
            }
            frameId = requestAnimationFrame(updateProgress);
        };
        frameId = requestAnimationFrame(updateProgress);
        return () => cancelAnimationFrame(frameId);
    }, []);

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const handleSeek = (e) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const handleVolumeChange = (e) => {
        setVolume(Number(e.target.value));
    };

    const volumeRef = useRef(null);
    useEffect(() => {
        const volEl = volumeRef.current;
        if (!volEl) return;

        const wheelHandler = (e) => {
            e.preventDefault();
            const newVol = e.deltaY < 0 ? Math.min(1, volume + 0.05) : Math.max(0, volume - 0.05);
            setVolume(newVol);
        };

        volEl.addEventListener('wheel', wheelHandler, { passive: false });

        return () => {
            volEl.removeEventListener('wheel', wheelHandler);
        };
    }, [volume]);

    const handleEnded = () => {
        if (repeatMode === 2) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(err => console.log(err));
            }
        } else {
            nextTrack();
        }
    };

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const volumeProgressPercent = volume * 100;

    const handleCreatePlaylist = async () => {
        if (newPlaylistName && newPlaylistName.trim()) {
            try {
                const updatedPlaylists = await audioService.createPlaylist(newPlaylistName);
                setPlaylistsData({...updatedPlaylists});
                setNewPlaylistName('');
                setIsNewPlaylistModalOpen(false);
            } catch (e) {
                alert(e.message);
            }
        }
    };

    const handleAddTrackToPlaylist = async (playlistName, track) => {
        try {
            const updatedPlaylists = await audioService.addTrackToPlaylist(playlistName, track);
            setPlaylistsData({...updatedPlaylists});
        } catch (e) {
            alert(e.message);
        }
    };

    const handleRemoveTrackFromPlaylist = async (playlistName, trackPath) => {
        try {
            const updatedPlaylists = await audioService.removeTrackFromPlaylist(playlistName, trackPath);
            setPlaylistsData({...updatedPlaylists});
        } catch (e) {
            alert(e.message);
        }
    };

    const handleDeletePlaylist = async (playlistName) => {
        if (confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) {
            try {
                const updatedPlaylists = await audioService.deletePlaylist(playlistName);
                setPlaylistsData({...updatedPlaylists});
                if (viewMode.name === playlistName) {
                    setViewMode({ type: 'library', name: null });
                }
            } catch (e) {
                alert(e.message);
            }
        }
    };

    const handleContextMenu = (e, type, data) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            type: type,
            data: data
        });
    };

    const closeContextMenu = useCallback(() => {
        if (contextMenu.visible) {
            setContextMenu({ ...contextMenu, visible: false });
        }
    }, [contextMenu]);

    useEffect(() => {
        window.addEventListener('click', closeContextMenu);
        return () => window.removeEventListener('click', closeContextMenu);
    }, [closeContextMenu]);

    // ====================================================
    // TELA DE BOAS VINDAS (Requisito do MVP)
    // ====================================================
    if (appState === 'welcome') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#000', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <h1 style={{ fontSize: '48px', color: '#1db954', marginBottom: '30px' }}>Stardust</h1>
                <p style={{ color: '#b3b3b3', marginBottom: '40px', fontSize: '18px' }}>Projeto de Estruturas de Dados</p>
                <button
                    onClick={handleStartApp}
                    style={{ padding: '15px 40px', fontSize: '18px', backgroundColor: '#1db954', color: '#000', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    Iniciar Player
                </button>
            </div>
        );
    }

    // ====================================================
    // PLAYER PRINCIPAL
    // ====================================================
    return (
        <div className="app-container">
            <TitleBar /> 
            {isMobileSidebarOpen && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5 }}
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Modal de Configurações */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                folders={folders}
                onAddFolder={handleAddFolder}
                onRemoveFolder={handleRemoveFolder}
                visualizerSettings={visualizerSettings}
                setVisualizerSettings={setVisualizerSettings}
            />

            {/* Modal de Nova Playlist */}
            {isNewPlaylistModalOpen && (
                <div className="modal-overlay">
                    <div className="custom-modal">
                        <h3>Create New Playlist</h3>
                        <input
                            type="text"
                            placeholder="Playlist name"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="modal-input"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreatePlaylist();
                                if (e.key === 'Escape') setIsNewPlaylistModalOpen(false);
                            }}
                        />
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => { setIsNewPlaylistModalOpen(false); setNewPlaylistName(''); }}>Cancel</button>
                            <button className="modal-btn save" onClick={handleCreatePlaylist}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            <audio
                ref={audioRef}
                src={currentTrack ? currentTrack.url : undefined}
                onEnded={handleEnded}
                onLoadedMetadata={handleLoadedMetadata}
            />

            <div className="content-wrapper">
                <aside className={`panel left-sidebar ${isMobileSidebarOpen ? 'open' : ''}`} style={{ width: leftWidth, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Library
                            </h2>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                    title="Settings"
                                >
                                    <SettingsIcon />
                                </button>
                                <button
                                    className="mobile-close-btn"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'none' }}>
                                    &times;
                                </button>
                            </div>
                        </div>

                        <div className="search-wrapper" style={{ width: '100%' }}>
                            <div className="search-icon"><SearchIcon /></div>
                            <input
                                type="text"
                                placeholder="Search song, artist..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-capsule"
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* CONTROLES DE ORDENAÇÃO */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1px'}}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    className="search-capsule"
                                    style={{ flex: 1, padding: '8px', cursor: 'pointer' }}
                                    value={sortConfig.key}
                                    onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value }))}
                                >
                                    <option value="name">Ordenar por Título</option>
                                    <option value="artist">Ordenar por Artista</option>
                                    <option value="album">Ordenar por Álbum</option>
                                    <option value="mtime">Data de Modificação</option>
                                </select>
                                <button
                                    onClick={() => setSortConfig(prev => ({ ...prev, ascending: !prev.ascending }))}
                                    style={{ background: '#242424', border: '1px solid transparent', color: '#fff', padding: '0 12px', borderRadius: '500px', cursor: 'pointer', transition: '0.2s' }}
                                    title={sortConfig.ascending ? "Crescente" : "Decrescente"}
                                >
                                    {sortConfig.ascending ? '↑' : '↓'}
                                </button>
                            </div>
                            <select
                                className="search-capsule"
                                style={{ width: '100%', padding: '8px', cursor: 'pointer' }}
                                value={sortConfig.algorithm}
                                onChange={(e) => setSortConfig(prev => ({ ...prev, algorithm: e.target.value }))}
                            >
                                <option value="merge">Merge Sort (Rápido)</option>
                                <option value="bubble">Bubble Sort (Lento)</option>
                            </select>
                        </div>
                    </div>

                    {/* LISTA DE MÚSICAS (BIBLIOTECA OU PLAYLIST) */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minHeight: 0, marginTop: '1px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            {viewMode.type === 'playlist' && (
                                <button
                                    onClick={() => setViewMode({ type: 'library', name: null })}
                                    style={{ background: 'none', border: '1px solid #1db954', color: '#1db954', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    ← Back to Library
                                </button>
                            )}
                            <h3 style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {viewMode.type === 'library' ? 'All Songs' : `Playlist: ${viewMode.name}`}
                            </h3>
                            <button
                                onClick={() => setIsPerformanceModalOpen(true)}
                                style={{ background: '#1db954', border: 'none', color: '#000', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                title="Ver Telemetria"
                            >
                                ANALISAR
                            </button>
                        </div>

                        <ul
                            className="playlist-container"
                            style={{ listStyle: 'none', padding: 0, marginTop: '0', color: '#b3b3b3', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
                            onScroll={(e) => {
                                const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
                                if (scrollHeight - scrollTop - clientHeight < 100) {
                                    setVisibleCount(prev => Math.min(prev + 50, filteredPlaylist.length));
                                }
                            }}
                        >
                            {displayedTracks.length === 0 ? (
                                <li style={{ fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>
                                    {viewMode.type === 'library'
                                        ? (searchQuery ? 'No song found.' : 'No songs. Add folders in settings.')
                                        : 'This playlist is empty.'}
                                </li>
                            ) : (
                                displayedTracks.map((track, idx) => {
                                    const isPlayingCurrent = currentTrack && track.path === currentTrack.path;

                                    return (
                                        <li
                                            key={idx}
                                            style={{
                                                padding: '8px 10px', cursor: 'pointer', borderRadius: '5px', transition: 'background 0.2s',
                                                backgroundColor: isPlayingCurrent ? '#282828' : 'transparent',
                                                color: isPlayingCurrent ? '#1db954' : '#b3b3b3',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                overflow: 'hidden'
                                            }}
                                            onClick={() => handlePlayTrackFromList(track, idx)}
                                            onContextMenu={(e) => handleContextMenu(e, 'track', track)}
                                            onMouseEnter={(e) => { if (!isPlayingCurrent) e.currentTarget.style.backgroundColor = '#1a1a1a'; }}
                                            onMouseLeave={(e) => { if (!isPlayingCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                            <TrackRowImage
                                                trackPath={track.path}
                                                isPlayingCurrent={isPlayingCurrent}
                                                displayTrackPicture={displayTrack?.picture}
                                            />

                                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                                <div className="track-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isPlayingCurrent ? 'bold' : 'normal' }}>
                                                    {track.name}
                                                </div>
                                                <div className="track-artist" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', color: isPlayingCurrent ? '#1ed760' : '#a7a7a7', marginTop: '2px' }}>
                                                    {track.artist}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </div>

                    {/* COMPONENTE DAS PLAYLISTS - MOVIDO PARA BAIXO */}
                    <div style={{ padding: '10px', backgroundColor: '#181818', borderRadius: '8px', border: '1px solid #282828', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: '15px', maxHeight: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ fontSize: '13px', color: '#1db954', textTransform: 'uppercase', letterSpacing: '1px' }}>My Playlists</h3>
                            <button onClick={() => setIsNewPlaylistModalOpen(true)} style={{ background: 'none', border: '1px solid #1db954', color: '#1db954', fontSize: '11px', padding: '3px 8px', borderRadius: '12px', cursor: 'pointer' }}>+ New</button>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
                            {Object.keys(playlistsData).length === 0 ? (
                                <li style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '10px 0' }}>No playlists yet</li>
                            ) : (
                                Object.keys(playlistsData).map((pName, i) => (
                                    <li
                                        key={i}
                                        style={{ fontSize: '12px', color: viewMode.name === pName ? '#1db954' : '#fff', padding: '6px 8px', borderBottom: '1px solid #282828', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderRadius: '4px' }}
                                        onClick={() => { setViewMode({ type: 'playlist', name: pName }); }}
                                        onContextMenu={(e) => handleContextMenu(e, 'playlist', pName)}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#282828'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <span>{pName}</span>
                                        <span style={{color: '#888'}}>{playlistsData[pName].length} tracks</span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </aside>

                <div className="resizer" onMouseDown={() => { isDraggingLeft.current = true; document.body.style.cursor = 'col-resize'; }} />

                <main className="main-view">
                    <AudioVisualizer isPlaying={isPlaying} currentTrack={displayTrack} audioRef={audioRef} settings={visualizerSettings} />
                </main>

                <div className="resizer right-resizer" onMouseDown={() => { isDraggingRight.current = true; document.body.style.cursor = 'col-resize'; }} />

                <aside className="panel right-sidebar" style={{ width: rightWidth, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* INFORMAÇÃO DA FAIXA ATUAL */}
                    {displayTrack ? (
                        <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', marginBottom: '20px', flexShrink: 0 }}>
                            <img 
                                src={displayTrack.picture} 
                                alt="Cover"
                                style={{ width: '100%', maxWidth: '250px', aspectRatio: '1/1', borderRadius: '10px', objectFit: 'cover', marginBottom: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }} 
                                onError={(e) => { e.target.src = placeholderImg; }}
                            />

                            <div style={{ width: '100%', maxWidth: '250px' }}>
                                <ScrollingText text={displayTrack.name} className="track-name" style={{ fontSize: '20px', marginBottom: '8px' }}/>
                                <ScrollingText text={displayTrack.artist} className="track-artist" style={{ fontSize: '14px', marginBottom: '5px' }}/>
                            </div>

                            <div style={{ marginTop: '10px', width: '100%' }}>
                                <div className="album-pill-container">
                                    <ScrollingText text={displayTrack.album} style={{ color: '#fff' }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#b3b3b3', margin: '20px 0', flexShrink: 0 }}><p>Select a song</p></div>
                    )}

                    {/* COMPONENTE DA FILA */}
                    <div style={{ padding: '10px', backgroundColor: '#181818', borderRadius: '8px', border: '1px solid #282828', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ fontSize: '13px', color: '#1db954', textTransform: 'uppercase', letterSpacing: '1px' }}>Up Next (Queue)</h3>
                            <button onClick={handleClearQueue} style={{ background: 'none', border: '1px solid #1db954', color: '#1db954', fontSize: '11px', padding: '3px 8px', borderRadius: '12px', cursor: 'pointer' }}>Clear</button>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }} className="next-queue-container">
                            {queueList.length === 0 ? (
                                <li style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '10px 0' }}>Queue is empty</li>
                            ) : (
                                queueList.map((t, i) => (
                                    <li key={i} style={{ fontSize: '12px', color: i===0 ? '#fff' : '#888', padding: '6px 0', borderBottom: '1px solid #282828', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {i === 0 && <span style={{ color: '#1db954', fontSize: '10px' }}>▶</span>}
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </aside>
            </div>

            <footer className="bottom-player">
                <div className="player-left">
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsMobileSidebarOpen(true)}
                        style={{ display: 'none', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '5px' }}>
                        <MenuIcon />
                    </button>

                    {displayTrack && (
                        <img
                            src={displayTrack.picture}
                            alt="Cover"
                            style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                            onError={(e) => { e.target.src = placeholderImg; }}
                        />
                    )}
                    <div className="track-info" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <ScrollingText text={displayTrack ? displayTrack.name : 'No track'} className="track-name" />
                        {displayTrack && (
                            <ScrollingText text={displayTrack.artist} className="track-artist" />
                        )}
                    </div>
                </div>

                <div className="player-center">
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '8px' }}>
                        <button style={{ ...btnStyle, color: isShuffle ? '#1db954' : '#b3b3b3' }} onClick={() => setIsShuffle(!isShuffle)} title="Shuffle"><ShuffleIcon /></button>
                        <button style={{ ...btnStyle, color: '#b3b3b3' }} onClick={prevTrack}><PrevIcon /></button>
                        <button style={{ ...btnStyle, color: '#000', backgroundColor: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={togglePlay}>
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button style={{ ...btnStyle, color: '#b3b3b3' }} onClick={nextTrack}><NextIcon /></button>
                        <button style={{ ...btnStyle, color: repeatMode > 0 ? '#1db954' : '#b3b3b3', position: 'relative' }} onClick={() => setRepeatMode((repeatMode + 1) % 3)} title={repeatMode === 2 ? "Repeat 1" : "Repeat All"}>
                            <RepeatIcon />
                            {repeatMode === 2 && <span style={{ position: 'absolute', fontSize: '9px', top: '-4px', right: '-4px', fontWeight: 'bold', backgroundColor: '#121212', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>}
                        </button>
                    </div>
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#b3b3b3' }}>
                        <span ref={currentTimeRef} style={{ minWidth: '35px', textAlign: 'right' }}>0:00</span>

                        <input
                            ref={progressRef}
                            type="range"
                            min="0"
                            max={duration || 100}
                            defaultValue="0"
                            onChange={handleSeek}
                            className="custom-range"
                            style={Object.assign({}, { '--progress': '0%' }, { flex: 1 })}
                        />

                        <span style={{ minWidth: '35px', textAlign: 'left' }}>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="player-right">
                    <button onClick={toggleMute} style={{...btnStyle, color: '#b3b3b3'}} title="Mute / Unmute">
                        <VolumeIcon volume={volume} />
                    </button>
                    <input
                        ref={volumeRef}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="custom-range"
                        style={Object.assign({}, { '--progress': `${volumeProgressPercent}%` }, { width: '100px' })}
                    />
                </div>
            </footer>

            {contextMenu.visible && (
                <div
                    className="context-menu"
                    style={{
                        top: contextMenu.y,
                        left: contextMenu.x,
                    }}
                >
                    {contextMenu.type === 'track' ? (
                        <>
                            <div className="context-menu-item" onClick={() => { enqueueTrack(contextMenu.data); setContextMenu({ ...contextMenu, visible: false }); }}>
                                Add to Queue
                            </div>
                            <div className="context-menu-item">
                                <span>Add to Playlist</span>
                                <span style={{ fontSize: '10px' }}>▶</span>
                                <div className="context-submenu">
                                    {Object.keys(playlistsData).length === 0 ? (
                                        <div className="context-menu-item disabled">No playlists</div>
                                    ) : (
                                        Object.keys(playlistsData).map((pName, i) => (
                                            <div 
                                                key={i} 
                                                className="context-menu-item"
                                                onClick={() => { 
                                                    handleAddTrackToPlaylist(pName, contextMenu.data); 
                                                    setContextMenu({ ...contextMenu, visible: false }); 
                                                }}
                                            >
                                                {pName}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            {viewMode.type === 'playlist' && (
                                <div className="context-menu-item" style={{ color: '#ff4444' }} onClick={() => { handleRemoveTrackFromPlaylist(viewMode.name, contextMenu.data.path); setContextMenu({ ...contextMenu, visible: false }); }}>
                                    Remove from Playlist
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="context-menu-item" style={{ color: '#ff4444' }} onClick={() => { handleDeletePlaylist(contextMenu.data); setContextMenu({ ...contextMenu, visible: false }); }}>
                            Delete Playlist
                        </div>
                    )}
                </div>
            )}
            <PerformanceModal
                isOpen={isPerfModalOpen}
                onClose={() => setIsPerformanceModalOpen(false)}
                playlist={playlist}
            />
        </div>
    );
}

const btnStyle = { background: 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s, color 0.2s' };
const PlayIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const NextIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;
const PrevIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>;
const ShuffleIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>;
const RepeatIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>;
const VolumeIcon = ({ volume }) => {
    if (volume === 0) return <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>;
    if (volume < 0.5) return <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>;
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>;
};
const MenuIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
const SettingsIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43,0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>;
const SearchIcon = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 12.01 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 12.01 14 9.5 14z"/></svg>;