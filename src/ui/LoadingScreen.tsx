import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState, useMemo } from "react";
import { useGameStore } from "../core/store/gameStore";
import gsap from "gsap";

// Fix E — Key, MouseIcon, InstructionRow components removed. They were used
// by the inline desktop/mobile control hint row on the loading screen, which
// is now gone (HUD chip strip takes over once isGameStarted flips true).

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
        opacity: 1,
        overflow: 'hidden',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
        // Brand-aligned: Void Black base. Constellation grid + faint Witness-Violet
        // center glow rendered as sibling absolutely-positioned divs so we keep the
        // "earned density" feel and avoid the flat purple→blue gradient.
        background: 'var(--noesis-void)',
        fontFamily: 'var(--noesis-font-body)',
    };

    // Brand backdrop: Sacred-Gold constellation grid + faint Witness-Violet center
    // glow. Mirrors src/components/Home.tsx Backdrop so the loading and intro
    // surfaces share the same visual language.
    const gridStyle: React.CSSProperties = {
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 0.06,
        backgroundImage: `
            repeating-linear-gradient(0deg, transparent 0 39px, #C5A017 39px 40px),
            repeating-linear-gradient(90deg, transparent 0 39px, #C5A017 39px 40px)
        `,
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
        maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
    };
    const glowStyle: React.CSSProperties = {
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(45,0,80,0.35) 0%, transparent 65%)',
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

    // Fix D — brand-aligned button per bento module 4. Drop the gold-pulse
    // box-shadow halo (read as a notification chip) in favor of a hairline
    // Ba Arc gradient underline (Coherence Emerald → Sacred Gold). Bioluminescent
    // breath via opacity on khaBreath (6s), replaces the 2.5s goldPulse.
    const playButtonStyle: React.CSSProperties = {
        color: gpuError ? 'var(--noesis-terracotta)' : 'var(--noesis-gold)',
        background: 'transparent',
        border: 'none',
        borderBottom: isReadyToStart && !gpuError
            ? '1px solid transparent'
            : '1px solid rgba(240, 237, 227, 0.12)',
        borderImage: isReadyToStart && !gpuError
            ? 'linear-gradient(90deg, var(--noesis-emerald), var(--noesis-gold)) 1'
            : 'none',
        paddingBottom: '6px',
        letterSpacing: isMobile ? '4px' : '6px',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        cursor: gpuError ? 'default' : (isReadyToStart ? 'pointer' : 'wait'),
        opacity: gpuError ? 0.8 : 1,
        whiteSpace: 'nowrap',
        animation: isReadyToStart ? 'khaBreath 6s infinite ease-in-out' : 'none',
        fontFamily: 'var(--noesis-font-display)',
        fontSize: isMobile ? '0.85rem' : '1rem',
        fontWeight: 600,
        textShadow: 'none',
    };

    return (
        <div ref={containerRef} style={containerStyle}>
            <div style={gridStyle} aria-hidden="true" />
            <div style={glowStyle} aria-hidden="true" />
            <div className='entry' style={{ ...entryContainerStyle, position: 'relative', zIndex: 1 }}>

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

                    {/* Fix E — Single Plumber-voiced invocation. Replaces three
                        paragraphs of app-description-shaped prose. The mechanics
                        introduce themselves once the player walks. */}
                    <div style={{
                        textAlign: isMobileLandscape ? 'left' : 'center',
                        display: 'inline-block',
                        lineHeight: '1.6',
                        color: 'var(--noesis-parchment)',
                        marginBottom: isMobileLandscape ? '0' : '2.5rem',
                        fontSize: isMobileLandscape ? '0.85rem' : '1.05rem',
                        maxWidth: '540px',
                        opacity: 0.85,
                        fontStyle: 'italic',
                        fontFamily: 'var(--noesis-font-body)',
                    }}>
                        The mirrors are already inside you. The field reminds you of them.
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
                                "ENTER"
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

                    {/* Fix E — InstructionRow control list removed. HUD chip strip
                        at bottom-6 takes over once the user clicks ENTER (Fix A
                        gates HUD's strip on isGameStarted, so there's no overlap).
                        Only the GPU-error fallback survives here. */}
                    {gpuError && (
                        <div style={{
                            marginTop: isMobileLandscape ? '20px' : '48px',
                            color: 'var(--noesis-silver)', opacity: 0.85,
                            userSelect: 'none', textAlign: 'center',
                            fontFamily: 'var(--noesis-font-mono)',
                        }}>
                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.7rem' }}>
                                ERROR CODE: {gpuError}
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
