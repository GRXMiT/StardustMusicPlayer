import React, { useEffect, useRef } from 'react';

// =======================================================
// CONFIGURAÇÕES PADRÃO
// =======================================================
const DEFAULT_SETTINGS = {
    // Bars
    bar1Enabled: true, bar1DataPoints: 16, bar1Channel: 'Both', bar1Render: 'Normal', bar1Reverse: false, bar1Strength: 25, bar1Width: 8, bar1Gap: 4, bar1Opacity: 100, bar1Rotation: 0, bar1HeightLimit: 0, bar1Mode: 'Square', bar1DrawType: 'Bars', bar1CircleSize: 132, bar1ArcDegrees: 360, bar1Rotate: false, bar1RotateCCW: false, bar1RotDuration: 60, bar1Caps: 'Round', bar1OffsetX: 0, bar1OffsetY: 0,
    bar2Enabled: false, bar2DataPoints: 256, bar2Channel: 'Both', bar2Render: 'Repeat', bar2Reverse: false, bar2Strength: 75, bar2Width: 10, bar2Gap: 20, bar2Opacity: 100, bar2Rotation: 0, bar2HeightLimit: 0, bar2Mode: 'Linear', bar2DrawType: 'Bars', bar2CircleSize: 50, bar2ArcDegrees: 360, bar2Rotate: true, bar2RotateCCW: true, bar2RotDuration: 30, bar2Caps: 'Round', bar2OffsetX: 0, bar2OffsetY: 0,

    // Background & Visuals
    bgEnabled: false, bgType: 'Video', bgColor: '#ffffff', bgImage: null, bgVideo: null, bgScaleToFit: true, bgVideoVolume: 0, bgVideoSpeed: 100, bgPauseIdle: false, bgSlideshowDur: 10, bgSlideshowFade: 3, bgSlideshowFolder: '', bgPerspective: false, bgPerspectiveStrength: 30, bgPerspectiveDist: 1000, bgPerspectiveStatic: false,
    gridEnabled: false, gridColor: '#f6f4f4', gridPointsX: 30, gridPointsY: 20, gridType: 'Square', gridVis: 80,

    // Clock & Logo
    clockEnabled: false, clockColor: '#ffffff', clock24h: true, clockSecs: true, clockSep: true, clockScale: 93, clockOffsetX: 0, clockOffsetY: 0, clockFont: 'Impact',
    logoSource: 'Album Cover', customLogoImage: null, logoSize: 297, logoShape: 'Square', logoFit: 'Fill Space (Default Cover)', logoShadowEnabled: true, logoOffsetX: 0, logoOffsetY: 0,

    // Audio & Effects
    confettiEnabled: true, confettiMinSound: 150, confettiSize: 15, confettiBurstSize: 36, confettiSpeed: 100,
    audioSmoothDelay: 0, effGlow: false, effShake: true, effBounce: true, effColorEffects: true,
    eqEnabled: true, eqUseForEffects: true, eq200: 100, eq400: 100, eq750: 100, eq1500: 100, eq3000: 100, eq6000: 100, eq9000: 100, eq12000: 100,

    // Colors & Intensities
    useSolidColor: true, solidColor: '#ffffff', baseHue: 360, endHue: 1,
    fgBounceIntensity: 50, bgBounceIntensity: 0, fgShakeIntensity: 15, bgShakeIntensity: 0,
    showFps: false
};

// ============================================================
// ENGINE DE ÁUDIO - Float32Array Nativo
// ============================================================
class ArthesianAudioEngine {
    constructor() {
        this.enabled = true;
        this.isIdle = false;
        this.pinkNoise = new Float32Array([
            1.176, 0.852, 0.688, 0.637, 0.545, 0.507, 0.467, 0.442, 0.419, 0.415, 0.413, 0.406,
            0.399, 0.382, 0.383, 0.374, 0.365, 0.376, 0.397, 0.393, 0.379, 0.394, 0.385, 0.390,
            0.381, 0.402, 0.402, 0.399, 0.397, 0.511, 0.661, 0.663, 0.741, 0.746, 0.847, 0.857,
            0.963, 0.998, 1.062, 1.105, 1.181, 1.257, 1.322, 1.373, 1.495, 1.531, 1.619, 1.709,
            1.770, 1.849, 1.923, 2.014, 2.078, 2.157, 2.219, 2.266, 2.320, 2.357, 2.398, 2.404,
            2.428, 2.391, 2.403, 2.361
        ]);
        this.rawData     = new Float32Array(128);
        this.smoothedData = new Float32Array(128);
        this.mixedBuffer = new Float32Array(256);
        this.outBuffer   = new Float32Array(256);
        this.eq = new Float32Array(8).fill(1);
    }

    processRawAudio(data, smoothingDelayMs, applyEQ) {
        if (!this.enabled || !data) return;
        let sum = 0;
        const sf = Math.max(0.01, Math.min(1, 1 - ((Number(smoothingDelayMs) || 50) / 200)));
        const eq = this.eq;

        for (let i = 0; i < 64; i++) {
            const pNoise  = this.pinkNoise[i] || 1;
            let left  = (data[i] / 255.0 * 1.5) / pNoise;
            let right = ((data[i + 64] !== undefined ? data[i + 64] : data[i]) / 255.0 * 1.5) / pNoise;

            if (applyEQ) {
                const eqVal = eq[Math.min(7, (i >> 3))];
                left  *= eqVal; right *= eqVal;
            }
            sum += left + right;

            this.smoothedData[i]      += (left  - this.smoothedData[i])      * sf;
            this.smoothedData[i + 64] += (right - this.smoothedData[i + 64]) * sf;
            this.rawData[i]      = this.smoothedData[i];
            this.rawData[i + 64] = this.smoothedData[i + 64];
        }
        this.isIdle = (sum / 128) < 0.01;
    }

