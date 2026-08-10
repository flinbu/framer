import * as React from "react"
import { useEffect, useId, useRef, useState } from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface CRTEffectAutoProps {
    curvatureEnabled?: boolean
    curvature?: number
    aberrationEnabled?: boolean
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
const REFERENCE_WARP = 0.35
const MAX_CURVATURE_SCALE = 340
const MAX_ABERRATION_PX = 7
const OVERLAY_Z_INDEX = 2147483000

/** Same barrel-lens field bake as CRTEffect.tsx — see that file for the
 * detailed explanation of the coordinate-swap shape and channel encoding.
 * Duplicated rather than imported so this stays a single paste-in file,
 * matching every other component in this repo. */
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
 * CRTEffectAuto — the zero-configuration sibling of CRTEffect. Drop this
 * anywhere on a page or template, with nothing connected, and it applies
 * the same old-monitor look to the *entire rendered page* by reaching
 * outside its own render tree: curvature/aberration are applied straight
 * to `document.body.style.filter` in a side effect, and the overlay
 * layers (scanlines, vignette, grain, flicker, roll bar, tint) render as
 * `position: fixed` divs that cover the viewport regardless of where this
 * layer sits in the layer stack.
 *
 * This trades precision for convenience versus CRTEffect: it affects
 * everything on the page, not just a connected layer, and it does so by
 * mutating a shared, un-owned DOM node rather than something scoped to
 * this component's own subtree. Two things worth knowing before using it
 * (also covered in the README):
 *  1. Only use ONE instance per page — multiple instances all writing to
 *     `document.body.style.filter` will stomp on each other.
 *  2. Setting `filter` on `document.body` makes it the containing block
 *     for any `position: fixed` DESCENDANTS OF BODY ELSEWHERE ON THE PAGE
 *     (a real, if lesser-known, CSS rule — filter/transform on an
 *     ancestor does this to fixed descendants same as it does to
 *     absolute ones) — a sticky nav or fixed modal that has nothing to do
 *     with this effect can shift position once Curvature/Aberration are
 *     both 0 this doesn't apply (no filter is set at all), but above 0 it
 *     does, on the whole page, not just near this component.
 */
export default function CRTEffectAuto(props: CRTEffectAutoProps) {
    const {
        curvatureEnabled = true,
        curvature = 30,
        aberrationEnabled = true,
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

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    // "Reduce Effects" is a live user preference, not a design-time
    // concern — it should never hide anything while designing on canvas,
    // only in real Preview/published. On canvas this component already
    // shows its own placeholder box instead of the real effect, so there
    // is nothing to reduce there anyway.
    const a11yEffectsEnabled = useA11yEffectsEnabled()
    const reduceEffects = !isCanvas && !a11yEffectsEnabled

    const filterId = useId().replace(/[:]/g, "")
    const crtFilterId = `${filterId}-crt-auto`
    const grainFilterId = `${filterId}-grain-auto`

    // Not a useMemo: Framer's publish/optimize step runs a server-side
    // prerender pass of code components (confirmed via a real crash
    // report — "ReferenceError: document is not defined" inside this
    // exact useMemo, from react-dom's server render bundle). useMemo's
    // callback runs synchronously during that render, same as the
    // component body itself, so anything touching `document` there
    // crashes on the server. useEffect never runs during that pass, so
    // deferring the canvas-based bake to one is what actually makes this
    // safe to publish — the empty string just before it fires is a plain,
    // briefly-undistorted first paint, not a bug.
    const [barrelMapUrl, setBarrelMapUrl] = useState("")
    useEffect(() => {
        setBarrelMapUrl(getBarrelMapUrl())
    }, [])

    // Both default on to match the pre-toggle look, but either can be
    // switched off independently — each carries the exact same
    // containing-block risk on its own (see the property controls'
    // descriptions and the README), so turning off Curvature alone
    // doesn't fully protect a page's fixed/sticky elements if Aberration
    // is still on. Reduce Effects overrides both regardless of their own
    // toggles.
    const curvatureScale =
        curvatureEnabled && !reduceEffects
            ? (Math.min(100, Math.max(0, curvature)) / 100) * MAX_CURVATURE_SCALE
            : 0
    const aberrationPx =
        aberrationEnabled && !reduceEffects
            ? (Math.min(100, Math.max(0, aberration)) / 100) * MAX_ABERRATION_PX
            : 0

    // Measures document.body itself (its full rendered box, not just the
    // viewport) so feImage's pixel dimensions stay correct even on a page
    // taller than one screen — same fix as CRTEffect.tsx's ResizeObserver,
    // just watching body instead of a connected content div.
    const [bodySize, setBodySize] = useState({ width: 0, height: 0 })
    useEffect(() => {
        if (isCanvas) return
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (!entry) return
            const { width, height } = entry.contentRect
            setBodySize({ width, height })
        })
        observer.observe(document.body)
        return () => observer.disconnect()
    }, [isCanvas])

    // The actual page-wide effect: write the filter straight onto
    // document.body, restoring whatever was there before on cleanup. Only
    // runs in Preview/published — document.body doesn't correspond to a
    // single live page on Framer's canvas, so there's nothing sensible to
    // mutate there.
    //
    // Skipped entirely when both Curvature and Aberration are 0: setting
    // `filter` to ANY value — including this filter at its own identity
    // settings — still makes body the containing block for `position:
    // fixed`/`sticky` descendants (a custom cursor, a sticky nav) even
    // though the filter itself is visually a no-op. Not setting `filter`
    // at all is the only way to leave fixed/sticky elements genuinely
    // untouched, so there's no reason to pay that cost when this instance
    // isn't actually using either control.
    useEffect(() => {
        if (isCanvas) return
        if (curvatureScale === 0 && aberrationPx === 0) return
        const previous = document.body.style.filter
        document.body.style.filter = `url(#${crtFilterId})`
        return () => {
            document.body.style.filter = previous
        }
    }, [isCanvas, crtFilterId, curvatureScale, aberrationPx])

    const grainTurbulenceRef = useRef<SVGFETurbulenceElement>(null)
    useEffect(() => {
        if (!grain || !animateGrain || isCanvas) return
        const id = setInterval(() => {
            grainTurbulenceRef.current?.setAttribute("seed", String(Math.floor(Math.random() * 1000)))
        }, 90)
        return () => clearInterval(id)
    }, [grain, animateGrain, isCanvas])

    if (isCanvas) {
        return (
            <div
                data-crt-effect-auto-root="true"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    width: 220,
                    height: 110,
                    border: "1px dashed rgba(150,150,180,0.6)",
                    borderRadius: 8,
                    background: "rgba(60,60,90,0.15)",
                    color: "rgba(180,180,210,0.9)",
                    fontFamily: "monospace",
                    fontSize: 11,
                    textAlign: "center",
                    padding: 12,
                    boxSizing: "border-box",
                    ...style,
                }}
            >
                <span style={{ fontSize: 18 }}>▓▒░</span>
                <span>CRT Effect — Auto</span>
                <span style={{ opacity: 0.7 }}>page-wide, no connection needed</span>
            </div>
        )
    }

    return (
        <div data-crt-effect-auto-root="true" style={{ width: 0, height: 0, overflow: "visible", ...style }}>
            {scanlines && !reduceEffects && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: OVERLAY_Z_INDEX,
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
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: OVERLAY_Z_INDEX,
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
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: OVERLAY_Z_INDEX,
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
                    style={{
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: OVERLAY_Z_INDEX,
                        background: "#000",
                    }}
                    animate={{
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
                    }}
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
                        position: "fixed",
                        left: 0,
                        right: 0,
                        height: "16%",
                        pointerEvents: "none",
                        zIndex: OVERLAY_Z_INDEX,
                        background:
                            "linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.07) 55%, transparent)",
                    }}
                    animate={{ top: ["-20%", "120%"] }}
                    transition={{ duration: rollBarSpeed, repeat: Infinity, ease: "linear" }}
                />
            )}

            {tint && !reduceEffects && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: OVERLAY_Z_INDEX,
                        background: tintColor,
                        mixBlendMode: "color",
                        opacity: tintOpacity / 100,
                    }}
                />
            )}

            <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden="true">
                <defs>
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
                            width={Math.max(1, bodySize.width)}
                            height={Math.max(1, bodySize.height)}
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

