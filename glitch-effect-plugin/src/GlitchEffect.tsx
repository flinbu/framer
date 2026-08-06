import * as React from "react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { motion, useInView, type Easing } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

type Direction = "horizontal" | "vertical"
type Trigger = "hover" | "scroll" | "auto" | "random" | "load"
type EasingPreset = "smooth" | "snappy" | "elastic" | "linear"
type Effect = "datamosh" | "slide" | "melt" | "none"

interface GlitchEffectProps {
    children?: React.ReactNode
    direction?: Direction
    trigger?: Trigger
    intensity?: number
    effect?: Effect
    effectSpeed?: number
    tearContent?: boolean
    bandCount?: number
    ghostContent?: boolean
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

const srOnlyStyle: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
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
        effect = "datamosh",
        effectSpeed = 1,
        tearContent = false,
        bandCount = 4,
        ghostContent = false,
        streakCount = 0,
        noiseBlockCount = 0,
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
    const ghostFilterIdA = `${filterId}-ghost-a`
    const ghostFilterIdB = `${filterId}-ghost-b`
    const datamoshFilterId = `${filterId}-datamosh`
    const slideFilterId = `${filterId}-slide`
    const meltFilterId = `${filterId}-melt`
    const meltGrainFilterId = `${filterId}-melt-grain`

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

    const clampedBandCount = Math.max(1, Math.round(bandCount))
    const bandPct = 100 / clampedBandCount

    // Every band is the same full-size copy of the content, stacked exactly
    // on top of the others and windowed into view with clip-path. Sliced
    // Text bleeds adjacent slices into each other by a fraction of a pixel
    // so device-pixel rounding overlaps instead of gapping — that works
    // there because the content is opaque flat color, where a redundant
    // second paint of the same pixel is invisible. A translucent glow is
    // the opposite: overlap means two bands both paint the same
    // semi-transparent sliver, which visibly brightens it. A tiny gap in a
    // blurred edge is far less noticeable than that, so this uses none.
    const BAND_BLEED = 0
    // Content like a glowing shape can paint well outside its own box (a
    // blurred box-shadow, for instance). The seams *between* bands should
    // stay tight — that hard edge is the intentional torn look — but the
    // very first/last band and the whole cross-axis aren't seams at all,
    // so they get a generous outward allowance instead, or the shape's own
    // glow gets clipped into a flat rectangle at rest.
    const EDGE_BLEED_PCT = 60
    function bandClipPath(index: number): string {
        const isFirst = index === 0
        const isLast = index === clampedBandCount - 1
        const mainStart = isFirst ? `-${EDGE_BLEED_PCT}%` : `calc(${index * bandPct}% - ${BAND_BLEED}px)`
        const mainEnd = isLast
            ? `-${EDGE_BLEED_PCT}%`
            : `calc(${100 - (index + 1) * bandPct}% - ${BAND_BLEED}px)`
        return direction === "horizontal"
            ? `inset(${mainStart} -${EDGE_BLEED_PCT}% ${mainEnd} -${EDGE_BLEED_PCT}%)`
            : `inset(-${EDGE_BLEED_PCT}% ${mainEnd} -${EDGE_BLEED_PCT}% ${mainStart})`
    }

    const bands = useMemo(() => {
        return Array.from({ length: clampedBandCount }, (_, i) => {
            const seed = i + 21
            return {
                jitterMain: [0, signedRandom(seed * 1.3), signedRandom(seed * 2.9) * 0.6, signedRandom(seed * 4.1), 0],
                jitterCross: [0, signedRandom(seed * 5.7) * 0.3, 0, signedRandom(seed * 6.9) * 0.3, 0],
                jitterSkew: [0, signedRandom(seed * 8.3) * 0.5, 0],
                delayJitter: seededRandom(seed * 3.3),
            }
        })
    }, [clampedBandCount])

    const active = phase === "distort" && !isCanvas

