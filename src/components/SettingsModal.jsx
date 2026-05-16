import { useState, useEffect, useRef } from 'react';

const Section = ({ title, children }) => (
    <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #282828' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '15px', color: '#1db954', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'normal' }}>{title}</h3>
        {children}
    </div>
);

const Toggle = ({ label, checked, onChange, disabled = false }) => (
    <label style={{ fontSize: '13px', color: disabled ? '#555' : '#b3b3b3', display: 'flex', alignItems: 'center', gap: '10px', cursor: disabled ? 'default' : 'pointer', marginBottom: '10px' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
        {label}
    </label>
);

const Slider = ({ label, value, min, max, step = 1, onChange, unit = '', disabled = false }) => {
    const [inputValue, setInputValue] = useState(String(value));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused && String(value) !== inputValue) {
            setInputValue(String(value));
        }
    }, [value, isFocused, inputValue]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        setIsFocused(false);
        let val = Number(inputValue);
        if (isNaN(val)) val = value;
        if (val < min) val = min;
        if (val > max) val = max;

        setInputValue(String(val));
        if (val !== value) {
            onChange(val);
        }
    };

    const handleInputFocus = () => {
        if (!disabled) setIsFocused(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    return (
        <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px', opacity: disabled ? 0.5 : 1 }}>
            <label style={{ fontSize: '13px', color: '#b3b3b3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {label}
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#242424', padding: '2px 10px', borderRadius: '12px', border: '1px solid #333' }}>
                    <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onFocus={handleInputFocus}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="number-input-capsule"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#1db954',
                            fontWeight: 'bold',
                            width: '45px',
                            textAlign: 'right',
                            outline: 'none',
                            fontSize: '13px',
                        }}
                    />
                    <span style={{ color: '#1db954', fontWeight: 'bold', marginLeft: '2px', fontSize: '12px' }}>{unit}</span>
                </div>
            </label>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} style={{ width: '100%', cursor: disabled ? 'default' : 'pointer' }} />
        </div>
    );
};

const Select = ({ label, value, options, onChange, disabled = false }) => (
    <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px', opacity: disabled ? 0.5 : 1 }}>
        <label style={{ fontSize: '13px', color: '#b3b3b3' }}>{label}</label>
        <select disabled={disabled} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#242424', color: '#fff', border: '1px solid #333', outline: 'none' }} value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const ColorPicker = ({ label, value, onChange, disabled = false }) => (
    <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: disabled ? 0.5 : 1 }}>
        <label style={{ fontSize: '13px', color: '#b3b3b3' }}>{label}</label>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', width: '30px', height: '30px', padding: 0 }} />
    </div>
);

const FilePicker = ({ label, onChange, accept, disabled = false }) => (
    <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px', opacity: disabled ? 0.5 : 1 }}>
        <label style={{ fontSize: '13px', color: '#b3b3b3' }}>{label}</label>
        <input type="file" accept={accept} disabled={disabled} onChange={(e) => {
            if (e.target.files[0]) {
                const file = e.target.files[0];
                const url = file.path ? `file://${file.path.split('\\').join('/')}` : URL.createObjectURL(file);
                onChange(url);
            }
        }} style={{ fontSize: '12px', color: '#fff' }} />
    </div>
);

const SELECT_OPTIONS_MAP = {
    logoSource: ['Album Cover', 'Custom Image'],
    logoShape: ['Round', 'Square'],
    logoFit: ['Fill Space (Default Cover)', 'Fit Without Cropping (Transparent Logo)'],
    bar1Channel: ['Both', 'Left', 'Right'],
    bar1Render: ['Normal', 'Mirror', 'Repeat'],
    bar1Mode: ['Circle', 'Linear', 'Triangle', 'Square'],
    bar1DrawType: ['Bars', 'Spline'],
    bar1Caps: ['Round', 'Square', 'Butt'],
    bar2Channel: ['Both', 'Left', 'Right'],
    bar2Render: ['Normal', 'Mirror', 'Repeat'],
    bar2Mode: ['Circle', 'Linear', 'Triangle', 'Square'],
    bar2DrawType: ['Bars', 'Spline'],
    bar2Caps: ['Round', 'Square', 'Butt'],
    bgType: ['Color (none)', 'Image', 'Slideshow', 'Video'],
    clockType: ['Digital (font)'],
    clockFont: ['Impact', 'Arial', 'Courier New', 'Times New Roman'],
    gridType: ['Circle', 'Square']
};

