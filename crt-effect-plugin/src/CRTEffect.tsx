import * as React from "react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface CRTEffectProps {
    children?: React.ReactNode
    clipContent?: boolean
    cornerRadius?: number
    curvature?: number
    aberration?: number
    scanlines?: boolean
    scanlineOpacity?: number
    scanlineSpacing?: number
    vignette?: boolean
    vignetteOpacity?: number
    grain?: boolean
    grainOpacity?: number
    animateGrain?: boolean
    flicker?: boolean
    flickerIntensity?: number
    rollBar?: boolean
    rollBarSpeed?: number
    tint?: boolean
    tintColor?: string
    tintOpacity?: number
    style?: React.CSSProperties
}

const MAP_SIZE = 256
// Reference bake strength for the displacement field — deliberately just a
// fixed constant, not tied to the Curvature prop. feDisplacementMap's own
// `scale` attribute is what actually dials the visible strength at render
// time (a plain reactive number, no canvas regeneration needed), so the
// field only ever needs to be generated once and shared by every instance.
const REFERENCE_WARP = 0.35
const MAX_CURVATURE_SCALE = 340
const MAX_ABERRATION_PX = 7

/**
 * Bakes a radial "barrel lens" displacement field into an offscreen canvas
 * and returns it as a data URL for feImage. Uses the same coordinate-swap
 * shape common to CRT shaders — the horizontal displacement at a point
 * depends on its *vertical* distance from center, and vice versa — which is
 * what produces bowed barrel sides rather than a uniform fisheye bulge.
 * Channel value 128 = zero displacement, matching feDisplacementMap's
 * no-op midpoint, so scale=0 is a true identity transform.
 */
function generateBarrelMap(): string {
    const canvas = document.createElement("canvas")
    canvas.width = MAP_SIZE
    canvas.height = MAP_SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) return ""
    const imageData = ctx.createImageData(MAP_SIZE, MAP_SIZE)
    const data = imageData.data
    for (let y = 0; y < MAP_SIZE; y++) {
        const v = (y / (MAP_SIZE - 1)) * 2 - 1
        for (let x = 0; x < MAP_SIZE; x++) {
            const u = (x / (MAP_SIZE - 1)) * 2 - 1
            const offsetX = Math.abs(v) * REFERENCE_WARP
            const offsetY = Math.abs(u) * REFERENCE_WARP
            const du = u * offsetX * offsetX
            const dv = v * offsetY * offsetY
            const idx = (y * MAP_SIZE + x) * 4
            data[idx] = Math.max(0, Math.min(255, 128 + du * 1000))
            data[idx + 1] = Math.max(0, Math.min(255, 128 + dv * 1000))
            data[idx + 2] = 128
            data[idx + 3] = 255
        }
    }
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL()
}

let cachedBarrelMapUrl: string | null = null
function getBarrelMapUrl(): string {
    if (!cachedBarrelMapUrl) cachedBarrelMapUrl = generateBarrelMap()
    return cachedBarrelMapUrl
}

// Reads the "Reduce Effects" flag from the accessibility-panel-plugin, if
// one is present on the page — a plain window CustomEvent + localStorage
// key, not a Framer-specific mechanism, so this component works fine on
// its own with no accessibility panel anywhere in the project (falls back
// to enabled). Duplicated into CRTEffect.tsx, CRTEffectAuto.tsx, and
// GlitchEffect.tsx rather than imported, matching every other piece of
// shared logic across this repo's plugins — each file stays a single
// paste-in component with no cross-file dependency to wire up in Framer.
const A11Y_PREFIX = "fr-a11y-"
const A11Y_EFFECTS_ENABLED_KEY = "effects-enabled"