    // Datamosh: a continuous liquid warp plus independently-drifting R/G/B
    // channels, driven every frame via requestAnimationFrame rather than
    // framer-motion — SVG filter primitives (feOffset, feDisplacementMap)
    // aren't part of framer-motion's animatable style/motion-value system,
    // so their attributes are written directly to the DOM each frame
    // instead of through React state (avoids a re-render on every frame).
    // Reading `active`/`intensity` through refs, updated separately, lets
    // the loop itself run continuously from mount without restarting (and
    // losing its sine phase) every time the trigger flips.
    const datamoshWarpRef = useRef<SVGFEDisplacementMapElement>(null)
    const datamoshROffsetRef = useRef<SVGFEOffsetElement>(null)
    const datamoshGOffsetRef = useRef<SVGFEOffsetElement>(null)
    const datamoshBOffsetRef = useRef<SVGFEOffsetElement>(null)
    const effectActiveRef = useRef(active)
    const effectIntensityRef = useRef(intensityRatio)
    const effectSpeedRef = useRef(effectSpeed)

    useEffect(() => {
        effectActiveRef.current = active
    }, [active])
    useEffect(() => {
        effectIntensityRef.current = intensityRatio
    }, [intensityRatio])
    useEffect(() => {
        effectSpeedRef.current = effectSpeed
    }, [effectSpeed])

