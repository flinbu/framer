import * as React from "react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { motion, useInView, type Easing } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

type Direction = "horizontal" | "vertical"
type Trigger = "hover" | "scroll" | "auto" | "random" | "load"
type EasingPreset = "smooth" | "snappy" | "elastic" | "linear"

interface GlitchEffectProps {
    children?: React.ReactNode
    direction?: Direction
    trigger?: Trigger
    intensity?: number
    streakCount?: number
    noiseBlockCount?: number
    accentColorA?: string
    accentColorB?: string
    duration?: number
    stagger?: number
    easing?: EasingPreset
    autoInterval?: number
    randomMinInterval?: number
    randomMaxInterval?: number
    replay?: boolean
    style?: React.CSSProperties
}

const EASINGS: Record<EasingPreset, Easing> = {
    smooth: [0.16, 1, 0.3, 1],
    snappy: [0.6, 0, 0.1, 1],
    elastic: [0.34, 1.56, 0.64, 1],
    linear: [0, 0, 1, 1],
}

/** Deterministic pseudo-random in [0, 1), stable across renders for a given seed. */
function seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
}

function signedRandom(seed: number): number {
    return seededRandom(seed) * 2 - 1
}

/**
 * GlitchEffect — wraps any child layer (a shape, image, text, SVG) and, on a
 * configurable trigger, throws light-trail streaks and corrupted noise
 * patches over it in a quick burst, like a signal briefly tearing apart.
 * Doesn't touch the child itself — everything is an overlay.
 */