    mixChannels(channel, option, reverse, outLength) {
        const raw = this.rawData;
        const mb  = this.mixedBuffer;
        let len = 0;

        if (option === 'Mirror') {
            if (channel === 'Left') {
                for (let i = 0; i < 64; i++) { mb[i] = raw[i]; mb[64 + i] = raw[63 - i]; }
            } else if (channel === 'Right') {
                for (let i = 0; i < 64; i++) { mb[i] = raw[64 + i]; mb[64 + i] = raw[127 - i]; }
            } else {
                for (let i = 0; i < 64; i++) { mb[i] = raw[i]; mb[64 + i] = raw[127 - i]; }
            }
            len = 128;
        } else if (option === 'Repeat') {
            if (channel === 'Left') {
                for (let i = 0; i < 64; i++) { mb[i] = raw[i]; mb[64 + i] = raw[i]; }
            } else if (channel === 'Right') {
                for (let i = 0; i < 64; i++) { mb[i] = raw[64 + i]; mb[64 + i] = raw[64 + i]; }
            } else {
                for (let i = 0; i < 128; i++) mb[i] = raw[i];
            }
            len = 128;
        } else {
            if (channel === 'Left') {
                for (let i = 0; i < 64; i++) mb[i] = raw[i];
            } else if (channel === 'Right') {
                for (let i = 0; i < 64; i++) mb[i] = raw[64 + i];
            } else {
                for (let i = 0; i < 64; i++) mb[i] = (raw[i] + raw[64 + i]) * 0.5;
            }
            len = 64;
        }

        if (reverse) {
            const half = len >> 1;
            for (let i = 0; i < half; i++) {
                const t = mb[i]; mb[i] = mb[len - 1 - i]; mb[len - 1 - i] = t;
            }
        }
        return this._interpolate(mb, len, this.outBuffer, Math.max(4, outLength | 0));
    }

    getBaseMultiplier(minS, maxS) {
        let bass = 0;
        const raw = this.rawData;
        for (let i = minS; i < maxS; i++) bass += raw[i] + raw[i + 64];
        const r = bass / ((maxS - minS) * 2) + 1;
        return isNaN(r) ? 1 : r;
    }

    _interpolate(src, srcLen, dst, dstLen) {
        if (srcLen === dstLen) { dst.set(src.subarray(0, srcLen)); return dst; }
        const sf = (srcLen - 1) / (dstLen - 1);
        dst[0] = src[0];
        for (let i = 1; i < dstLen - 1; i++) {
            const tmp = i * sf;
            const b = tmp | 0;
            dst[i] = src[b] + (src[b + 1] - src[b]) * (tmp - b);
        }
        dst[dstLen - 1] = src[srcLen - 1];
        return dst;
    }
}

// Memory Pool
class ParticlePool {
    constructor(maxSize = 600) {
        this._pool = [];
        this._active = [];
        this._max = maxSize;
        for (let i = 0; i < maxSize; i++) {
            this._pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0 });
        }
    }
    spawn(x, y, vx, vy, size) {
        if (this._active.length >= this._max) return;
        const p = this._pool.length ? this._pool.pop() : { x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0 };
        p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 1.0; p.size = size;
        this._active.push(p);
    }
    update() {
        let write = 0;
        for (let i = 0; i < this._active.length; i++) {
            const p = this._active[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.02;
            if (p.life > 0) {
                this._active[write++] = p;
            } else {
                this._pool.push(p);
            }
        }
        this._active.length = write;
    }
}