    useEffect(() => {
        if (effect !== "datamosh" || isCanvas) return
        let rafId: number
        let start: number | null = null
        let amount = 0
        let wasIdle = true
        const tick = (t: number) => {
            const target = effectActiveRef.current ? 1 : 0
            // Idle: already settled to zero and nothing wants it to move.
            // Skip the trig + DOM writes (the expensive part) and just
            // keep the loop alive with a cheap check, rather than doing
            // real work 60x/sec forever once a burst has long since ended.
            if (amount === 0 && target === 0 && wasIdle) {
                rafId = requestAnimationFrame(tick)
                return
            }

            if (start === null) start = t
            const speed = Math.max(0.1, effectSpeedRef.current)
            const elapsed = ((t - start) / 1000) * speed
            const ratio = effectIntensityRef.current
            const maxWarp = 6 + ratio * 46
            const maxShift = 3 + ratio * 24
            amount += (target - amount) * 0.08
            if (amount < 0.001) amount = 0
            wasIdle = amount === 0 && target === 0

            datamoshWarpRef.current?.setAttribute(
                "scale",
                String(amount * maxWarp * (0.5 + 0.5 * Math.sin(elapsed * 2.2)))
            )
            datamoshROffsetRef.current?.setAttribute("dx", String(amount * maxShift * Math.sin(elapsed * 2.6 + 0.4)))
            datamoshROffsetRef.current?.setAttribute(
                "dy",
                String(amount * maxShift * 0.3 * Math.sin(elapsed * 1.9 + 1.1))
            )
            datamoshGOffsetRef.current?.setAttribute("dx", String(amount * maxShift * Math.sin(elapsed * 3.1 + 2.3)))
            datamoshGOffsetRef.current?.setAttribute(
                "dy",
                String(amount * maxShift * 0.3 * Math.sin(elapsed * 2.2 + 0.2))
            )
            datamoshBOffsetRef.current?.setAttribute("dx", String(amount * maxShift * Math.sin(elapsed * 2.1 + 4.1)))
            datamoshBOffsetRef.current?.setAttribute(
                "dy",
                String(amount * maxShift * 0.3 * Math.sin(elapsed * 2.8 + 3.0))
            )

            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [effect, isCanvas])

    // Slide: the whole layer jump-cuts to a new offset every fraction of a
    // second and holds there (rather than gliding continuously, like
    // Datamosh) plus a hue-rotate that cycles while active — the
    // whole-block position snap + color-tint-cycle look from the reference
    // footage. `next`/`current`/`target` live as plain closure variables
    // (not refs/state) since they're pure animation-loop bookkeeping, same
    // idle-skip shape as the Datamosh loop above.
    const slideOffsetRef = useRef<SVGFEOffsetElement>(null)
    const slideHueRef = useRef<SVGFEColorMatrixElement>(null)

    useEffect(() => {
        if (effect !== "slide" || isCanvas) return
        let rafId: number
        let start: number | null = null
        let amount = 0
        let wasIdle = true
        let currentMain = 0
        let currentCross = 0
        let targetMain = 0
        let targetCross = 0
        let nextJumpAt = 0
        const tick = (t: number) => {
            const target = effectActiveRef.current ? 1 : 0
            if (amount === 0 && target === 0 && wasIdle) {
                rafId = requestAnimationFrame(tick)
                return
            }

            if (start === null) start = t
            const speed = Math.max(0.1, effectSpeedRef.current)
            const elapsed = ((t - start) / 1000) * speed
            const ratio = effectIntensityRef.current
            const maxMain = 6 + ratio * 40
            const maxCross = 2 + ratio * 10
            amount += (target - amount) * 0.08
            if (amount < 0.001) amount = 0
            wasIdle = amount === 0 && target === 0

            if (elapsed >= nextJumpAt) {
                targetMain = (Math.random() * 2 - 1) * maxMain
                targetCross = (Math.random() * 2 - 1) * maxCross
                nextJumpAt = elapsed + 0.15 + Math.random() * 0.35
            }
            // Fast lerp, not a smooth glide — reads as a snap-to-position
            // jump-cut with a brief hold, not a slide.
            currentMain += (targetMain - currentMain) * 0.35
            currentCross += (targetCross - currentCross) * 0.35

            const dx = direction === "horizontal" ? currentMain : currentCross
            const dy = direction === "horizontal" ? currentCross : currentMain
            slideOffsetRef.current?.setAttribute("dx", String(dx * amount))
            slideOffsetRef.current?.setAttribute("dy", String(dy * amount))
            const hue = ((elapsed * 240) % 360) * amount
            slideHueRef.current?.setAttribute("values", String(hue))

            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [effect, isCanvas, direction])

    // Melt: an anisotropic turbulence field (fine-grained on one axis, very
    // low-frequency — i.e. tall coherent blobs — on the other) pushes
    // pixels through feDisplacementMap, whose strength pulses the same way
    // Datamosh's warp does. The elongated noise is what reads as streaky
    // vertical drips rather than a uniform ripple. A slight desaturation
    // rides along with it (values eased from 1 = identity at rest down
    // toward the target as `amount` rises, so it stays a true no-op idle).
    const meltDisplaceRef = useRef<SVGFEDisplacementMapElement>(null)
    const meltSaturateRef = useRef<SVGFEColorMatrixElement>(null)

    useEffect(() => {
        if (effect !== "melt" || isCanvas) return
        let rafId: number
        let start: number | null = null
        let amount = 0
        let wasIdle = true
        const tick = (t: number) => {
            const target = effectActiveRef.current ? 1 : 0
            if (amount === 0 && target === 0 && wasIdle) {
                rafId = requestAnimationFrame(tick)
                return
            }

            if (start === null) start = t
            const speed = Math.max(0.1, effectSpeedRef.current)
            const elapsed = ((t - start) / 1000) * speed
            const ratio = effectIntensityRef.current
            const maxDisplace = 10 + ratio * 70
            amount += (target - amount) * 0.08
            if (amount < 0.001) amount = 0
            wasIdle = amount === 0 && target === 0

            const wobble = 0.6 + 0.4 * Math.sin(elapsed * 1.7)
            meltDisplaceRef.current?.setAttribute("scale", String(amount * maxDisplace * wobble))
            meltSaturateRef.current?.setAttribute("values", String(1 - amount * 0.35))

            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [effect, isCanvas])

    const effectStyle: React.CSSProperties | undefined =
        effect === "datamosh"
            ? { filter: `url(#${datamoshFilterId})` }
            : effect === "slide"
              ? { filter: `url(#${slideFilterId})` }
              : effect === "melt"
                ? { filter: `url(#${meltFilterId})` }
                : undefined

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
            {/* Sizer: invisible, in normal flow, defines the box the layers
                fill. Needed because once torn/ghosted, the visible content
                is absolutely positioned and no longer in flow itself. */}
            <div aria-hidden="true" style={{ visibility: "hidden", pointerEvents: "none" }}>
                {children}
            </div>

            {/* Accessible copy for assistive tech — the torn bands and ghost
                duplicates below are all aria-hidden, since screen readers
                shouldn't encounter the same content/interactive elements
                repeated across every band and ghost. */}
            <div style={srOnlyStyle}>{children}</div>

            {tearContent ? (
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, ...effectStyle }}>
                    {bands.map((b, i) => {
                        const magMain = 6 + intensityRatio * 34
                        const magCross = 2 + intensityRatio * 10
                        const magSkew = intensityRatio * 8
                        const restState =
                            direction === "horizontal" ? { x: 0, y: 0, skewX: 0 } : { x: 0, y: 0, skewY: 0 }
                        const activeKeyframes =
                            direction === "horizontal"
                                ? {
                                      x: b.jitterMain.map((v) => v * magMain),
                                      y: b.jitterCross.map((v) => v * magCross),
                                      skewX: b.jitterSkew.map((v) => v * magSkew),
                                  }
                                : {
                                      x: b.jitterCross.map((v) => v * magCross),
                                      y: b.jitterMain.map((v) => v * magMain),
                                      skewY: b.jitterSkew.map((v) => v * magSkew),
                                  }

                        return (
                            <motion.div
                                key={i}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    clipPath: bandClipPath(i),
                                    WebkitClipPath: bandClipPath(i),
                                }}
                                animate={active ? activeKeyframes : restState}
                                transition={
                                    active
                                        ? {
                                              duration: duration * 1.4,
                                              repeat: Infinity,
                                              repeatType: "loop",
                                              ease: "easeInOut",
                                              delay: b.delayJitter * stagger,
                                          }
                                        : { duration: duration * 0.5, ease: easeCurve }
                                }
                            >
                                {children}
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                <div style={{ position: "absolute", inset: 0, ...effectStyle }}>{children}</div>
            )}

            {/* Ghost duplicates: two full extra copies of the content,
                recolored to a flat Streak Color 1/2 silhouette via an SVG
                filter (feFlood + feComposite "in") that's masked to the
                content's own alpha shape — a CSS mix-blend-mode overlay
                can't do this: blending a solid color against a mostly
                transparent backdrop still paints the full bounding box,
                not just the visible pixels. Screen-blended and offset as a
                unit for a chromatic ghosting/RGB-split look on the object
                itself, not just decoration around it. */}
            {ghostContent &&
                [
                    { color: accentColorA, filterId: ghostFilterIdA },
                    { color: accentColorB, filterId: ghostFilterIdB },
                ].map(({ filterId: gFilterId }, gi) => {
                    const sign = gi === 0 ? -1 : 1
                    const jitterSeed = gi === 0 ? 501 : 907
                    const magMain = 4 + intensityRatio * 18
                    const magCross = 2 + intensityRatio * 8
                    const baseOffset = sign * (3 + intensityRatio * 5)
                    const restState =
                        direction === "horizontal" ? { x: baseOffset, y: 0 } : { x: 0, y: baseOffset }
                    const activeKeyframes =
                        direction === "horizontal"
                            ? {
                                  x: [
                                      baseOffset,
                                      baseOffset + signedRandom(jitterSeed * 1.1) * magMain,
                                      baseOffset + signedRandom(jitterSeed * 2.3) * magMain,
                                      baseOffset,
                                  ],
                                  y: [0, signedRandom(jitterSeed * 3.7) * magCross, 0],
                              }
                            : {
                                  y: [
                                      baseOffset,
                                      baseOffset + signedRandom(jitterSeed * 1.1) * magMain,
                                      baseOffset + signedRandom(jitterSeed * 2.3) * magMain,
                                      baseOffset,
                                  ],
                                  x: [0, signedRandom(jitterSeed * 3.7) * magCross, 0],
                              }

                    return (
                        <motion.div
                            key={gi}
                            aria-hidden="true"
                            style={{
                                position: "absolute",
                                inset: 0,
                                mixBlendMode: "screen",
                                pointerEvents: "none",
                                filter: `url(#${gFilterId})`,
                            }}
                            animate={active ? activeKeyframes : restState}
                            transition={
                                active
                                    ? { duration: duration * 1.3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                                    : { duration: duration * 0.6, ease: easeCurve }
                            }
                        >
                            {children}
                        </motion.div>
                    )
                })}

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

                    {/* Floods the content's own alpha shape with a flat
                        color — a silhouette recolor that respects
                        transparency, unlike a CSS blend-mode overlay. The
                        region is generous (not just the element's own box)
                        so it doesn't clip a soft box-shadow/glow that
                        extends past the element's edges. */}
                    <filter id={ghostFilterIdA} x="-75%" y="-75%" width="250%" height="250%">
                        <feFlood floodColor={accentColorA} result="flood" />
                        <feComposite in="flood" in2="SourceGraphic" operator="in" />
                    </filter>
                    <filter id={ghostFilterIdB} x="-75%" y="-75%" width="250%" height="250%">
                        <feFlood floodColor={accentColorB} result="flood" />
                        <feComposite in="flood" in2="SourceGraphic" operator="in" />
                    </filter>

                    {/* Datamosh: a static, large-scale turbulence field
                        pushes pixels around by an animated `scale` (the
                        noise pattern itself stays fixed — only its
                        strength pulses — which is far cheaper than
                        regenerating turbulence every frame and still reads
                        as a liquid warp). The warped result is then split
                        into its R/G/B channels via three feColorMatrix
                        primitives, each channel nudged by its own
                        independently-animated feOffset, and recombined
                        with feBlend "screen" — screening three
                        single-channel images back together exactly
                        reconstructs the original at zero offset, so this
                        is a no-op until the offsets move. colorInterpolationFilters
                        is set to sRGB because SVG filters default to
                        linearRGB, which visibly shifts colors for
                        feColorMatrix/feBlend relative to how they actually
                        display. */}
                    <filter
                        id={datamoshFilterId}
                        x="-40%"
                        y="-40%"
                        width="180%"
                        height="180%"
                        colorInterpolationFilters="sRGB"
                    >
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.008 0.015"
                            numOctaves={2}
                            seed={7}
                            result="warpNoise"
                        />
                        <feDisplacementMap
                            ref={datamoshWarpRef}
                            in="SourceGraphic"
                            in2="warpNoise"
                            scale={0}
                            xChannelSelector="R"
                            yChannelSelector="G"
                            result="warped"
                        />

                        <feColorMatrix
                            in="warped"
                            type="matrix"
                            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                            result="rChan"
                        />
                        <feOffset ref={datamoshROffsetRef} in="rChan" dx={0} dy={0} result="rShift" />

                        <feColorMatrix
                            in="warped"
                            type="matrix"
                            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                            result="gChan"
                        />
                        <feOffset ref={datamoshGOffsetRef} in="gChan" dx={0} dy={0} result="gShift" />

                        <feColorMatrix
                            in="warped"
                            type="matrix"
                            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                            result="bChan"
                        />
                        <feOffset ref={datamoshBOffsetRef} in="bChan" dx={0} dy={0} result="bShift" />

                        <feBlend in="rShift" in2="gShift" mode="screen" result="rg" />
                        <feBlend in="rg" in2="bShift" mode="screen" />
                    </filter>

                    {/* Slide: an feOffset that jump-cuts to a new position
                        (the JS loop lerps fast toward a freshly-picked
                        target every ~0.2-0.5s, rather than gliding, so it
                        reads as a snap) plus an feColorMatrix hueRotate
                        that cycles continuously while active — dx/dy/values
                        all sit at zero at rest, so it's a no-op idle. */}
                    <filter
                        id={slideFilterId}
                        x="-30%"
                        y="-30%"
                        width="160%"
                        height="160%"
                        colorInterpolationFilters="sRGB"
                    >
                        <feOffset ref={slideOffsetRef} in="SourceGraphic" dx={0} dy={0} result="slid" />
                        <feColorMatrix ref={slideHueRef} in="slid" type="hueRotate" values="0" />
                    </filter>

                    {/* Melt: an anisotropic turbulence field — fine-grained
                        on one axis, near-zero frequency (tall coherent
                        blobs) on the other — pushes pixels via
                        feDisplacementMap, whose scale pulses like
                        Datamosh's warp. The elongated blobs are what read
                        as streaky vertical drips rather than a uniform
                        ripple. A slight desaturation eases in alongside it
                        (feColorMatrix "saturate" values start at 1, the
                        identity, so it's a true no-op at rest too). */}
                    <filter
                        id={meltFilterId}
                        x="-60%"
                        y="-80%"
                        width="220%"
                        height="260%"
                        colorInterpolationFilters="sRGB"
                    >
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.06 0.006"
                            numOctaves={2}
                            seed={13}
                            result="meltNoise"
                        />
                        <feDisplacementMap
                            ref={meltDisplaceRef}
                            in="SourceGraphic"
                            in2="meltNoise"
                            scale={0}
                            xChannelSelector="R"
                            yChannelSelector="A"
                            result="melted"
                        />
                        <feColorMatrix ref={meltSaturateRef} in="melted" type="saturate" values="1" />
                    </filter>

                    {/* Fine white grain, layered as its own screen-blended
                        overlay div that renders another copy of the content
                        (opacity driven by ordinary framer-motion
                        active/rest, not raw refs — plain CSS opacity is
                        animatable through framer-motion). Masked to that
                        copy's own alpha shape via feComposite "in" — same
                        technique as the Ghost Duplicate recolor — so the
                        grain reads as texture on the object itself rather
                        than a flat noisy square floating behind it. */}
                    <filter id={meltGrainFilterId} x="-75%" y="-75%" width="250%" height="250%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.9"
                            numOctaves={2}
                            seed={5}
                            stitchTiles="stitch"
                            result="grainNoise"
                        />
                        <feColorMatrix
                            in="grainNoise"
                            type="matrix"
                            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.33 0.33 0.33 0 0"
                            result="whiteGrain"
                        />
                        <feComposite in="whiteGrain" in2="SourceGraphic" operator="in" />
                    </filter>
                </defs>
            </svg>

            {effect === "melt" && (
                <motion.div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        mixBlendMode: "screen",
                        pointerEvents: "none",
                        filter: `url(#${meltGrainFilterId})`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: active ? 0.12 + intensityRatio * 0.25 : 0 }}
                    transition={active ? { duration: duration * 0.3 } : { duration: duration * 0.6, ease: easeCurve }}
                >
                    {children}
                </motion.div>
            )}

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
    effect: {
        type: ControlType.Enum,
        title: "Effect",
        options: ["datamosh", "slide", "melt", "none"],
        optionTitles: ["Datamosh", "Slide", "Melt", "None"],
        defaultValue: "datamosh",
    },
    effectSpeed: {
        type: ControlType.Number,
        title: "Effect Speed",
        min: 0.2,
        max: 3,
        step: 0.1,
        defaultValue: 1,
        hidden: (props: GlitchEffectProps) => props.effect === "none",
    },
    tearContent: {
        type: ControlType.Boolean,
        title: "Tear Content",
        defaultValue: false,
    },
    bandCount: {
        type: ControlType.Number,
        title: "Tear Bands",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 4,
        hidden: (props: GlitchEffectProps) => !props.tearContent,
    },
    ghostContent: {
        type: ControlType.Boolean,
        title: "Ghost Duplicate",
        defaultValue: false,
    },
    streakCount: {
        type: ControlType.Number,
        title: "Streaks",
        min: 0,
        max: 16,
        step: 1,
        defaultValue: 0,
    },
    noiseBlockCount: {
        type: ControlType.Number,
        title: "Noise Blocks",
        min: 0,
        max: 12,
        step: 1,
        defaultValue: 0,
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