function useA11yEffectsEnabled(): boolean {
    const [enabled, setEnabled] = useState(true)
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(A11Y_PREFIX + A11Y_EFFECTS_ENABLED_KEY)
            setEnabled(raw === null ? true : JSON.parse(raw))
        } catch {
            setEnabled(true)
        }
        const handler = (e: Event) => setEnabled((e as CustomEvent<boolean>).detail)
        window.addEventListener(A11Y_PREFIX + A11Y_EFFECTS_ENABLED_KEY, handler)
        return () => window.removeEventListener(A11Y_PREFIX + A11Y_EFFECTS_ENABLED_KEY, handler)
    }, [])
    return enabled
}

/**
 * CRTEffect — wraps an entire page/template (connect its root layer as
 * Content) and overlays an old-monitor look: barrel-lens curvature,
 * chromatic fringing, scanlines, vignette, animated grain, flicker, and an
 * optional rolling sync bar. Unlike Glitch Effect, Content is rendered
 * exactly once — this is meant to wrap a whole live, interactive page, so
 * duplicating it (as Glitch Effect's tear/ghost layers do for a single
 * decorative shape) would duplicate real buttons, links, and form fields.
 * Every overlay layer is pointer-events: none so the page underneath stays
 * fully interactive.
 */
export default function CRTEffect(props: CRTEffectProps) {
    const {
        children,
        clipContent = true,
        cornerRadius = 24,
        curvature = 30,
        aberration = 25,
        scanlines = true,
        scanlineOpacity = 35,
        scanlineSpacing = 3,
        vignette = true,
        vignetteOpacity = 55,
        grain = true,
        grainOpacity = 12,
        animateGrain = true,
        flicker = true,
        flickerIntensity = 25,
        rollBar = false,
        rollBarSpeed = 9,
        tint = false,
        tintColor = "#33ff66",
        tintOpacity = 25,
        style,
    } = props

    // Curvature and aberration are static configuration, not a burst
    // trigger, so they render on Framer's design canvas too (so the frame
    // preview is accurate while designing) — only the continuous-motion
    // pieces (flicker, roll bar, animated grain) freeze there.
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    // "Reduce Effects" is a live user preference, not a design-time
    // concern — it should never hide the effect while designing on
    // canvas (that would defeat the whole point of Curvature staying
    // visible there), only in real Preview/published where it's actually
    // representing someone's accessibility choice.
    const a11yEffectsEnabled = useA11yEffectsEnabled()
    const reduceEffects = !isCanvas && !a11yEffectsEnabled

    const filterId = useId().replace(/[:]/g, "")
    const crtFilterId = `${filterId}-crt`
    const grainFilterId = `${filterId}-grain`

    const barrelMapUrl = useMemo(() => getBarrelMapUrl(), [])

    const curvatureScale = reduceEffects
        ? 0
        : (Math.min(100, Math.max(0, curvature)) / 100) * MAX_CURVATURE_SCALE
    const aberrationPx = reduceEffects
        ? 0
        : (Math.min(100, Math.max(0, aberration)) / 100) * MAX_ABERRATION_PX

    // feImage's x/y/width/height percentages resolve inconsistently across
    // browsers (a long-standing SVG spec gap), which showed up as the
    // barrel map landing wildly mis-scaled/mis-positioned relative to the
    // actual content — instead of a symmetric bulge, the whole page just
    // shifted hard to one side. Feeding it explicit pixel dimensions,
    // measured from the filtered element itself, sidesteps that entirely.
    const contentRef = useRef<HTMLDivElement>(null)
    const [contentSize, setContentSize] = useState({ width: 0, height: 0 })
    useEffect(() => {
        const el = contentRef.current
        if (!el) return
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (!entry) return
            const { width, height } = entry.contentRect
            setContentSize({ width, height })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    // Grain's noise field is static by default (fixed seed) but can be
    // "animated" cheaply by re-rolling the feTurbulence seed a few times a
    // second via direct DOM attribute writes — a real per-frame rAF loop
    // isn't needed since analog static doesn't read as smoother at 60fps
    // than it does at ~10fps, so a plain interval is both simpler and
    // cheaper here.
    const grainTurbulenceRef = useRef<SVGFETurbulenceElement>(null)
    useEffect(() => {
        if (!grain || !animateGrain || isCanvas) return
        const id = setInterval(() => {
            grainTurbulenceRef.current?.setAttribute("seed", String(Math.floor(Math.random() * 1000)))
        }, 90)
        return () => clearInterval(id)
    }, [grain, animateGrain, isCanvas])

    return (
        <div
            data-crt-effect-root="true"
            style={{
                position: "relative",
                ...style,
                overflow: clipContent ? "hidden" : "visible",
                borderRadius: clipContent ? cornerRadius : undefined,
            }}
        >
            {/* Content rendered exactly once — this wraps a whole live page,
                not a single decorative shape, so duplicating it the way
                Glitch Effect's Tear/Ghost layers do would duplicate real
                interactive elements. */}
            <div ref={contentRef} style={{ filter: `url(#${crtFilterId})` }}>
                {children}
            </div>

            {scanlines && !reduceEffects && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,${
                            scanlineOpacity / 100
                        }) 0px, rgba(0,0,0,${scanlineOpacity / 100}) 1px, transparent 1px, transparent ${scanlineSpacing}px)`,
                    }}
                />
            )}

            {vignette && !reduceEffects && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${
                            vignetteOpacity / 100
                        }) 100%)`,
                    }}
                />
            )}

            {grain && !reduceEffects && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        mixBlendMode: "screen",
                        opacity: grainOpacity / 100,
                        filter: `url(#${grainFilterId})`,
                        background: "#fff",
                    }}
                />
            )}

            {flicker && !reduceEffects && (
                <motion.div
                    aria-hidden="true"
                    style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "#000" }}
                    animate={
                        isCanvas
                            ? { opacity: 0 }
                            : {
                                  opacity: [
                                      0,
                                      (flickerIntensity / 100) * 0.5,
                                      0,
                                      0,
                                      (flickerIntensity / 100) * 0.18,
                                      0,
                                      (flickerIntensity / 100) * 0.32,
                                      0,
                                      0,
                                  ],
                              }
                    }
                    transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        times: [0, 0.05, 0.09, 0.4, 0.44, 0.48, 0.74, 0.78, 1],
                        ease: "linear",
                    }}
                />
            )}

            {rollBar && !reduceEffects && (
                <motion.div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        height: "16%",
                        pointerEvents: "none",
                        background:
                            "linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.07) 55%, transparent)",
                    }}
                    animate={isCanvas ? { top: "-20%" } : { top: ["-20%", "120%"] }}
                    transition={{ duration: rollBarSpeed, repeat: Infinity, ease: "linear" }}
                />
            )}

            {tint && !reduceEffects && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: tintColor,
                        mixBlendMode: "color",
                        opacity: tintOpacity / 100,
                    }}
                />
            )}

            <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden="true">
                <defs>
                    {/* Barrel curvature (a static field pushed through
                        feDisplacementMap, strength dialed purely by
                        `scale`) followed by a static per-channel R/B
                        offset + screen recombine for chromatic fringing —
                        both are configuration, not animation, so this
                        whole filter just re-renders reactively with plain
                        numbers, no rAF loop needed. Both sit at their
                        identity values (scale 0, offset 0) when their
                        controls are 0, so the filter is a true no-op then. */}
                    <filter
                        id={crtFilterId}
                        x="-15%"
                        y="-15%"
                        width="130%"
                        height="130%"
                        colorInterpolationFilters="sRGB"
                    >
                        <feImage
                            href={barrelMapUrl}
                            x={0}
                            y={0}
                            width={Math.max(1, contentSize.width)}
                            height={Math.max(1, contentSize.height)}
                            preserveAspectRatio="none"
                            result="warpMap"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="warpMap"
                            scale={curvatureScale}
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
                        <feOffset in="rChan" dx={-aberrationPx} dy="0" result="rShift" />
                        <feColorMatrix
                            in="warped"
                            type="matrix"
                            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                            result="gChan"
                        />
                        <feColorMatrix
                            in="warped"
                            type="matrix"
                            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                            result="bChan"
                        />
                        <feOffset in="bChan" dx={aberrationPx} dy="0" result="bShift" />
                        <feBlend in="rShift" in2="gChan" mode="screen" result="rg" />
                        <feBlend in="rg" in2="bShift" mode="screen" />
                    </filter>

                    {/* Grain: fine turbulence recolored to white with alpha
                        derived from noise luminance, screen-blended at low
                        opacity by the div that references this filter. */}
                    <filter id={grainFilterId} x="0%" y="0%" width="100%" height="100%">
                        <feTurbulence
                            ref={grainTurbulenceRef}
                            type="fractalNoise"
                            baseFrequency="0.85"
                            numOctaves={2}
                            seed={5}
                            stitchTiles="stitch"
                            result="noise"
                        />
                        <feColorMatrix
                            in="noise"
                            type="matrix"
                            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.5 0.5 0.5 0 0"
                        />
                    </filter>
                </defs>
            </svg>
        </div>
    )
}