addPropertyControls(CRTEffectAuto, {
    curvatureEnabled: {
        type: ControlType.Boolean,
        title: "Curvature",
        defaultValue: true,
        description:
            "⚠️ While on, this applies a filter to the whole page's document.body — which affects any position: fixed or position: sticky element elsewhere on the page (a custom cursor, a sticky nav, a fixed modal), and can visibly detach it from the viewport. Aberration below has the same effect on its own. Turn both off, or use CRTEffect instead (it only affects its own connected layer), if your page has fixed/sticky elements that need to keep working normally.",
    },
    curvature: {
        type: ControlType.Number,
        title: "Curvature Amount",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 30,
        hidden: (props: CRTEffectAutoProps) => !props.curvatureEnabled,
    },
    aberrationEnabled: {
        type: ControlType.Boolean,
        title: "Chromatic Aberration",
        defaultValue: true,
        description:
            "⚠️ Carries the same document.body filter side effect as Curvature above — see its description. Independent of Curvature: turning this off alone doesn't help if Curvature is still on, and vice versa.",
    },
    aberration: {
        type: ControlType.Number,
        title: "Aberration Amount",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 25,
        hidden: (props: CRTEffectAutoProps) => !props.aberrationEnabled,
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
        hidden: (props: CRTEffectAutoProps) => !props.scanlines,
    },
    scanlineSpacing: {
        type: ControlType.Number,
        title: "Scanline Spacing",
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 3,
        unit: "px",
        hidden: (props: CRTEffectAutoProps) => !props.scanlines,
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
        hidden: (props: CRTEffectAutoProps) => !props.vignette,
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
        hidden: (props: CRTEffectAutoProps) => !props.grain,
    },
    animateGrain: {
        type: ControlType.Boolean,
        title: "Animate Grain",
        defaultValue: true,
        hidden: (props: CRTEffectAutoProps) => !props.grain,
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
        hidden: (props: CRTEffectAutoProps) => !props.flicker,
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
        hidden: (props: CRTEffectAutoProps) => !props.rollBar,
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
        hidden: (props: CRTEffectAutoProps) => !props.tint,
    },
    tintOpacity: {
        type: ControlType.Number,
        title: "Tint Opacity",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 25,
        hidden: (props: CRTEffectAutoProps) => !props.tint,
    },
})