const AudioVisualizer = React.memo(({ isPlaying, currentTrack, audioRef, settings }) => {
    const containerRef   = useRef(null);
    const canvasRef      = useRef(null);
    const bgContainerRef = useRef(null);
    const bgVideoRef     = useRef(null);
    const statsCanvasRef = useRef(null);
    const centerLogoRef  = useRef(null);

    const audioCtxRef   = useRef(null);
    const analyserRef   = useRef(null);

    const dataArrayRef  = useRef(new Uint8Array(256));
    const engineRef     = useRef(new ArthesianAudioEngine());

    const confRef       = useRef({ ...DEFAULT_SETTINGS, ...(settings || {}) });
    const isPlayingRef  = useRef(isPlaying);
    const mousePos      = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    const fpsRef        = useRef({ last: performance.now(), fps: 60, ms: 16 });
    const frameTimes    = useRef(new Float32Array(150));

    const state = useRef({
        currentScale: 1.0, bgScale: 1.0, globalHueOffset: 0,
        shakeX: 0, shakeY: 0, shakeIntensity: 0,
        bgShakeX: 0, bgShakeY: 0, bgShakeIntensity: 0,
        rotBar1: 0, rotBar2: 0, lastTime: 0, frameIdx: 0, lastStatsDraw: 0, lastClockUpdate: 0,
        clockCache: "00:00",
        gridPoints: [], gridDirty: true,
        particles: new ParticlePool(600),
        splineR: Array.from({ length: 256 }, () => ({ x: 0, y: 0 })),
        splineL: Array.from({ length: 256 }, () => ({ x: 0, y: 0 }))
    });

    const animationId = useRef(null);

    useEffect(() => { Object.assign(confRef.current, DEFAULT_SETTINGS, settings || {}); state.current.gridDirty = true; }, [settings]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    useEffect(() => {
        const onMove = (e) => { mousePos.current.x = e.clientX; mousePos.current.y = e.clientY; };
        window.addEventListener('mousemove', onMove, { passive: true });
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    useEffect(() => {
        if (!audioRef?.current) return;
        try {
            if (!audioRef.current._audioCtx) {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.0;
                const source = ctx.createMediaElementSource(audioRef.current);
                source.connect(analyser);
                analyser.connect(ctx.destination);
                audioRef.current._audioCtx = ctx;
                audioRef.current._analyser  = analyser;
            }
            audioCtxRef.current  = audioRef.current._audioCtx;
            analyserRef.current  = audioRef.current._analyser;
            if (isPlaying && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        } catch (e) { console.error('Web Audio connect error:', e); }
    }, [audioRef, isPlaying]);

    useEffect(() => {
        const v = bgVideoRef.current;
        const activeConf = settings || DEFAULT_SETTINGS;
        if (!v || activeConf.bgType !== 'Video') return;
        v.volume       = (Number(activeConf.bgVideoVolume) || 0) / 100;
        v.playbackRate = (Number(activeConf.bgVideoSpeed)  || 100) / 100;
        if (isPlaying) v.play().catch(() => {});
        else v.pause();
    }, [settings, isPlaying]);

    // ============================================================
    // RENDER LOOP NATIVO - HTML5 CANVAS 2D (MAX PERF)
    // ============================================================
    useEffect(() => {
        const canvas    = canvasRef.current;
        const container = containerRef.current;
        const bgContainer = bgContainerRef.current;
        if (!canvas || !container || !bgContainer) return;

        const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false, desynchronized: true });
        const engine = engineRef.current;
        const st     = state.current;

        const resize = () => {
            canvas.width  = container.clientWidth  || window.innerWidth;
            canvas.height = container.clientHeight || window.innerHeight;
            mousePos.current.x = canvas.width  / 2;
            mousePos.current.y = canvas.height / 2;
            st.gridDirty = true;
        };
        const resizeObs = new ResizeObserver(resize);
        resizeObs.observe(container);
        resize();

        const statsCtx = statsCanvasRef.current?.getContext('2d');

        const buildGrid = () => {
            st.gridPoints = [];
            const cfg  = confRef.current;
            if (!cfg.gridEnabled) return;
            const gw = canvas.width;
            const gh = canvas.height;
            const ptsX = Number(cfg.gridPointsX) || 20;
            const ptsY = Number(cfg.gridPointsY) || 12;
            for (let x = 0; x < ptsX; x++) {
                for (let y = 0; y < ptsY; y++) {
                    const px = (x / ptsX) * gw + Math.random() * 50;
                    const py = (y / ptsY) * gh + Math.random() * 50;
                    st.gridPoints.push({ x: px, y: py, ox: px, oy: py, active: 0 });
                }
            }
            st.gridDirty = false;
        };

        const renderLoop = (timestamp) => {
            animationId.current = requestAnimationFrame(renderLoop);

            const now = performance.now();
            const dm  = now - fpsRef.current.last;
            fpsRef.current.last = now;
            fpsRef.current.ms   = dm;
            fpsRef.current.fps  = 1000 / dm | 0;
            frameTimes.current[st.frameIdx++ % 150] = dm;

            if (!st.lastTime) st.lastTime = timestamp;
            st.lastTime = timestamp;

            const cfg     = confRef.current;
            const playing = isPlayingRef.current;
            const w = canvas.width, h = canvas.height;
            const cx = w * 0.5, cy = h * 0.5;

            if (statsCtx && cfg.showFps && now - st.lastStatsDraw > 100) {
                st.lastStatsDraw = now;
                statsCtx.clearRect(0, 0, 150, 60);
                statsCtx.fillStyle = '#1db954';
                const len = Math.min(st.frameIdx, 150);
                for (let i = 0; i < len; i++) {
                    const idx = (st.frameIdx - len + i) % 150;
                    const fh  = Math.min(60, frameTimes.current[idx]);
                    statsCtx.fillRect(i, 60 - fh, 1, fh);
                }
                statsCtx.fillStyle = '#fff';
                statsCtx.font = '11px monospace';
                statsCtx.fillText(`FPS: ${fpsRef.current.fps}`, 5, 15);
                statsCtx.fillText(`MS:  ${Math.round(fpsRef.current.ms)}`, 5, 30);
            }

            if (cfg.eqEnabled) {
                engine.eq[0] = (cfg.eq200   || 100) / 100; engine.eq[1] = (cfg.eq400   || 100) / 100;
                engine.eq[2] = (cfg.eq750   || 100) / 100; engine.eq[3] = (cfg.eq1500  || 100) / 100;
                engine.eq[4] = (cfg.eq3000  || 100) / 100; engine.eq[5] = (cfg.eq6000  || 100) / 100;
                engine.eq[6] = (cfg.eq9000  || 100) / 100; engine.eq[7] = (cfg.eq12000 || 100) / 100;
            } else {
                engine.eq.fill(1);
            }

            let bassMultiplier = 1;
            if (analyserRef.current) {
                if (playing) analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                engine.processRawAudio(dataArrayRef.current, cfg.audioSmoothDelay, cfg.eqEnabled && cfg.eqUseForEffects);
                bassMultiplier = engine.getBaseMultiplier(0, 6);
            }

            const bassStrength = Math.max(0, bassMultiplier - 1);
            const isBeat       = playing && bassStrength > 0.4;

            if (cfg.effColorEffects && playing) st.globalHueOffset += 0.5;

            // FÍSICA DESACOPLADA
            if (isBeat) {
                if (cfg.effBounce) {
                    const fgBounceForce = (cfg.fgBounceIntensity !== undefined ? cfg.fgBounceIntensity : 50) / 100 * 0.15;
                    const bgBounceForce = (cfg.bgBounceIntensity !== undefined ? cfg.bgBounceIntensity : 0) / 100 * 0.15;
                    st.currentScale = 1 + bassStrength * fgBounceForce;
                    st.bgScale = 1 + bassStrength * bgBounceForce;
                }

                if (cfg.effShake) {
                    const fgShakeForce = (cfg.fgShakeIntensity !== undefined ? cfg.fgShakeIntensity : 50) / 100 * 20;
                    const bgShakeForce = (cfg.bgShakeIntensity !== undefined ? cfg.bgShakeIntensity : 0) / 100 * 20;
                    st.shakeIntensity = bassStrength * fgShakeForce;
                    st.bgShakeIntensity = bassStrength * bgShakeForce;
                }

                if (cfg.confettiEnabled && (bassStrength * 100) > (cfg.confettiMinSound || 100) && Math.random() > 0.5) {
                    const burst = cfg.confettiBurstSize | 0;
                    const speed = cfg.confettiSpeed / 20;
                    const sz    = cfg.confettiSize / 4;
                    for (let i = 0; i < burst; i++) {
                        const ang = Math.random() * 6.2831853;
                        const sp  = speed + Math.random() * 5 * bassStrength;
                        st.particles.spawn(cx, cy, Math.cos(ang) * sp, Math.sin(ang) * sp, sz);
                    }
                }
            }

            st.currentScale = Math.max(1.0, st.currentScale - 0.02);
            st.bgScale = Math.max(1.0, st.bgScale - 0.02);

            st.shakeIntensity *= 0.85;
            st.shakeX = (Math.random() - 0.5) * st.shakeIntensity;
            st.shakeY = (Math.random() - 0.5) * st.shakeIntensity;

            st.bgShakeIntensity *= 0.85;
            st.bgShakeX = (Math.random() - 0.5) * st.bgShakeIntensity;
            st.bgShakeY = (Math.random() - 0.5) * st.bgShakeIntensity;

            if (centerLogoRef.current) {
                centerLogoRef.current.style.transform = `translate(${st.shakeX}px, ${st.shakeY}px)`;
            }

            bgContainer.style.transform = `translate(${st.bgShakeX}px, ${st.bgShakeY}px) scale(${st.bgScale})`;

            if (cfg.bgPerspective && !cfg.bgPerspectiveStatic) {
                const px = (mousePos.current.x - cx) / Math.max(1, cx);
                const py = (mousePos.current.y - cy) / Math.max(1, cy);
                const ps = cfg.bgPerspectiveStrength || 25;
                const pd = cfg.bgPerspectiveDist     || 1000;
                container.style.transform = `perspective(${pd}px) rotateX(${-py * ps}deg) rotateY(${px * ps}deg) scale(${st.currentScale})`;
            } else {
                container.style.transform = `scale(${st.currentScale})`;
            }

            const sysTime = timestamp * 0.001;

            ctx.clearRect(0, 0, w, h);

            // ============================================
            // 1. GRID ANIMADO
            // ============================================
            if (cfg.gridEnabled) {
                if (st.gridDirty || st.gridPoints.length === 0) buildGrid();

                const vis   = (cfg.gridVis || 80) / 100;
                const mx    = mousePos.current.x;
                const my    = mousePos.current.y;
                const isCirc = cfg.gridType === 'Circle';
                const pts   = st.gridPoints;
                const len   = pts.length;

                const gridTiers = [[], [], [], [], []];

                for (let i = 0; i < len; i++) {
                    const p = pts[i];
                    p.x = p.ox + Math.sin(sysTime + p.ox * 0.01) * 15;
                    p.y = p.oy + Math.cos(sysTime + p.oy * 0.01) * 15;
                    const dx = p.x - mx, dy = p.y - my;

                    if (dx > -150 && dx < 150 && dy > -150 && dy < 150 && (dx * dx + dy * dy < 22500)) {
                        p.active += (vis - p.active) * 0.15;
                    } else if (p.active > 0.005) {
                        p.active = Math.max(0, p.active - 0.02);
                    }

                    if (p.active > 0.05) {
                        const tierIdx = Math.min(4, Math.floor(p.active * 5));
                        gridTiers[tierIdx].push(i);
                    }
                }

                ctx.fillStyle   = cfg.gridColor || '#ffffff';
                ctx.strokeStyle = cfg.gridColor || '#ffffff';
                ctx.lineWidth   = 1;

                for (let t = 0; t < 5; t++) {
                    const tier = gridTiers[t];
                    if (!tier.length) continue;

                    ctx.globalAlpha = (t + 1) * 0.2 * vis;

                    ctx.beginPath();
                    for (let i = 0; i < tier.length; i++) {
                        const p = pts[tier[i]];
                        if (isCirc) { ctx.moveTo(p.x + 3, p.y); ctx.arc(p.x, p.y, 3, 0, 6.2831853); }
                        else { ctx.rect(p.x - 3, p.y - 3, 6, 6); }
                    }
                    ctx.fill();

                    ctx.beginPath();
                    for (let i = 0; i < tier.length; i++) {
                        const pIdx = tier[i];
                        const p = pts[pIdx];
                        for (let j = pIdx + 1; j < Math.min(pIdx + 40, len); j++) {
                            const p2 = pts[j];
                            const dx = p.x - p2.x, dy = p.y - p2.y;
                            if (dx > -80 && dx < 80 && dy > -80 && dy < 80 && (dx * dx + dy * dy < 6400)) {
                                ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
                            }
                        }
                    }
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // ============================================
            // 2. CONFETTI
            // ============================================
            if (cfg.confettiEnabled) {
                const parts = st.particles._active;
                let write = 0;
                const pTiers = [[], [], [], [], [], [], [], [], [], []];

                for (let i = 0; i < parts.length; i++) {
                    const p = parts[i];
                    p.x += p.vx; p.y += p.vy; p.life -= 0.02;
                    if (p.life > 0) {
                        parts[write++] = p;
                        const tierIdx = Math.min(9, Math.floor(p.life * 10));
                        pTiers[tierIdx].push(p);
                    } else {
                        st.particles._pool.push(p);
                    }
                }
                parts.length = write;

                ctx.fillStyle = cfg.clockColor || '#ffffff';
                for (let t = 0; t < 10; t++) {
                    const tier = pTiers[t];
                    if (!tier.length) continue;
                    ctx.globalAlpha = (t + 1) * 0.1;
                    ctx.beginPath();
                    for (let i = 0; i < tier.length; i++) {
                        const p = tier[i];
                        ctx.rect(p.x - p.size*0.5, p.y - p.size*0.5, p.size, p.size);
                    }
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // ============================================
            // 3. RELÓGIO
            // ============================================
            if (cfg.clockEnabled) {
                if (now - st.lastClockUpdate > 1000) {
                    st.lastClockUpdate = now;
                    const now2  = new Date();
                    let hrs = now2.getHours();
                    const mins = String(now2.getMinutes()).padStart(2, '0');
                    const secs = String(now2.getSeconds()).padStart(2, '0');
                    if (!cfg.clock24h) hrs = hrs % 12 || 12;
                    const sep = cfg.clockSep ? ':' : ' ';
                    let timeStr = `${String(hrs).padStart(2, '0')}${sep}${mins}`;
                    if (cfg.clockSecs) timeStr += `${sep}${secs}`;
                    st.clockCache = timeStr;
                }

                const sc   = ((cfg.clockScale || 25) / 100) * (1 + bassStrength * 0.05);
                const offX = (cfg.clockOffsetX || 0) * 5;
                const offY = (cfg.clockOffsetY || 0) * 5;
                const sz   = 120 * sc;

                ctx.fillStyle    = cfg.clockColor || '#ffffff';
                ctx.font         = `${sz}px ${cfg.clockFont || 'Impact'}`;
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';
                if (cfg.effGlow) {
                    ctx.shadowBlur   = 8;
                    ctx.shadowColor  = '#000';
                }
                ctx.fillText(st.clockCache, cx + st.shakeX + offX, cy + st.shakeY + offY);
                ctx.shadowBlur = 0;
            }

            // ============================================
            // 4. DESENHO DAS BARRAS DE AUDIO E SPLINES
            // ============================================
            const bHue = cfg.baseHue || 280;
            const eHue = cfg.endHue  || 360;
            const useSolid = cfg.useSolidColor || false;
            const solidCol = cfg.solidColor || '#1db954';

            const drawVisualizer = (cBar, rotKey) => {
                if (!cBar.enabled) return;

                const points   = Math.max(4, cBar.dataPoints | 0);
                const mixed    = engine.mixChannels(cBar.channel, cBar.render, cBar.reverse, points);

                const isCircle   = cBar.mode === 'Circle';
                const isTriangle = cBar.mode === 'Triangle';
                const isSquare   = cBar.mode === 'Square';
                const isSpline   = cBar.drawType === 'Spline';

                ctx.lineCap    = (cBar.caps || 'round').toLowerCase();
                const cWidth   = Number(cBar.width) || 6;
                const cAlpha   = Math.max(0, Math.min(1, (Number(cBar.opacity) || 100) / 100));

                const arcRad     = (cBar.arcDegrees * Math.PI) / 180;
                const rotStep    = (Math.PI / 180) * (360 / ((cBar.rotDuration || 30) * 60));
                if (cBar.rotate && playing) st[rotKey] += cBar.rotateCCW ? -rotStep : rotStep;
                const rotOff = st[rotKey] + (cBar.rotation * Math.PI / 180);

                const strength     = cBar.strength / 100;
                const heightLimit  = cBar.heightLimit;
                const circleSize   = cBar.circleSize;
                const isMirror     = cBar.render === 'Mirror';

                const cGap         = Number(cBar.gap) || 0;

                const visualizerOffsetX = Number(cBar.offsetX) || 0;
                const visualizerOffsetY = Number(cBar.offsetY) || 0;

                const cxBase = cx + st.shakeX + visualizerOffsetX;
                const cyBase = cy + st.shakeY + visualizerOffsetY;

                // ============================================
                // MODO TRIANGULO OU QUADRADO
                // ============================================
                if (isTriangle || isSquare) {
                    const R = circleSize;
                    const sides = isSquare ? 4 : 3;
                    const L = isSquare ? (2 * R) : (2 * R * 1.73205081);

                    const angles = isSquare
                        ? [0, 1.5707963268, 3.1415926536, 4.7123889804]
                        : [0, 2.09439510239, 4.18879020479];

                    for (let side = 0; side < sides; side++) {
                        const sideAngle = angles[side] + rotOff;

                        ctx.save();
                        ctx.translate(cxBase, cyBase);
                        ctx.rotate(sideAngle);

                        let rCount = 0, lCount = 0;
                        const spR = st.splineR, spL = st.splineL;

                        if (isSpline) {
                            for (let i = 0; i < points; i++) {
                                let bh = (mixed[i] || 0) * 200 * strength;
                                if (heightLimit > 0 && bh > heightLimit) bh = heightLimit;

                                if (isMirror) {
                                    const xR = (i / Math.max(1, points - 1)) * (L / 2);
                                    spR[rCount].x = xR; spR[rCount].y = R + bh; rCount++;
                                    if (i > 0) {
                                        spL[lCount].x = -xR; spL[lCount].y = R + bh; lCount++;
                                    }
                                } else {
                                    const t = points > 1 ? i / (points - 1) : 0.5;
                                    spR[rCount].x = (-L/2) + t * L; spR[rCount].y = R + bh; rCount++;
                                }
                            }

                            if (useSolid) {
                                ctx.strokeStyle = solidCol;
                            } else {
                                const h = (bHue + st.globalHueOffset) % 360 | 0;
                                ctx.strokeStyle = `hsl(${h < 0 ? h + 360 : h},100%,50%)`;
                            }

                            if (rCount > 1) {
                                ctx.beginPath(); ctx.moveTo(spR[0].x, spR[0].y);
                                for (let i = 0; i < rCount - 1; i++) {
                                    ctx.quadraticCurveTo(spR[i].x, spR[i].y, (spR[i].x + spR[i+1].x) * 0.5, (spR[i].y + spR[i+1].y) * 0.5);
                                }
                                ctx.lineTo(spR[rCount-1].x, spR[rCount-1].y);
                                if (cfg.effGlow) { ctx.globalAlpha = cAlpha * 0.3; ctx.lineWidth = cWidth * 2.5; ctx.stroke(); }
                                ctx.globalAlpha = cAlpha; ctx.lineWidth = cWidth; ctx.stroke();
                            }
                            if (lCount > 1) {
                                ctx.beginPath(); ctx.moveTo(spL[0].x, spL[0].y);
                                for (let i = 0; i < lCount - 1; i++) {
                                    ctx.quadraticCurveTo(spL[i].x, spL[i].y, (spL[i].x + spL[i+1].x) * 0.5, (spL[i].y + spL[i+1].y) * 0.5);
                                }
                                ctx.lineTo(spL[lCount-1].x, spL[lCount-1].y);
                                if (cfg.effGlow) { ctx.globalAlpha = cAlpha * 0.3; ctx.lineWidth = cWidth * 2.5; ctx.stroke(); }
                                ctx.globalAlpha = cAlpha; ctx.lineWidth = cWidth; ctx.stroke();
                            }
                        } else {
                            for (let i = 0; i < points; i++) {
                                let bh = (mixed[i] || 0) * 200 * strength;
                                if (heightLimit > 0 && bh > heightLimit) bh = heightLimit;

                                if (useSolid) {
                                    ctx.strokeStyle = solidCol;
                                } else {
                                    let hue = (bHue + ((eHue - bHue) * (i / points)) + st.globalHueOffset) % 360 | 0;
                                    if (hue < 0) hue += 360;
                                    let lgt = ~~(50 + (bh/150)*20);
                                    ctx.strokeStyle = `hsl(${hue}, 100%, ${lgt}%)`;
                                }

                                ctx.beginPath();

                                if (isMirror) {
                                    const xR = (i / Math.max(1, points - 1)) * (L / 2);
                                    ctx.moveTo(xR, R); ctx.lineTo(xR, R + bh);
                                    if (i > 0) {
                                        ctx.moveTo(-xR, R); ctx.lineTo(-xR, R + bh);
                                    }
                                } else {
                                    const t = points > 1 ? i / (points - 1) : 0.5;
                                    const x = (-L/2) + t * L;
                                    ctx.moveTo(x, R); ctx.lineTo(x, R + bh);
                                }

                                if (cfg.effGlow) { ctx.globalAlpha = cAlpha * 0.3; ctx.lineWidth = cWidth * 2.5; ctx.stroke(); }
                                ctx.globalAlpha = cAlpha; ctx.lineWidth = cWidth; ctx.stroke();
                            }
                        }
                        ctx.restore();
                    }
                    return;
                }

                // ============================================
                // MODO CIRCLE OU LINEAR
                // ============================================
                const totalLinearWidth = points * (cWidth + cGap) - cGap;
                const startX           = isMirror ? cxBase : cxBase - (totalLinearWidth * 0.5);

                let rCount = 0, lCount = 0;
                const spR = st.splineR, spL = st.splineL;

                if (isSpline) {
                    for (let i = 0; i < points; i++) {
                        let bh = (mixed[i] || 0) * 200 * strength;
                        if (heightLimit > 0 && bh > heightLimit) bh = heightLimit;

                        if (isCircle) {
                            const as  = arcRad / points;
                            const aR  = i * as - 1.5707963 + rotOff;
                            const r   = circleSize + bh;
                            spR[rCount].x = cxBase + Math.cos(aR) * r;
                            spR[rCount].y = cyBase + Math.sin(aR) * r;
                            rCount++;
                            if (i > 0 && isMirror) {
                                const aL = -(i * as) - 1.5707963 + rotOff;
                                spL[lCount].x = cxBase + Math.cos(aL) * r;
                                spL[lCount].y = cyBase + Math.sin(aL) * r;
                                lCount++;
                            }
                        } else {
                            const xOff = i * (cWidth + cGap);
                            spR[rCount].x = startX + xOff;
                            spR[rCount].y = cyBase - bh;
                            rCount++;
                            if (i > 0 && isMirror) {
                                spL[lCount].x = cxBase - xOff;
                                spL[lCount].y = cyBase - bh;
                                lCount++;
                            }
                        }
                    }

                    if (useSolid) {
                        ctx.strokeStyle = solidCol;
                    } else {
                        const h = (bHue + st.globalHueOffset) % 360 | 0;
                        ctx.strokeStyle = `hsl(${h < 0 ? h + 360 : h},100%,50%)`;
                    }

                    if (rCount > 1) {
                        ctx.beginPath(); ctx.moveTo(spR[0].x, spR[0].y);
                        for (let i = 0; i < rCount - 1; i++) {
                            ctx.quadraticCurveTo(spR[i].x, spR[i].y, (spR[i].x + spR[i+1].x) * 0.5, (spR[i].y + spR[i+1].y) * 0.5);
                        }
                        ctx.lineTo(spR[rCount-1].x, spR[rCount-1].y);
                        if (cfg.effGlow) { ctx.globalAlpha = cAlpha * 0.3; ctx.lineWidth = cWidth * 2.5; ctx.stroke(); }
                        ctx.globalAlpha = cAlpha; ctx.lineWidth = cWidth; ctx.stroke();
                    }
                    if (lCount > 1) {
                        ctx.beginPath(); ctx.moveTo(spL[0].x, spL[0].y);
                        for (let i = 0; i < lCount - 1; i++) {
                            ctx.quadraticCurveTo(spL[i].x, spL[i].y, (spL[i].x + spL[i+1].x) * 0.5, (spL[i].y + spL[i+1].y) * 0.5);
                        }
                        ctx.lineTo(spL[lCount-1].x, spL[lCount-1].y);
                        if (cfg.effGlow) { ctx.globalAlpha = cAlpha * 0.3; ctx.lineWidth = cWidth * 2.5; ctx.stroke(); }
                        ctx.globalAlpha = cAlpha; ctx.lineWidth = cWidth; ctx.stroke();
                    }

                } else {
                    for (let i = 0; i < points; i++) {
                        let bh = (mixed[i] || 0) * 200 * strength;
                        if (heightLimit > 0 && bh > heightLimit) bh = heightLimit;

                        if (useSolid) {
                            ctx.strokeStyle = solidCol;
                        } else {
                            let hue = (bHue + ((eHue - bHue) * (i / points)) + st.globalHueOffset) % 360 | 0;
                            if (hue < 0) hue += 360;
                            let lgt = ~~(50 + (bh/150)*20);
                            ctx.strokeStyle = `hsl(${hue}, 100%, ${lgt}%)`;
                        }

                        ctx.beginPath();

                        if (isCircle) {
                            const as = arcRad / points;
                            const aR = i * as - 1.5707963 + rotOff;
                            const cos = Math.cos(aR), sin = Math.sin(aR);

                            ctx.moveTo(cxBase + cos * circleSize, cyBase + sin * circleSize);
                            ctx.lineTo(cxBase + cos * (circleSize + bh), cyBase + sin * (circleSize + bh));

                            if (i > 0 && isMirror) {
                                const aL = -(i * as) - 1.5707963 + rotOff;
                                const cL = Math.cos(aL), sL = Math.sin(aL);
                                ctx.moveTo(cxBase + cL * circleSize, cyBase + sL * circleSize);
                                ctx.lineTo(cxBase + cL * (circleSize + bh), cyBase + sL * (circleSize + bh));
                            }
                        } else {
                            const xOff = i * (cWidth + cGap);
                            ctx.moveTo(startX + xOff, cyBase);
                            ctx.lineTo(startX + xOff, cyBase - bh);

                            if (i > 0 && isMirror) {
                                ctx.moveTo(cxBase - xOff, cyBase);
                                ctx.lineTo(cxBase - xOff, cyBase - bh);
                            }
                        }

                        if (cfg.effGlow) { ctx.globalAlpha = cAlpha * 0.3; ctx.lineWidth = cWidth * 2.5; ctx.stroke(); }
                        ctx.globalAlpha = cAlpha; ctx.lineWidth = cWidth; ctx.stroke();
                    }
                }
                ctx.globalAlpha = 1;
            };

            drawVisualizer({
                enabled: cfg.bar1Enabled, dataPoints: cfg.bar1DataPoints, channel: cfg.bar1Channel,
                render: cfg.bar1Render, reverse: cfg.bar1Reverse, strength: cfg.bar1Strength,
                width: cfg.bar1Width, gap: cfg.bar1Gap, opacity: cfg.bar1Opacity,
                heightLimit: cfg.bar1HeightLimit, mode: cfg.bar1Mode, drawType: cfg.bar1DrawType,
                circleSize: cfg.bar1CircleSize, arcDegrees: cfg.bar1ArcDegrees,
                rotate: cfg.bar1Rotate, rotateCCW: cfg.bar1RotateCCW, rotDuration: cfg.bar1RotDuration,
                caps: cfg.bar1Caps, rotation: cfg.bar1Rotation,
                offsetX: cfg.bar1OffsetX, offsetY: cfg.bar1OffsetY
            }, 'rotBar1');

            drawVisualizer({
                enabled: cfg.bar2Enabled, dataPoints: cfg.bar2DataPoints, channel: cfg.bar2Channel,
                render: cfg.bar2Render, reverse: cfg.bar2Reverse, strength: cfg.bar2Strength,
                width: cfg.bar2Width, gap: cfg.bar2Gap, opacity: cfg.bar2Opacity,
                heightLimit: cfg.bar2HeightLimit, mode: cfg.bar2Mode, drawType: cfg.bar2DrawType,
                circleSize: cfg.bar2CircleSize, arcDegrees: cfg.bar2ArcDegrees,
                rotate: cfg.bar2Rotate, rotateCCW: cfg.bar2RotateCCW, rotDuration: cfg.bar2RotDuration,
                caps: cfg.bar2Caps, rotation: cfg.bar2Rotation,
                offsetX: cfg.bar2OffsetX, offsetY: cfg.bar2OffsetY
            }, 'rotBar2');
        };

        animationId.current = requestAnimationFrame(renderLoop);

        return () => {
            resizeObs.disconnect();
            if (animationId.current) cancelAnimationFrame(animationId.current);
        };
    }, []);

    // ============================================================
    // RENDER BASE HTML
    // ============================================================
    const activeSettings = settings || DEFAULT_SETTINGS;

    let bgStyle = {
        position: 'absolute', inset: 0, zIndex: -1,
        backgroundColor: '#000',
        backgroundPosition: 'center',
        backgroundSize: activeSettings.bgScaleToFit ? 'contain' : 'cover',
        backgroundRepeat: 'no-repeat'
    };

    if (activeSettings.bgEnabled) {
        if (activeSettings.bgType === 'Color (none)') bgStyle.backgroundColor = activeSettings.bgColor || '#000';
        else if (activeSettings.bgType === 'Image' && activeSettings.bgImage) bgStyle.backgroundImage = `url("${activeSettings.bgImage}")`;
    }

    const logoSize = Number(activeSettings.logoSize) || 280;
    const logoShape = activeSettings.logoShape === 'Square' ? '0%' : '50%';
    const logoFit = activeSettings.logoFit === 'Fit Without Cropping (Transparent Logo)' ? 'contain' : 'cover';

    const useAlbumCover = activeSettings.logoSource !== 'Custom Image';
    const customLogo = activeSettings.customLogoImage;
    const trackLogo = currentTrack && currentTrack.picture ? currentTrack.picture : null;
    const logoUrl = useAlbumCover ? trackLogo : (customLogo || trackLogo);

    const logoShadowEnabled = activeSettings.logoShadowEnabled ?? true;

    const logoOffsetX = Number(activeSettings.logoOffsetX) || 0;
    const logoOffsetY = Number(activeSettings.logoOffsetY) || 0;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>

            <div ref={bgContainerRef} style={{ position: 'absolute', inset: '-5%', zIndex: 0, transformOrigin: 'center center' }}>
                <div style={bgStyle} />
                {activeSettings.bgEnabled && activeSettings.bgType === 'Video' && activeSettings.bgVideo && (
                    <video ref={bgVideoRef} src={activeSettings.bgVideo}
                           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: activeSettings.bgScaleToFit ? 'contain' : 'cover' }}
                           autoPlay loop muted={activeSettings.bgVideoVolume === 0} />
                )}
            </div>

            <canvas ref={statsCanvasRef} width={150} height={60}
                    style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, border: '1px solid #333', display: activeSettings.showFps ? 'block' : 'none' }} />

            <div ref={containerRef} style={{ width: '100%', height: '100%', transformOrigin: 'center center', willChange: 'transform', position: 'absolute', inset: 0, zIndex: 1, transformStyle: 'preserve-3d' }}>
                <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1 }} />

                {logoUrl && (
                    <div
                        style={{
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            zIndex: 2,
                            pointerEvents: 'none',
                            inset: 0
                        }}
                    >
                        <img
                            ref={centerLogoRef}
                            src={logoUrl}
                            alt="Center Logo"
                            style={{
                                width: `${logoSize}px`,
                                height: `${logoSize}px`,
                                objectFit: logoFit,
                                borderRadius: logoShape,
                                pointerEvents: 'none',
                                filter: logoShadowEnabled ? 'drop-shadow(0px 0px 20px rgba(0,0,0,0.9))' : 'none',
                                marginLeft: `${logoOffsetX}px`,
                                marginTop: `${logoOffsetY}px`,
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

export default AudioVisualizer;