const AutoField = ({ k, v, onChange, disabled = false }) => {
    if (SELECT_OPTIONS_MAP[k]) return <Select label={k} value={v} options={SELECT_OPTIONS_MAP[k]} onChange={onChange} disabled={disabled} />;
    if (typeof v === 'boolean') return <Toggle label={k} checked={v} onChange={onChange} disabled={disabled} />;
    if (typeof v === 'number') {
        let min = 0, max = 1000, step = 1;
        if (k.toLowerCase().includes('opacity')) max = 100;
        if (k.toLowerCase().includes('multiplier')) { min = 0.5; max = 3; step = 0.01; }
        if (k.toLowerCase().includes('offset')) { min = -500; max = 500; }
        if (k.toLowerCase().includes('degrees')) max = 360;
        if (k.toLowerCase().includes('smoothing')) { min = 0; max = 1; step = 0.01; }
        return <Slider label={k} value={v} min={min} max={max} step={step} onChange={onChange} disabled={disabled} />;
    }
    if (typeof v === 'string' && v.startsWith('#')) return <ColorPicker label={k} value={v} onChange={onChange} disabled={disabled} />;
    return (
        <div style={{ marginBottom: '10px', opacity: disabled ? 0.5 : 1 }}>
            <label style={{ fontSize: '12px', color: '#888' }}>{k}</label>
            <input type="text" value={v || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{ width: '100%', padding: '8px', backgroundColor: '#242424', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
        </div>
    );
};

// Default preset
const STARDUST_PRESET = {
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

export default function SettingsModal({ isOpen, onClose, folders, onAddFolder, onRemoveFolder, visualizerSettings, setVisualizerSettings }) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState('Visualizer');
    const [activeVizSubTab, setActiveVizSubTab] = useState('Presets');
    const [presets, setPresets] = useState({});
    const [newPresetName, setNewPresetName] = useState('');
    const [editingPresetName, setEditingPresetName] = useState(null);
    const [tempEditingSettings, setTempEditingSettings] = useState(null);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const loadPresets = async () => {
            if (window.electronAPI && window.electronAPI.readVisualizerPresets) {
                const savedPresets = await window.electronAPI.readVisualizerPresets();
                // Merge com o Stardust imutável
                setPresets({ 'Stardust (Default)': STARDUST_PRESET, ...savedPresets });
            } else {
                setPresets({ 'Stardust (Default)': STARDUST_PRESET });
            }
        };
        if (isOpen) loadPresets();
    }, [isOpen]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
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
        if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'input') return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    if (!isOpen) return null;

    const handleSavePreset = async () => {
        if (!newPresetName.trim() || newPresetName.includes('Stardust')) return;
        const presetToSave = JSON.parse(JSON.stringify(visualizerSettings));
        const userPresets = { ...presets };
        delete userPresets['Stardust (Default)'];
        const updatedUserPresets = { ...userPresets, [newPresetName.trim()]: presetToSave };
        setPresets({ 'Stardust (Default)': STARDUST_PRESET, ...updatedUserPresets });
        if (window.electronAPI?.saveVisualizerPresets) await window.electronAPI.saveVisualizerPresets(updatedUserPresets);
        setNewPresetName('');
    };

    const handleLoadPreset = (name) => {
        if (presets[name]) setVisualizerSettings(presets[name]);
    };

    const handleDeletePreset = async (name) => {
        if (name === 'Stardust (Default)') return;
        const userPresets = { ...presets };
        delete userPresets['Stardust (Default)'];
        delete userPresets[name];
        setPresets({ 'Stardust (Default)': STARDUST_PRESET, ...userPresets });
        if (window.electronAPI?.saveVisualizerPresets) await window.electronAPI.saveVisualizerPresets(userPresets);
    };

    const startEditing = (name) => {
        if (name === 'Stardust (Default)') return;
        setEditingPresetName(name);
        setTempEditingSettings(JSON.parse(JSON.stringify(presets[name])));
    };

    const cancelEditing = () => {
        setEditingPresetName(null);
        setTempEditingSettings(null);
    };

    const saveEditing = async () => {
        const userPresets = { ...presets };
        delete userPresets['Stardust (Default)'];
        const updatedUserPresets = { ...userPresets, [editingPresetName]: tempEditingSettings };
        setPresets({ 'Stardust (Default)': STARDUST_PRESET, ...updatedUserPresets });
        if (window.electronAPI?.saveVisualizerPresets) await window.electronAPI.saveVisualizerPresets(updatedUserPresets);
        cancelEditing();
    };

    const updateTempField = (key, value) => {
        setTempEditingSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleDebugDump = async () => {
        if (window.electronAPI?.debugGetAllTracks) {
            const tracks = await window.electronAPI.debugGetAllTracks();
            console.log("=== DATABASE DUMP ===");
            console.table(tracks);
        }
    };

    const update = (key, value) => setVisualizerSettings(prev => ({ ...prev, [key]: value }));

    const s = visualizerSettings || {};
    const tabs = ['Visualizer', 'Library'];
    const vizSubTabs = ['Presets', 'Bars', 'Sound Effects', 'Background & 3D', 'Clock', 'Grid & Confetti'];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ backgroundColor: '#181818', borderRadius: '8px', width: '90%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid #282828', pointerEvents: 'auto', transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.05s ease-out' }}>

                <div style={{ padding: '15px 20px', borderBottom: '1px solid #282828', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0 }} onMouseDown={handleMouseDown}>
                    <h2 style={{ margin: 0, pointerEvents: 'none' }}>Settings</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                </div>

                <div className="settings-content-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div className="settings-sidebar" style={{ width: '180px', borderRight: '1px solid #282828', backgroundColor: '#121212', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: 'none', border: 'none',
                                    borderLeft: activeTab === tab ? '3px solid #1db954' : '3px solid transparent',
                                    color: activeTab === tab ? '#fff' : '#b3b3b3',
                                    padding: '15px 15px', cursor: 'pointer', textAlign: 'left',
                                    fontSize: '13px', fontWeight: activeTab === tab ? 'bold' : 'normal',
                                    transition: 'all 0.2s', outline: 'none'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="settings-main-area" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                        {activeTab === 'Visualizer' && (
                            <>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #282828', paddingBottom: '10px', flexWrap: 'wrap' }}>
                                    {vizSubTabs.map(sub => (
                                        <button key={sub} onClick={() => { setActiveVizSubTab(sub); cancelEditing(); }} style={{ background: activeVizSubTab === sub ? '#1db954' : '#282828', border: 'none', color: activeVizSubTab === sub ? '#000' : '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>{sub}</button>
                                    ))}
                                </div>

                                <div style={{ flex: 1 }}>
                                    {activeVizSubTab === 'Presets' && (
                                        editingPresetName ? (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                    <h3 style={{ color: '#fff', margin: 0 }}>Editing: {editingPresetName}</h3>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button onClick={cancelEditing} style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                                                        <button onClick={saveEditing} style={{ padding: '8px 16px', backgroundColor: '#1db954', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Save Changes</button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {Object.keys(tempEditingSettings).map(key => (
                                                        <AutoField key={key} k={key} v={tempEditingSettings[key]} onChange={(val) => updateTempField(key, val)} />
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Section title="Save Current Config as Preset">
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <input type="text" placeholder="Preset name" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', backgroundColor: '#242424', border: '1px solid #333', color: '#fff', outline: 'none' }} />
                                                        <button onClick={handleSavePreset} style={{ padding: '10px 20px', backgroundColor: '#1db954', border: 'none', color: '#000', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                                                    </div>
                                                </Section>
                                                <Section title="My Presets">
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {Object.keys(presets).map(name => (
                                                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#242424', borderRadius: '4px', border: '1px solid #333' }}>
                                                                <span style={{ color: '#fff', fontSize: '14px' }}>{name} {name === 'Stardust (Default)' && <span style={{fontSize: '10px', color: '#1db954', marginLeft: '5px'}}>(System)</span>}</span>
                                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                                    <button onClick={() => handleLoadPreset(name)} style={{ padding: '5px 12px', backgroundColor: '#1db954', border: 'none', color: '#000', borderRadius: '12px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Apply</button>
                                                                    {name !== 'Stardust (Default)' && (
                                                                        <>
                                                                            <button onClick={() => startEditing(name)} style={{ padding: '5px 12px', backgroundColor: '#333', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                                                                            <button onClick={() => handleDeletePreset(name)} style={{ padding: '5px 12px', backgroundColor: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '12px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Section>
                                            </>
                                        )
                                    )}

                                    {activeVizSubTab === 'Bars' && (
                                        <>
                                            <Section title="Center Logo (Cover / Image)">
                                                <Select label="Image Source" value={s.logoSource ?? 'Album Cover'} options={['Album Cover', 'Custom Image']} onChange={v => update('logoSource', v)} />
                                                {s.logoSource === 'Custom Image' && (
                                                    <FilePicker label="Choose Custom Image" accept="image/*" onChange={v => update('customLogoImage', v)} />
                                                )}
                                                <Slider label="Image Size" value={s.logoSize ?? 280} min={0} max={1000} onChange={v => update('logoSize', v)} />
                                                <Slider label="X Position (Offset)" value={s.logoOffsetX ?? 0} min={-500} max={500} onChange={v => update('logoOffsetX', v)} />
                                                <Slider label="Y Position (Offset)" value={s.logoOffsetY ?? 0} min={-500} max={500} onChange={v => update('logoOffsetY', v)} />
                                                <Select label="Image Shape" value={s.logoShape ?? 'Round'} options={['Round', 'Square']} onChange={v => update('logoShape', v)} />
                                                <Select label="Image Fit" value={s.logoFit ?? 'Fill Space (Default Cover)'} options={['Fill Space (Default Cover)', 'Fit Without Cropping (Transparent Logo)']} onChange={v => update('logoFit', v)} />
                                                <Toggle label="Enable Image Shadow (Drop Shadow)" checked={s.logoShadowEnabled ?? true} onChange={v => update('logoShadowEnabled', v)} />
                                            </Section>

                                            <Section title="Main Colors">
                                                <Toggle label="Use Solid Color (Instead of Gradient)" checked={s.useSolidColor ?? false} onChange={v => update('useSolidColor', v)} />
                                                {s.useSolidColor ? (
                                                    <ColorPicker label="Solid Color" value={s.solidColor ?? '#1db954'} onChange={v => update('solidColor', v)} />
                                                ) : (
                                                    <>
                                                        <Slider label="Start Hue" value={s.baseHue ?? 280} min={0} max={360} onChange={v => update('baseHue', v)} />
                                                        <Slider label="End Hue" value={s.endHue ?? 360} min={0} max={360} onChange={v => update('endHue', v)} />
                                                    </>
                                                )}
                                            </Section>

                                            <Section title="Bar Visualizer 1">
                                                <Toggle label="Bar Visualizer 1 : Enabled" checked={s.bar1Enabled ?? true} onChange={v => update('bar1Enabled', v)} />
                                                <Slider label="X Position (Offset)" value={s.bar1OffsetX ?? 0} min={-500} max={500} onChange={v => update('bar1OffsetX', v)} />
                                                <Slider label="Y Position (Offset)" value={s.bar1OffsetY ?? 0} min={-500} max={500} onChange={v => update('bar1OffsetY', v)} />
                                                <Slider label="# Data points" value={s.bar1DataPoints ?? 64} min={16} max={256} onChange={v => update('bar1DataPoints', v)} />
                                                <Select label="Sound Channel" value={s.bar1Channel ?? 'Both'} options={['Both', 'Left', 'Right']} onChange={v => update('bar1Channel', v)} />
                                                <Select label="Channel render" value={s.bar1Render ?? 'Normal'} options={['Normal', 'Mirror', 'Repeat']} onChange={v => update('bar1Render', v)} />
                                                <Toggle label="Reverse the channel data" checked={s.bar1Reverse ?? false} onChange={v => update('bar1Reverse', v)} />
                                                <Slider label="Strength multiplier" value={s.bar1Strength ?? 100} min={10} max={300} onChange={v => update('bar1Strength', v)} />
                                                <Slider label="Bar width" value={s.bar1Width ?? 10} min={1} max={30} onChange={v => update('bar1Width', v)} />
                                                <Slider label="Gap size between bars" value={s.bar1Gap ?? 20} min={0} max={50} onChange={v => update('bar1Gap', v)} />
                                                <Slider label="Opacity of the Visual" value={s.bar1Opacity ?? 100} min={0} max={100} unit="%" onChange={v => update('bar1Opacity', v)} />
                                                <Slider label="Rotation (degrees)" value={s.bar1Rotation ?? 0} min={0} max={360} onChange={v => update('bar1Rotation', v)} />
                                                <Slider label="Height limit (0 = disabled)" value={s.bar1HeightLimit ?? 0} min={0} max={1000} onChange={v => update('bar1HeightLimit', v)} />
                                                <Select label="Visual mode" value={s.bar1Mode ?? 'Circle'} options={['Circle', 'Linear', 'Triangle', 'Square']} onChange={v => update('bar1Mode', v)} />
                                                <Select label="Draw type" value={s.bar1DrawType ?? 'Bars'} options={['Bars', 'Spline']} onChange={v => update('bar1DrawType', v)} />
                                                {s.bar1Mode !== 'Linear' && (
                                                    <>
                                                        <Slider label="Size (Radius/Base)" value={s.bar1CircleSize ?? 200} min={50} max={800} onChange={v => update('bar1CircleSize', v)} />
                                                        <Slider label="Arc degrees" value={s.bar1ArcDegrees ?? 360} min={10} max={360} onChange={v => update('bar1ArcDegrees', v)} />
                                                        <Toggle label="Enable rotation" checked={s.bar1Rotate ?? true} onChange={v => update('bar1Rotate', v)} />
                                                        {s.bar1Rotate && (
                                                            <>
                                                                <Toggle label="Rotate counter clockwise" checked={s.bar1RotateCCW ?? false} onChange={v => update('bar1RotateCCW', v)} />
                                                                <Slider label="Rotation duration (sec)" value={s.bar1RotDuration ?? 30} min={1} max={120} onChange={v => update('bar1RotDuration', v)} />
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                                <Select label="Line caps type" value={s.bar1Caps ?? 'Round'} options={['Round', 'Square', 'Butt']} onChange={v => update('bar1Caps', v)} />
                                            </Section>

                                            <Section title="Bar Visualizer 2">
                                                <Toggle label="Bar Visualizer 2 : Enabled" checked={s.bar2Enabled ?? true} onChange={v => update('bar2Enabled', v)} />
                                                <Slider label="X Position (Offset)" value={s.bar2OffsetX ?? 0} min={-500} max={500} onChange={v => update('bar2OffsetX', v)} />
                                                <Slider label="Y Position (Offset)" value={s.bar2OffsetY ?? 0} min={-500} max={500} onChange={v => update('bar2OffsetY', v)} />
                                                <Slider label="# Data points" value={s.bar2DataPoints ?? 64} min={16} max={256} onChange={v => update('bar2DataPoints', v)} />
                                                <Select label="Sound Channel" value={s.bar2Channel ?? 'Both'} options={['Both', 'Left', 'Right']} onChange={v => update('bar2Channel', v)} />
                                                <Select label="Channel render" value={s.bar2Render ?? 'Repeat'} options={['Normal', 'Mirror', 'Repeat']} onChange={v => update('bar2Render', v)} />
                                                <Toggle label="Reverse the channel data" checked={s.bar2Reverse ?? false} onChange={v => update('bar2Reverse', v)} />
                                                <Slider label="Strength multiplier" value={s.bar2Strength ?? 100} min={10} max={300} onChange={v => update('bar2Strength', v)} />
                                                <Slider label="Bar width" value={s.bar2Width ?? 10} min={1} max={30} onChange={v => update('bar2Width', v)} />
                                                <Slider label="Gap size between bars" value={s.bar2Gap ?? 20} min={0} max={50} onChange={v => update('bar2Gap', v)} />
                                                <Slider label="Opacity of the Visual" value={s.bar2Opacity ?? 30} min={0} max={100} unit="%" onChange={v => update('bar2Opacity', v)} />
                                                <Slider label="Rotation (degrees)" value={s.bar2Rotation ?? 0} min={0} max={360} onChange={v => update('bar2Rotation', v)} />
                                                <Slider label="Height limit (0 = disabled)" value={s.bar2HeightLimit ?? 0} min={0} max={1000} onChange={v => update('bar2HeightLimit', v)} />
                                                <Select label="Visual mode" value={s.bar2Mode ?? 'Circle'} options={['Circle', 'Linear', 'Triangle', 'Square']} onChange={v => update('bar2Mode', v)} />
                                                <Select label="Draw type" value={s.bar2DrawType ?? 'Bars'} options={['Bars', 'Spline']} onChange={v => update('bar2DrawType', v)} />
                                                {s.bar2Mode !== 'Linear' && (
                                                    <>
                                                        <Slider label="Size (Radius/Base)" value={s.bar2CircleSize ?? 500} min={50} max={800} onChange={v => update('bar2CircleSize', v)} />
                                                        <Slider label="Arc degrees" value={s.bar2ArcDegrees ?? 360} min={10} max={360} onChange={v => update('bar2ArcDegrees', v)} />
                                                        <Toggle label="Enable rotation" checked={s.bar2Rotate ?? true} onChange={v => update('bar2Rotate', v)} />
                                                        {s.bar2Rotate && (
                                                            <>
                                                                <Toggle label="Rotate counter clockwise" checked={s.bar2RotateCCW ?? true} onChange={v => update('bar2RotateCCW', v)} />
                                                                <Slider label="Rotation duration (sec)" value={s.bar2RotDuration ?? 30} min={1} max={120} onChange={v => update('bar2RotDuration', v)} />
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                                <Select label="Line caps type" value={s.bar2Caps ?? 'Round'} options={['Round', 'Square', 'Butt']} onChange={v => update('bar2Caps', v)} />
                                            </Section>
                                        </>
                                    )}

                                    {activeVizSubTab === 'Sound Effects' && (
                                        <>
                                            <Section title="General Effects">
                                                <Slider label="Audio Smooth Delay (ms)" value={s.audioSmoothDelay ?? 50} min={0} max={200} onChange={v => update('audioSmoothDelay', v)} />
                                                <Toggle label="Enable glow (Neon Shadow)" checked={s.effGlow ?? true} onChange={v => update('effGlow', v)} />
                                                <Toggle label="Color effects (Rotate Color)" checked={s.effColorEffects ?? false} onChange={v => update('effColorEffects', v)} />
                                            </Section>
                                            <Section title="Physics: Bounce (Pulse on Beat)">
                                                <Toggle label="Enable Bounce on Beat" checked={s.effBounce ?? false} onChange={v => update('effBounce', v)} />
                                                {s.effBounce && (
                                                    <div style={{ marginLeft: '10px', paddingLeft: '10px', borderLeft: '2px solid #282828' }}>
                                                        <Slider label="Bounce Strength (Foreground & Logo)" value={s.fgBounceIntensity ?? 50} min={0} max={100} unit="%" onChange={v => update('fgBounceIntensity', v)} />
                                                        <Slider label="Bounce Strength (Background)" value={s.bgBounceIntensity ?? 0} min={0} max={100} unit="%" onChange={v => update('bgBounceIntensity', v)} />
                                                    </div>
                                                )}
                                            </Section>
                                            <Section title="Physics: Shake (Tremble on Bass)">
                                                <Toggle label="Enable Shake on Bass" checked={s.effShake ?? false} onChange={v => update('effShake', v)} />
                                                {s.effShake && (
                                                    <div style={{ marginLeft: '10px', paddingLeft: '10px', borderLeft: '2px solid #282828' }}>
                                                        <Slider label="Shake Strength (Foreground & Logo)" value={s.fgShakeIntensity ?? 50} min={0} max={100} unit="%" onChange={v => update('fgShakeIntensity', v)} />
                                                        <Slider label="Shake Strength (Background)" value={s.bgShakeIntensity ?? 0} min={0} max={100} unit="%" onChange={v => update('bgShakeIntensity', v)} />
                                                    </div>
                                                )}
                                            </Section>
                                            <Section title="Built-in Equalizer">
                                                <Toggle label="Equalizer : Enabled" checked={s.eqEnabled ?? true} onChange={v => update('eqEnabled', v)} />
                                                <Toggle label="Use EQ for effects" checked={s.eqUseForEffects ?? false} onChange={v => update('eqUseForEffects', v)} />
                                                <Slider label="~200hz" value={s.eq200 ?? 100} min={0} max={300} onChange={v => update('eq200', v)} />
                                                <Slider label="~400hz" value={s.eq400 ?? 100} min={0} max={300} onChange={v => update('eq400', v)} />
                                                <Slider label="~750hz" value={s.eq750 ?? 100} min={0} max={300} onChange={v => update('eq750', v)} />
                                                <Slider label="~1.5khz" value={s.eq1500 ?? 100} min={0} max={300} onChange={v => update('eq1500', v)} />
                                                <Slider label="~3khz" value={s.eq3000 ?? 100} min={0} max={300} onChange={v => update('eq3000', v)} />
                                                <Slider label="~6khz" value={s.eq6000 ?? 100} min={0} max={300} onChange={v => update('eq6000', v)} />
                                                <Slider label="~9khz" value={s.eq9000 ?? 100} min={0} max={300} onChange={v => update('eq9000', v)} />
                                                <Slider label="~12khz" value={s.eq12000 ?? 100} min={0} max={300} onChange={v => update('eq12000', v)} />
                                            </Section>
                                        </>
                                    )}

                                    {activeVizSubTab === 'Background & 3D' && (
                                        <>
                                            <Section title="Background">
                                                <Toggle label="Background : Enabled" checked={s.bgEnabled ?? true} onChange={v => update('bgEnabled', v)} />
                                                <Select label="Background type" value={s.bgType ?? 'Color (none)'} options={['Color (none)', 'Image', 'Slideshow', 'Video']} onChange={v => update('bgType', v)} />
                                                {s.bgType === 'Color (none)' && <ColorPicker label="Background color" value={s.bgColor ?? '#000000'} onChange={v => update('bgColor', v)} />}
                                                {s.bgType === 'Image' && (
                                                    <>
                                                        <FilePicker label="Background Image" accept="image/*" onChange={v => update('bgImage', v)} />
                                                        <Toggle label="Scale to fit (instead of cover)" checked={s.bgScaleToFit ?? false} onChange={v => update('bgScaleToFit', v)} />
                                                    </>
                                                )}
                                                {s.bgType === 'Slideshow' && (
                                                    <>
                                                        <div style={{ marginBottom: '15px' }}>
                                                            <label style={{ fontSize: '13px', color: '#b3b3b3', display: 'block', marginBottom: '5px' }}>Image Folder</label>
                                                            <button onClick={async () => {
                                                                if (window.electronAPI) {
                                                                    const folderPath = await window.electronAPI.selectFolder();
                                                                    if (folderPath) update('bgSlideshowFolder', folderPath);
                                                                }
                                                            }} style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>{s.bgSlideshowFolder ? s.bgSlideshowFolder : 'Select directory'}</button>
                                                        </div>
                                                        <Slider label="Duration for image to show (seconds)" value={s.bgSlideshowDur ?? 10} min={1} max={120} onChange={v => update('bgSlideshowDur', v)} />
                                                        <Slider label="Duration of fade (seconds)" value={s.bgSlideshowFade ?? 3} min={0} max={10} onChange={v => update('bgSlideshowFade', v)} />
                                                        <Toggle label="Scale to fit (instead of cover)" checked={s.bgScaleToFit ?? false} onChange={v => update('bgScaleToFit', v)} />
                                                    </>
                                                )}
                                                {s.bgType === 'Video' && (
                                                    <>
                                                        <FilePicker label="Video File (WebM/MP4)" accept="video/webm,video/mp4" onChange={v => update('bgVideo', v)} />
                                                        <Slider label="Sound volume (%)" value={s.bgVideoVolume ?? 0} min={0} max={100} onChange={v => update('bgVideoVolume', v)} />
                                                        <Slider label="Playback speed (%)" value={s.bgVideoSpeed ?? 100} min={50} max={400} onChange={v => update('bgVideoSpeed', v)} />
                                                        <Toggle label="Pause video when visualizer is idle" checked={s.bgPauseIdle ?? false} onChange={v => update('bgPauseIdle', v)} />
                                                        <Toggle label="Scale to fit (instead of cover)" checked={s.bgScaleToFit ?? false} onChange={v => update('bgScaleToFit', v)} />
                                                    </>
                                                )}
                                            </Section>
                                            <Section title="Perspective">
                                                <Toggle label="Perspective : Enabled" checked={s.bgPerspective ?? true} onChange={v => update('bgPerspective', v)} />
                                                <Slider label="Perspective strength" value={s.bgPerspectiveStrength ?? 25} min={0} max={100} onChange={v => update('bgPerspectiveStrength', v)} />
                                                <Slider label="Perspective distance (pixels)" value={s.bgPerspectiveDist ?? 1000} min={100} max={3000} onChange={v => update('bgPerspectiveDist', v)} />
                                                <Toggle label="Set static perspective (ignore cursor)" checked={s.bgPerspectiveStatic ?? false} onChange={v => update('bgPerspectiveStatic', v)} />
                                            </Section>
                                        </>
                                    )}

                                    {activeVizSubTab === 'Clock' && (
                                        <Section title="Clock">
                                            <Toggle label="Clock : Enabled" checked={s.clockEnabled ?? true} onChange={v => update('clockEnabled', v)} />
                                            <ColorPicker label="Clock color" value={s.clockColor ?? '#ffffff'} onChange={v => update('clockColor', v)} />
                                            <Select label="Clock type" value={s.clockType ?? 'Digital (font)'} options={['Digital (font)']} onChange={v => update('clockType', v)} />
                                            <Toggle label="Use 24 Hour clock" checked={s.clock24h ?? true} onChange={v => update('clock24h', v)} />
                                            <Toggle label="Show seconds" checked={s.clockSecs ?? true} onChange={v => update('clockSecs', v)} />
                                            <Toggle label="Show separator symbol(s)" checked={s.clockSep ?? true} onChange={v => update('clockSep', v)} />
                                            <Slider label="Clock scale (%)" value={s.clockScale ?? 25} min={1} max={100} onChange={v => update('clockScale', v)} />
                                            <Slider label="Clock X offset (%)" value={s.clockOffsetX ?? 0} min={-100} max={100} onChange={v => update('clockOffsetX', v)} />
                                            <Slider label="Clock Y offset (%)" value={s.clockOffsetY ?? 0} min={-100} max={100} onChange={v => update('clockOffsetY', v)} />
                                            <Select label="Text font" value={s.clockFont ?? 'Impact'} options={['Impact', 'Arial', 'Courier New', 'Times New Roman']} onChange={v => update('clockFont', v)} />
                                        </Section>
                                    )}

                                    {activeVizSubTab === 'Grid & Confetti' && (
                                        <>
                                            <Section title="Confetti">
                                                <Toggle label="Confetti : Enabled" checked={s.confettiEnabled ?? true} onChange={v => update('confettiEnabled', v)} />
                                                <Slider label="Minimum soundlevel" value={s.confettiMinSound ?? 100} min={0} max={300} onChange={v => update('confettiMinSound', v)} />
                                                <Slider label="Confetti size" value={s.confettiSize ?? 20} min={1} max={100} onChange={v => update('confettiSize', v)} />
                                                <Slider label="Burst size" value={s.confettiBurstSize ?? 10} min={1} max={50} onChange={v => update('confettiBurstSize', v)} />
                                                <Slider label="Animation speed" value={s.confettiSpeed ?? 100} min={10} max={300} onChange={v => update('confettiSpeed', v)} />
                                            </Section>
                                            <Section title="Animated Grid">
                                                <Toggle label="Animated Grid : Enabled" checked={s.gridEnabled ?? true} onChange={v => update('gridEnabled', v)} />
                                                <ColorPicker label="Grid color" value={s.gridColor ?? '#ffffff'} onChange={v => update('gridColor', v)} />
                                                <Slider label="'points' on X-axis" value={s.gridPointsX ?? 21} min={5} max={50} onChange={v => update('gridPointsX', v)} />
                                                <Slider label="'points' on Y-axis" value={s.gridPointsY ?? 12} min={5} max={50} onChange={v => update('gridPointsY', v)} />
                                                <Select label="Point Type" value={s.gridType ?? 'Circle'} options={['Circle', 'Square']} onChange={v => update('gridType', v)} />
                                                <Slider label="Visibility (%)" value={s.gridVis ?? 80} min={0} max={100} onChange={v => update('gridVis', v)} />
                                            </Section>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'Library' && (
                            <>
                                <Section title="Local Music Folders">
                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>The player will automatically search for your music (.mp3, .wav) in these folders.</p>
                                    <div style={{ backgroundColor: '#121212', border: '1px solid #282828', borderRadius: '4px', padding: '10px', maxHeight: '150px', overflowY: 'auto', marginBottom: '15px' }}>
                                        {(!folders || folders.length === 0) ? (
                                            <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '20px 0' }}>No folders configured.</p>
                                        ) : (
                                            folders.map((folder, index) => (
                                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #282828' }}>
                                                    <span style={{ fontSize: '13px', wordBreak: 'break-all', marginRight: '10px', color: '#ccc' }}>📁 {folder}</span>
                                                    <button onClick={() => onRemoveFolder(folder)} style={{ background: 'none', border: '1px solid #888', color: '#888', borderRadius: '12px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <button onClick={onAddFolder} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #1db954', color: '#1db954', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Folder</button>
                                </Section>
                                <Section title="Database and Cache">
                                    <button onClick={handleDebugDump} style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Dump Database (Console)</button>
                                </Section>
                                <Section title="System">
                                    <Toggle label="Show FPS Counter" checked={s.showFps ?? false} onChange={v => update('showFps', v)} />
                                </Section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}