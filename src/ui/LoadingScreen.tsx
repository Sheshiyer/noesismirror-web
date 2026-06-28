import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState, useMemo } from "react";
import { useGameStore } from "../core/store/gameStore";
import gsap from "gsap";

// --- Sub Components ---
const Key = ({ children }: { children: React.ReactNode }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: '18px', height: '22px', padding: '0 5px', margin: '0 4px',
        border: '1px solid var(--noesis-silver)', borderRadius: '4px', background: 'rgba(240,237,227,0.06)',
        fontFamily: 'var(--noesis-font-mono)', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--noesis-parchment)',
        lineHeight: 1, verticalAlign: 'middle', boxSizing: 'border-box'
    }}>
        {children}
    </span>
);

const MouseIcon = () => (
    <span style={{
        display: 'inline-block', position: 'relative', width: '12px', height: '18px', margin: '0 4px',
        border: '1.5px solid var(--noesis-silver)', borderRadius: '6px', verticalAlign: 'middle', opacity: 0.8
    }}>
        <span style={{
            position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)',
            width: '1.5px', height: '4px', background: 'var(--noesis-silver)', borderRadius: '1px'
        }} />
    </span>
);

const InstructionRow = ({ input, label }: { input: React.ReactNode, label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
        {input}
        <span style={{ marginLeft: '6px', fontSize: '0.65rem', letterSpacing: '1.5px', fontWeight: 500, transform: 'translateY(1px)', color: 'var(--noesis-silver)', fontFamily: 'var(--noesis-font-body)' }}>
            {label}
        </span>
    </div>
);

// --- Main Component ---

export function LoadingScreen() {
    // Store & Hooks
    const { active, progress: downloadProgress } = useProgress();
    const activeTargets = useGameStore((state) => state.activeTargets);
    const readyStatus = useGameStore((state) => state.readyStatus);
    const isMobile = useGameStore((state) => state.isMobile);
    const setIsGameStarted = useGameStore((state) => state.setIsGameStarted);
    const gpuError = useGameStore((state) => state.gpuError);

    // Local State
    const [isReadyToStart, setIsReadyToStart] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isLandscape, setIsLandscape] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<gsap.core.Tween | null>(null);

    // Orientation detection hook
    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    const total = activeTargets.length;
    const loaded = activeTargets.filter((id) => readyStatus[id]).length;
    const compileProgress = total === 0 ? 0 : (loaded / total) * 100;

    const displayProgress = useMemo(() => {
        if (active) return Math.round(downloadProgress * 0.5);
        return Math.min(Math.round(50 + compileProgress * 0.5), 99);
    }, [active, downloadProgress, compileProgress]);

    useEffect(() => {
        if (!active && loaded === total && total > 0) {
            const t = setTimeout(() => setIsReadyToStart(true), 200);
            return () => clearTimeout(t);
        }
    }, [active, loaded, total]);

    const handleStart = () => {
        if (!isReadyToStart || gpuError) return;
        setIsGameStarted(true);
        if (containerRef.current) {
            animationRef.current = gsap.to(containerRef.current, {
                opacity: 0,
                duration: 1,
                ease: "power2.inOut",
                onComplete: () => setIsVisible(false)
            });
        }
    };

    useEffect(() => {
        return () => {
            if (animationRef.current) animationRef.current.kill();
        };
    }, []);

    if (!isVisible) return null;

    const isMobileLandscape = isMobile && isLandscape;

    const containerStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100dvh',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'var(--noesis-parchment)',
        pointerEvents: 'auto',
        fontSize: isMobile ? '0.85rem' : '0.95rem',
        opacity: 0.99,
        overflow: 'hidden',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
        background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%, var(--noesis-flow) 100%)',
        fontFamily: 'var(--noesis-font-body)',
    };

    const entryContainerStyle: React.CSSProperties = {
        opacity: 1,
        maxWidth: isMobileLandscape ? '85%' : (isMobile ? '100%' : '680px'),
        padding: isMobileLandscape ? '20px' : '40px',
        animation: 'fadeIn 2s ease',
        display: 'flex',
        flexDirection: isMobileLandscape ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobileLandscape ? '48px' : '0px',
        height: isMobileLandscape ? '100%' : 'auto'
    };

    const playButtonStyle: React.CSSProperties = {
        color: gpuError ? 'var(--noesis-terracotta)' : 'var(--noesis-gold)',
        backgroundColor: 'transparent',
        border: 'none',
        letterSpacing: '4px',
        transition: 'all 0.5s ease',
        transform: 'scale(1)',
        cursor: gpuError ? 'default' : (isReadyToStart ? 'pointer' : 'wait'),
        opacity: gpuError ? 0.8 : 1,
        whiteSpace: 'nowrap',
        animation: isReadyToStart ? 'goldPulse 2.5s infinite ease-in-out' : 'none',
        fontFamily: 'var(--noesis-font-display)',
        fontSize: isMobile ? '0.85rem' : '1rem',
        fontWeight: 600,
        textShadow: isReadyToStart ? '0 0 18px rgba(197, 160, 23, 0.35)' : 'none',
    };

    return (
        <div ref={containerRef} style={containerStyle}>
            <div className='entry' style={entryContainerStyle}>

                {/* Left Side: Content Text */}
                <div style={{
                    flex: isMobileLandscape ? '1' : 'auto',
                    textAlign: isMobileLandscape ? 'left' : 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: isMobileLandscape ? 'center' : 'flex-start',
                    alignItems: isMobileLandscape ? 'flex-start' : 'center',
                }}>
                    {/* Sigil */}
                    <img
                        src="/noesis-sigil.png"
                        alt=""
                        style={{
                            width: isMobile ? '64px' : '88px',
                            height: 'auto',
                            marginBottom: isMobileLandscape ? '1rem' : '1.5rem',
                            opacity: 0.9,
                            animation: 'khaBreath 6s infinite ease-in-out',
                        }}
                    />

                    {/* Title */}
                    <div style={{
                        fontFamily: 'var(--noesis-font-display)',
                        fontSize: isMobile ? '1.3rem' : '1.6rem',
                        fontWeight: 700,
                        letterSpacing: isMobile ? '0.35rem' : '0.55rem',
                        marginBottom: '0.5rem',
                        color: 'var(--noesis-gold)',
                        textShadow: '0 0 24px rgba(197, 160, 23, 0.18)',
                    }}>
                        TRYAMBAKAM NOESIS
                    </div>

                    {/* Subtitle / Tagline */}
                    <div style={{
                        fontFamily: 'var(--noesis-font-body)',
                        fontSize: isMobile ? '0.65rem' : '0.75rem',
                        letterSpacing: '0.18em',
                        color: 'var(--noesis-silver)',
                        marginBottom: isMobileLandscape ? '1rem' : '2rem',
                        textTransform: 'uppercase',
                    }}>
                        Self-Consciousness as Technology
                    </div>

                    {/* Intro Text */}
                    <div style={{
                        textAlign: isMobileLandscape ? 'left' : 'center',
                        display: 'inline-block',
                        lineHeight: '1.7',
                        color: 'var(--noesis-parchment)',
                        marginBottom: isMobileLandscape ? '0' : '2.5rem',
                        fontSize: isMobileLandscape ? '0.8rem' : 'inherit',
                        maxWidth: '540px',
                        opacity: 0.9,
                    }}>
                        <p style={{ marginBottom: '1rem' }}>
                            The 16 symbolic mirrors of the Noesis Engine are cast here as a walkable field.
                            Terrain becomes text. Distance becomes inquiry. What you find depends on where you stand.
                        </p>

                        <p style={{ marginBottom: '1rem' }}>
                            Two beacons are embedded in this field: <strong style={{ color: 'var(--noesis-flow)' }}>study</strong> and <strong style={{ color: 'var(--noesis-emerald)' }}>reading</strong>.
                            They do not announce themselves. Approach them. Proximity is the only interface.
                        </p>

                        <p>
                            Kha watches from stillness. Ba moves through the field. La is the friction that makes the ground real.
                            The system succeeds when you no longer need the map.
                        </p>
                    </div>
                </div>

                {/* Right Side: Interaction Area */}
                <div style={{
                    flex: isMobileLandscape ? '0.7' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: isMobileLandscape ? '200px' : 'auto'
                }}>
                    {/* Play Button & Progress Bar */}
                    <div className='play'>
                        <button
                            onClick={handleStart}
                            disabled={!isReadyToStart || !!gpuError}
                            style={playButtonStyle}
                            onMouseEnter={(e) => (isReadyToStart && !gpuError) && (e.currentTarget.style.transform = 'scale(1.03)')}
                            onMouseLeave={(e) => (isReadyToStart && !gpuError) && (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            {gpuError ? (
                                <span style={{ letterSpacing: '2px' }}>SYSTEM INCOMPATIBLE</span>
                            ) : isReadyToStart ? (
                                "[ ENTER FIELD ]"
                            ) : (
                                <span>
                                    {active ? "ASSEMBLING" : "CALIBRATING"}… {displayProgress}%
                                </span>
                            )}
                        </button>

                        <div style={{
                            width: '100%', maxWidth: '250px', height: '1px', background: 'rgba(240,237,227,0.12)', margin: '12px auto',
                            opacity: (isReadyToStart || gpuError) ? 0 : 1, transition: 'opacity 0.5s'
                        }}>
                            <div style={{ width: `${displayProgress}%`, height: '100%', background: 'var(--noesis-gold)', transition: 'width 0.2s' }} />
                        </div>
                    </div>

                    {/* Bottom Area: Controls */}
                    <div style={{
                        marginTop: isMobileLandscape ? '20px' : '48px',
                        color: 'var(--noesis-silver)', opacity: 0.85, animation: 'fadeIn 3s ease',
                        userSelect: 'none', display: 'flex', justifyContent: 'center', gap: '24px',
                        flexDirection: 'row',
                        fontFamily: 'var(--noesis-font-mono)',
                    }}>
                        {gpuError ? (
                            <div style={{ fontSize: '0.8rem', maxWidth: '400px', lineHeight: '1.4', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.7rem' }}>ERROR CODE: {gpuError}</p>
                            </div>
                        ) : (
                            isMobile ? (
                                <>
                                    <InstructionRow input={<Key>L-STICK</Key>} label="MOVE" />
                                    <InstructionRow input={<Key>TOUCH</Key>} label="LOOK" />
                                </>
                            ) : (
                                <>
                                    <InstructionRow input={<><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key></>} label="MOVE" />
                                    <InstructionRow input={<Key>SHIFT</Key>} label="RUN" />
                                    <InstructionRow input={<Key>C</Key>} label="CAM" />
                                    <InstructionRow input={<MouseIcon />} label="LOOK" />
                                </>
                            )
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