export default function GlitchEffect(props: GlitchEffectProps) {
    const {
        children,
        direction = "horizontal",
        trigger = "hover",
        intensity = 60,
        streakCount = 6,
        noiseBlockCount = 4,
        accentColorA = "#00e5ff",
        accentColorB = "#ff2df0",
        duration = 0.5,
        stagger = 0.03,
        easing = "snappy",
        autoInterval = 1.5,
        randomMinInterval = 0.6,
        randomMaxInterval = 2.5,
        replay = true,
        style,
    } = props

    // Framer's design canvas renders overflow content unclipped and doesn't
    // dispatch real hover events to code components — both would make an
    // in-progress glitch look broken while just placing the layer. Freeze
    // to a clean state on canvas; triggers only run in Preview/published.
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const containerRef = useRef<HTMLDivElement>(null)
    const [phase, setPhase] = useState<"rest" | "distort">("rest")
    const hasPlayedRef = useRef(false)
    const settleTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
    const filterId = useId().replace(/[:]/g, "")

    const inView = useInView(containerRef, {
        amount: 0.4,
        once: trigger === "scroll" && !replay,
    })

    const easeCurve = EASINGS[easing] ?? EASINGS.smooth
    // Streaks/noise pop in fast (see below) and hold briefly once the last
    // one has appeared, then everything fades back out — a quick burst
    // rather than a long static-looking hold.
    const settleMs = (Math.max(streakCount, noiseBlockCount) * stagger + duration * 0.3 + 0.12) * 1000

    const pulse = () => {
        if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current)
        setPhase("distort")
        settleTimeoutRef.current = setTimeout(() => setPhase("rest"), settleMs)
    }

    // Hover: toggles continuously while the pointer is over the layer.
    useEffect(() => {
        return () => {
            if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current)
        }
    }, [])

    // On Load: fires once on mount, then settles back.
    useEffect(() => {
        if (isCanvas || trigger !== "load" || hasPlayedRef.current) return
        hasPlayedRef.current = true
        pulse()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, isCanvas])

    // Scroll Into View: fires the same one-shot pulse each time the layer
    // enters the viewport (or once only, if Replay on Re-enter is off).
    useEffect(() => {
        if (isCanvas || trigger !== "scroll") return
        if (inView) {
            pulse()
        } else if (replay) {
            setPhase("rest")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, trigger, replay, isCanvas])

    // Auto Loop: repeats the pulse on a fixed cadence.
    useEffect(() => {
        if (isCanvas || trigger !== "auto") return
        let cancelled = false
        let nextTimeout: ReturnType<typeof setTimeout>
        const scheduleNext = () => {
            nextTimeout = setTimeout(() => {
                if (cancelled) return
                pulse()
                scheduleNext()
            }, Math.max(0.05, autoInterval) * 1000)
        }
        scheduleNext()
        return () => {
            cancelled = true
            clearTimeout(nextTimeout)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, isCanvas, autoInterval])

    // Random: repeats the pulse, but re-rolls the gap before each one from
    // [Min Interval, Max Interval] instead of a fixed period — an
    // intermittent glitch rather than a metronome.
    useEffect(() => {
        if (isCanvas || trigger !== "random") return
        let cancelled = false
        let nextTimeout: ReturnType<typeof setTimeout>
        const lo = Math.max(0.05, Math.min(randomMinInterval, randomMaxInterval))
        const hi = Math.max(lo, randomMaxInterval)
        const scheduleNext = () => {
            const delay = (lo + Math.random() * (hi - lo)) * 1000
            nextTimeout = setTimeout(() => {
                if (cancelled) return
                pulse()
                scheduleNext()
            }, delay)
        }
        scheduleNext()
        return () => {
            cancelled = true
            clearTimeout(nextTimeout)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, isCanvas, randomMinInterval, randomMaxInterval])

    const clampedStreakCount = Math.max(0, Math.round(streakCount))
    const clampedNoiseCount = Math.max(0, Math.round(noiseBlockCount))
    const intensityRatio = Math.min(100, Math.max(0, intensity)) / 100

    const streaks = useMemo(() => {
        return Array.from({ length: clampedStreakCount }, (_, i) => {
            const seed = i + 1
            return {
                pos: seededRandom(seed * 3.1) * 100,
                thickness: 1.5 + seededRandom(seed * 4.7) * 3.5,
                colorA: seededRandom(seed * 6.3) > 0.5,
                delayJitter: seededRandom(seed * 8.9),
                driftJitter: signedRandom(seed * 2.2),
            }
        })
    }, [clampedStreakCount])

    const noiseBlocks = useMemo(() => {
        return Array.from({ length: clampedNoiseCount }, (_, i) => {
            const seed = i + 11
            return {
                x: seededRandom(seed * 3.7) * 80,
                y: seededRandom(seed * 5.3) * 75,
                w: 10 + seededRandom(seed * 7.1) * 22,
                h: 5 + seededRandom(seed * 9.5) * 14,
                delayJitter: seededRandom(seed * 2.6),
                flickerSeed: Math.round(seededRandom(seed * 11.3) * 100),
            }
        })
    }, [clampedNoiseCount])

    const active = phase === "distort" && !isCanvas

    return (
        <div
            ref={containerRef}
            data-glitch-effect-root="true"
            onMouseEnter={trigger === "hover" && !isCanvas ? () => setPhase("distort") : undefined}
            onMouseLeave={trigger === "hover" && !isCanvas ? () => setPhase("rest") : undefined}
            style={{
                position: "relative",
                display: "inline-block",
                ...style,
            }}
        >
            {children}

            {/* Hidden filter defs — one shared turbulence filter per instance. */}
            <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden="true">
                <defs>
                    <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.7 0.9"
                            numOctaves={2}
                            seed={3}
                            stitchTiles="stitch"
                            result="noise"
                        />
                        <feColorMatrix in="noise" type="saturate" values="8" result="satNoise" />
                        <feComponentTransfer in="satNoise" result="blockyNoise">
                            <feFuncA type="discrete" tableValues="0 0 0 1 0 1 1 0 1" />
                        </feComponentTransfer>
                    </filter>
                </defs>
            </svg>

            <div
                aria-hidden="true"
                style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
            >
                {streaks.map((s, i) => {
                    const color = s.colorA ? accentColorA : accentColorB
                    // A snappy pop-in and a slower fade-out reads as a flicker
                    // even though each state is just a single target value —
                    // a self-resetting keyframe array would "complete" and
                    // freeze back at zero after `duration`, even while a
                    // continuous trigger like Hover is still holding distort.
                    const restState = { opacity: 0, scaleX: 0.4 }
                    const distortState = {
                        opacity: 0.65 + intensityRatio * 0.35,
                        scaleX: 0.9 + intensityRatio * 0.5,
                    }
                    const commonStyle: React.CSSProperties =
                        direction === "horizontal"
                            ? {
                                  position: "absolute",
                                  top: `${s.pos}%`,
                                  left: "-60%",
                                  width: "220%",
                                  height: s.thickness + intensityRatio * 4,
                                  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                                  boxShadow: `0 0 ${4 + intensityRatio * 6}px ${color}`,
                                  mixBlendMode: "screen",
                              }
                            : {
                                  position: "absolute",
                                  left: `${s.pos}%`,
                                  top: "-60%",
                                  height: "220%",
                                  width: s.thickness + intensityRatio * 4,
                                  background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
                                  boxShadow: `0 0 ${4 + intensityRatio * 6}px ${color}`,
                                  mixBlendMode: "screen",
                              }

                    return (
                        <motion.div
                            key={i}
                            style={commonStyle}
                            initial={restState}
                            animate={active ? distortState : restState}
                            transition={
                                active
                                    ? { duration: duration * 0.25, delay: i * stagger + s.delayJitter * stagger, ease: "easeOut" }
                                    : { duration: duration * 0.6, delay: 0, ease: easeCurve }
                            }
                        />
                    )
                })}

                {noiseBlocks.map((b, i) => {
                    const restState = { opacity: 0 }
                    const distortState = { opacity: 0.55 + intensityRatio * 0.35 }
                    return (
                        <motion.div
                            key={i}
                            style={{
                                position: "absolute",
                                left: `${b.x}%`,
                                top: `${b.y}%`,
                                width: `${b.w}%`,
                                height: `${b.h}%`,
                                filter: `url(#${filterId})`,
                                mixBlendMode: "screen",
                            }}
                            initial={restState}
                            animate={active ? distortState : restState}
                            transition={
                                active
                                    ? {
                                          duration: duration * 0.2,
                                          delay: i * stagger * 1.6 + b.delayJitter * stagger,
                                          ease: "easeOut",
                                      }
                                    : { duration: duration * 0.5, delay: 0, ease: easeCurve }
                            }
                        />
                    )
                })}
            </div>
        </div>
    )
}

addPropertyControls(GlitchEffect, {
    children: {
        type: ControlType.ComponentInstance,
        title: "Content",
    },
    direction: {
        type: ControlType.Enum,
        title: "Streak Direction",
        options: ["horizontal", "vertical"],
        optionTitles: ["Horizontal", "Vertical"],
        displaySegmentedControl: true,
        defaultValue: "horizontal",
    },
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["hover", "scroll", "auto", "random", "load"],
        optionTitles: ["Hover", "Scroll Into View", "Auto Loop", "Random", "On Load"],
        defaultValue: "hover",
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 60,
    },
    streakCount: {
        type: ControlType.Number,
        title: "Streaks",
        min: 0,
        max: 16,
        step: 1,
        defaultValue: 6,
    },
    noiseBlockCount: {
        type: ControlType.Number,
        title: "Noise Blocks",
        min: 0,
        max: 12,
        step: 1,
        defaultValue: 4,
    },
    accentColorA: {
        type: ControlType.Color,
        title: "Streak Color 1",
        defaultValue: "#00e5ff",
    },
    accentColorB: {
        type: ControlType.Color,
        title: "Streak Color 2",
        defaultValue: "#ff2df0",
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 2,
        step: 0.05,
        defaultValue: 0.5,
        unit: "s",
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 0.2,
        step: 0.005,
        defaultValue: 0.03,
        unit: "s",
    },
    easing: {
        type: ControlType.Enum,
        title: "Easing",
        options: ["smooth", "snappy", "elastic", "linear"],
        optionTitles: ["Smooth", "Snappy", "Elastic", "Linear"],
        defaultValue: "snappy",
    },
    autoInterval: {
        type: ControlType.Number,
        title: "Interval",
        min: 0.2,
        max: 10,
        step: 0.1,
        defaultValue: 1.5,
        unit: "s",
        hidden: (props: GlitchEffectProps) => props.trigger !== "auto",
    },
    randomMinInterval: {
        type: ControlType.Number,
        title: "Min Interval",
        min: 0.1,
        max: 15,
        step: 0.1,
        defaultValue: 0.6,
        unit: "s",
        hidden: (props: GlitchEffectProps) => props.trigger !== "random",
    },
    randomMaxInterval: {
        type: ControlType.Number,
        title: "Max Interval",
        min: 0.1,
        max: 20,
        step: 0.1,
        defaultValue: 2.5,
        unit: "s",
        hidden: (props: GlitchEffectProps) => props.trigger !== "random",
    },
    replay: {
        type: ControlType.Boolean,
        title: "Replay on Re-enter",
        defaultValue: true,
        hidden: (props: GlitchEffectProps) => props.trigger !== "scroll",
    },
})
