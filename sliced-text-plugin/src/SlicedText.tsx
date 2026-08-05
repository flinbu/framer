import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView, type Easing } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

type Direction = "horizontal" | "vertical"
type Trigger = "hover" | "scroll" | "auto" | "load"
type EasingPreset = "smooth" | "snappy" | "elastic" | "linear"

interface FontControl {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number
    letterSpacing?: number | string
    lineHeight?: number | string
}

interface SlicedTextProps {
    text: string
    font: FontControl
    color: string
    direction: Direction
    sliceCount: number
    trigger: Trigger
    intensity: number
    duration: number
    stagger: number
    easing: EasingPreset
    rgbSplit: boolean
    replay: boolean
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
 * SlicedText — a text layer that cuts its content into strips and, on a
 * configurable trigger, kicks each strip out of alignment with a slight
 * skew jitter so the type reads as torn apart and reassembled.
 */
export default function SlicedText(props: SlicedTextProps) {
    const {
        text = "SLICED TEXT",
        font = { fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 64 },
        color = "#111111",
        direction = "horizontal",
        sliceCount = 8,
        trigger = "scroll",
        intensity = 40,
        duration = 0.6,
        stagger = 0.02,
        easing = "smooth",
        rgbSplit = true,
        replay = true,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [phase, setPhase] = useState<"rest" | "distort">("rest")
    const hasPlayedRef = useRef(false)
    const settleTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

    const inView = useInView(containerRef, {
        amount: 0.4,
        once: trigger === "scroll" && !replay,
    })

    const clampedSliceCount = Math.max(2, Math.round(sliceCount))
    const easeCurve = EASINGS[easing] ?? EASINGS.smooth

    const pulse = () => {
        if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current)
        setPhase("distort")
        settleTimeoutRef.current = setTimeout(
            () => setPhase("rest"),
            (duration + clampedSliceCount * stagger) * 1000
        )
    }

    useEffect(() => {
        if (trigger === "load" && !hasPlayedRef.current) {
            hasPlayedRef.current = true
            pulse()
        }
        return () => {
            if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger])

    useEffect(() => {
        if (trigger !== "scroll") return
        if (inView) {
            pulse()
        } else if (replay) {
            setPhase("rest")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, trigger, replay])

    const perSlice = useMemo(() => {
        return Array.from({ length: clampedSliceCount }, (_, i) => {
            const seed = i + 1
            return {
                offsetMain: signedRandom(seed * 1.37) * intensity,
                offsetCross: signedRandom(seed * 2.71 + 0.5) * intensity * 0.35,
                skew: signedRandom(seed * 3.14 + 1.1) * intensity * 0.12,
                delayJitter: seededRandom(seed * 5.02) * 0.5,
            }
        })
    }, [clampedSliceCount, intensity])

    const baseFontStyle: React.CSSProperties = {
        fontFamily: font?.fontFamily,
        fontWeight: font?.fontWeight,
        fontStyle: font?.fontStyle,
        fontSize: font?.fontSize ?? 64,
        letterSpacing: font?.letterSpacing,
        lineHeight: font?.lineHeight ?? 1.1,
        whiteSpace: "pre",
        margin: 0,
        display: "block",
    }

    const fontStyle: React.CSSProperties = { ...baseFontStyle, color }

    const bandPct = 100 / clampedSliceCount

    function renderSlices(tint?: { color: string; blend: React.CSSProperties["mixBlendMode"] }, xBias = 0) {
        return perSlice.map((slice, i) => {
            const mainOffset = slice.offsetMain + xBias
            const restState =
                direction === "horizontal"
                    ? { x: xBias, y: 0, skewX: 0 }
                    : { x: 0, y: xBias, skewY: 0 }
            const distortState =
                direction === "horizontal"
                    ? { x: mainOffset, y: slice.offsetCross, skewX: slice.skew }
                    : { x: slice.offsetCross, y: mainOffset, skewY: slice.skew }

            const autoKeyframes =
                direction === "horizontal"
                    ? { x: [xBias, mainOffset, xBias], y: [0, slice.offsetCross, 0], skewX: [0, slice.skew, 0] }
                    : { x: [0, slice.offsetCross, 0], y: [xBias, mainOffset, xBias], skewY: [0, slice.skew, 0] }

            const sliceTransition = {
                duration,
                delay: i * stagger,
                ease: easeCurve,
            }

            // The "window" is a fixed-size, overflow-hidden band pinned to
            // this slice's strip of the container. It never grows past that
            // band no matter what CSS the host environment merges in, so
            // the slice can never show more than its own strip of text.
            const windowStyle: React.CSSProperties =
                direction === "horizontal"
                    ? {
                          position: "absolute",
                          top: `${i * bandPct}%`,
                          left: 0,
                          right: 0,
                          height: `${bandPct}%`,
                          overflow: "hidden",
                          willChange: "transform",
                          pointerEvents: "none",
                      }
                    : {
                          position: "absolute",
                          left: `${i * bandPct}%`,
                          top: 0,
                          bottom: 0,
                          width: `${bandPct}%`,
                          overflow: "hidden",
                          willChange: "transform",
                          pointerEvents: "none",
                      }

            // Inside the window, the full text is rendered at full size and
            // shifted back by this slice's index so only its own band lands
            // inside the window's viewport — a mask by geometry, not by
            // clip-path, so there's no cross-environment masking quirk to
            // depend on.
            const contentStyle: React.CSSProperties =
                direction === "horizontal"
                    ? {
                          position: "absolute",
                          top: `${-i * 100}%`,
                          left: 0,
                          right: 0,
                          height: `${clampedSliceCount * 100}%`,
                      }
                    : {
                          position: "absolute",
                          left: `${-i * 100}%`,
                          top: 0,
                          bottom: 0,
                          width: `${clampedSliceCount * 100}%`,
                      }

            const content = (
                <div style={contentStyle}>
                    <span style={{ ...baseFontStyle, color: tint?.color ?? color, mixBlendMode: tint?.blend }}>
                        {text}
                    </span>
                </div>
            )

            if (trigger === "auto") {
                return (
                    <motion.div
                        key={i}
                        aria-hidden="true"
                        style={windowStyle}
                        animate={autoKeyframes}
                        transition={{
                            duration: duration * 2,
                            delay: i * stagger + slice.delayJitter * 0.2,
                            ease: easeCurve,
                            repeat: Infinity,
                            repeatType: "loop",
                        }}
                    >
                        {content}
                    </motion.div>
                )
            }

            return (
                <motion.div
                    key={i}
                    aria-hidden="true"
                    style={windowStyle}
                    initial={restState}
                    animate={phase === "distort" ? distortState : restState}
                    transition={sliceTransition}
                >
                    {content}
                </motion.div>
            )
        })
    }

    return (
        <div
            ref={containerRef}
            data-sliced-text-root="true"
            onMouseEnter={trigger === "hover" ? () => setPhase("distort") : undefined}
            onMouseLeave={trigger === "hover" ? () => setPhase("rest") : undefined}
            style={{
                position: "relative",
                display: "inline-block",
                ...style,
            }}
        >
            {/* Sizer: invisible, in normal flow, defines the box the slices fill. */}
            <span aria-hidden="true" style={{ ...fontStyle, visibility: "hidden" }}>
                {text}
            </span>

            {/* Screen-reader accessible copy of the real text. */}
            <span style={srOnlyStyle}>{text}</span>

            {rgbSplit && renderSlices({ color: "#00e5ff", blend: "screen" }, -intensity * 0.18)}
            {rgbSplit && renderSlices({ color: "#ff2d55", blend: "screen" }, intensity * 0.18)}
            {renderSlices()}
        </div>
    )
}

addPropertyControls(SlicedText, {
    text: {
        type: ControlType.String,
        title: "Text",
        defaultValue: "SLICED TEXT",
        displayTextArea: true,
    },
    font: {
        type: ControlType.Font,
        title: "Typography",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 64,
        },
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#111111",
    },
    direction: {
        type: ControlType.Enum,
        title: "Slice Direction",
        options: ["horizontal", "vertical"],
        optionTitles: ["Horizontal", "Vertical"],
        displaySegmentedControl: true,
        defaultValue: "horizontal",
    },
    sliceCount: {
        type: ControlType.Number,
        title: "Slices",
        min: 2,
        max: 24,
        step: 1,
        defaultValue: 8,
    },
    trigger: {
        type: ControlType.Enum,
        title: "Trigger",
        options: ["hover", "scroll", "auto", "load"],
        optionTitles: ["Hover", "Scroll Into View", "Auto Loop", "On Load"],
        defaultValue: "scroll",
    },
    intensity: {
        type: ControlType.Number,
        title: "Distortion",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 40,
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 3,
        step: 0.05,
        defaultValue: 0.6,
        unit: "s",
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        min: 0,
        max: 0.2,
        step: 0.005,
        defaultValue: 0.02,
        unit: "s",
    },
    easing: {
        type: ControlType.Enum,
        title: "Easing",
        options: ["smooth", "snappy", "elastic", "linear"],
        optionTitles: ["Smooth", "Snappy", "Elastic", "Linear"],
        defaultValue: "smooth",
    },
    rgbSplit: {
        type: ControlType.Boolean,
        title: "Chromatic Split",
        defaultValue: true,
    },
    replay: {
        type: ControlType.Boolean,
        title: "Replay on Re-enter",
        defaultValue: true,
        hidden: (props: SlicedTextProps) => props.trigger !== "scroll",
    },
})