addPropertyControls(CRTEffect, {
    children: {
        type: ControlType.ComponentInstance,
        title: "Content",
    },
    clipContent: {
        type: ControlType.Boolean,
        title: "Clip Content",
        defaultValue: true,
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Corner Radius",
        min: 0,
        max: 120,
        step: 1,
        defaultValue: 24,
        unit: "px",
        hidden: (props: CRTEffectProps) => !props.clipContent,
    },
    curvature: {
        type: ControlType.Number,
        title: "Curvature",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 30,
    },
    aberration: {
        type: ControlType.Number,
        title: "Chromatic Aberration",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 25,
    },
    scanlines: {
        type: ControlType.Boolean,
        title: "Scanlines",
        defaultValue: true,
    },
    scanlineOpacity: {
        type: ControlType.Number,
        title: "Scanline Opacity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 35,
        hidden: (props: CRTEffectProps) => !props.scanlines,
    },
    scanlineSpacing: {
        type: ControlType.Number,
        title: "Scanline Spacing",
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 3,
        unit: "px",
        hidden: (props: CRTEffectProps) => !props.scanlines,
    },
    vignette: {
        type: ControlType.Boolean,
        title: "Vignette",
        defaultValue: true,
    },
    vignetteOpacity: {
        type: ControlType.Number,
        title: "Vignette Opacity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 55,
        hidden: (props: CRTEffectProps) => !props.vignette,
    },
    grain: {
        type: ControlType.Boolean,
        title: "Grain",
        defaultValue: true,
    },
    grainOpacity: {
        type: ControlType.Number,
        title: "Grain Opacity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 12,
        hidden: (props: CRTEffectProps) => !props.grain,
    },
    animateGrain: {
        type: ControlType.Boolean,
        title: "Animate Grain",
        defaultValue: true,
        hidden: (props: CRTEffectProps) => !props.grain,
    },
    flicker: {
        type: ControlType.Boolean,
        title: "Flicker",
        defaultValue: true,
    },
    flickerIntensity: {
        type: ControlType.Number,
        title: "Flicker Intensity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 25,
        hidden: (props: CRTEffectProps) => !props.flicker,
    },
    rollBar: {
        type: ControlType.Boolean,
        title: "Roll Bar",
        defaultValue: false,
    },
    rollBarSpeed: {
        type: ControlType.Number,
        title: "Roll Bar Speed",
        min: 2,
        max: 30,
        step: 0.5,
        defaultValue: 9,
        unit: "s",
        hidden: (props: CRTEffectProps) => !props.rollBar,
    },
    tint: {
        type: ControlType.Boolean,
        title: "Phosphor Tint",
        defaultValue: false,
    },
    tintColor: {
        type: ControlType.Color,
        title: "Tint Color",
        defaultValue: "#33ff66",
        hidden: (props: CRTEffectProps) => !props.tint,
    },
    tintOpacity: {
        type: ControlType.Number,
        title: "Tint Opacity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 25,
        hidden: (props: CRTEffectProps) => !props.tint,
    },
})
