import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView, type Easing } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

type Direction = "horizontal" | "vertical"
type Trigger = "hover" | "scroll" | "auto" | "load"
type EasingPreset = "smooth" | "snappy" | "elastic" | "linear"
type ContentType = "text" | "image"

interface FontControl {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number
    letterSpacing?: number | string
    lineHeight?: number | string
}

interface ImageValue {
    src?: string
    alt?: string
    pixelWidth?: number
    pixelHeight?: number
}

interface SlicedTextProps {
    contentType: ContentType
    text?: string
    font?: FontControl
    color?: string
    image?: ImageValue
    direction: Direction
    sliceCount: number
    trigger: Trigger
    intensity: number
    duration: number
    stagger: number
    easing: EasingPreset
    rgbSplit: boolean
    rgbSplitColorA?: string
    rgbSplitColorB?: string
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
        contentType = "text",
        text = "SLICED TEXT",
        font = { fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 64 },
        color = "#111111",
        image,
        direction = "horizontal",
        sliceCount = 8,
        trigger = "scroll",
        intensity = 40,
        duration = 0.6,
        stagger = 0.02,
        easing = "smooth",
        rgbSplit = true,
        rgbSplitColorA = "#00e5ff",
        rgbSplitColorB = "#ff2d55",
        replay = true,
        style,
    } = props

    // Framer's design canvas renders overflow content unclipped (so it's
    // visible/selectable while editing) and doesn't dispatch real hover
    // events to code components — both would make an in-progress distortion
    // look broken while just placing/arranging the layer. Freeze to a clean
    // resting state on canvas; the trigger only drives real interaction in
    // Preview and on the published site.
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

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
        if (isCanvas) return
        if (trigger === "load" && !hasPlayedRef.current) {
            hasPlayedRef.current = true
            pulse()
        }
        return () => {
            if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger, isCanvas])

    useEffect(() => {
        if (isCanvas || trigger !== "scroll") return
        if (inView) {
            pulse()
        } else if (replay) {
            setPhase("rest")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, trigger, replay, isCanvas])

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

    // Each slice is the same full-size text, stacked exactly on top of the
    // others and windowed into view with clip-path — one clip boundary per
    // seam, rather than two independently-positioned overflow:hidden boxes
    // whose edges can round to different device pixels and leave a gap.
    // Each boundary is also bled by a fraction of a pixel via calc(), so if
    // the browser does round the two neighboring slices' edges differently,
    // they overlap instead of gapping. The overlap repaints a sliver of
    // identical pixels, which is invisible.
    const BLEED = 0.75

    function clipPathFor(index: number): string {
        const top = index * bandPct
        const bottom = 100 - (index + 1) * bandPct
        return direction === "horizontal"
            ? `inset(calc(${top}% - ${BLEED}px) 0% calc(${bottom}% - ${BLEED}px) 0%)`
            : `inset(0% calc(${bottom}% - ${BLEED}px) 0% calc(${top}% - ${BLEED}px))`
    }

    // Text ghost layers are recolored (a solid glyph fill tints cleanly);
    // an image has no single fill to recolor, so its ghost layers stay the
    // original photo, offset and blended with "difference" instead — two
    // near-identical copies offset by a few pixels naturally produce
    // colorful fringing at contrast edges without faking channel colors.
    const ghostBlend: React.CSSProperties["mixBlendMode"] = contentType === "image" ? "difference" : "screen"

    function renderContent(tint?: { color: string; blend: React.CSSProperties["mixBlendMode"] }) {
        if (contentType === "image") {
            return (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: image?.src ? `url("${image.src}")` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: image?.src ? undefined : "#8884",
                        mixBlendMode: tint?.blend,
                    }}
                />
            )
        }
        return (
            <span style={{ ...baseFontStyle, color: tint?.color ?? color, mixBlendMode: tint?.blend }}>{text}</span>
        )
    }

    function renderSlices(tint?: { color: string; blend: React.CSSProperties["mixBlendMode"] }, xBias = 0) {
        const slices = perSlice.map((slice, i) => {
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

            const sliceStyle: React.CSSProperties = {
                position: "absolute",
                inset: 0,
                clipPath: clipPathFor(i),
                WebkitClipPath: clipPathFor(i),
                willChange: "transform",
            }

            const contentNode = renderContent(tint)

            if (trigger === "auto" && !isCanvas) {
                return (
                    <motion.div
                        key={i}
                        style={sliceStyle}
                        animate={autoKeyframes}
                        transition={{
                            duration: duration * 2,
                            delay: i * stagger + slice.delayJitter * 0.2,
                            ease: easeCurve,
                            repeat: Infinity,
                            repeatType: "loop",
                        }}
                    >
                        {contentNode}
                    </motion.div>
                )
            }

            return (
                <motion.div
                    key={i}
                    style={sliceStyle}
                    initial={restState}
                    animate={phase === "distort" ? distortState : restState}
                    transition={sliceTransition}
                >
                    {contentNode}
                </motion.div>
            )
        })

        return (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
                {slices}
            </div>
        )
    }

    const isImage = contentType === "image"

    return (
        <div
            ref={containerRef}
            data-sliced-text-root="true"
            onMouseEnter={trigger === "hover" && !isCanvas ? () => setPhase("distort") : undefined}
            onMouseLeave={trigger === "hover" && !isCanvas ? () => setPhase("rest") : undefined}
            role={isImage ? "img" : undefined}
            aria-label={isImage ? image?.alt || "Sliced image" : undefined}
            style={{
                position: "relative",
                display: isImage ? "block" : "inline-block",
                width: isImage ? (image?.pixelWidth ?? 300) : undefined,
                height: isImage ? (image?.pixelHeight ?? 200) : undefined,
                ...style,
            }}
        >
            {!isImage && (
                <>
                    {/* Sizer: invisible, in normal flow, defines the box the slices fill. */}
                    <span aria-hidden="true" style={{ ...fontStyle, visibility: "hidden" }}>
                        {text}
                    </span>

                    {/* Screen-reader accessible copy of the real text. */}
                    <span style={srOnlyStyle}>{text}</span>
                </>
            )}

            {rgbSplit && renderSlices({ color: rgbSplitColorA, blend: ghostBlend }, -intensity * 0.18)}
            {rgbSplit && renderSlices({ color: rgbSplitColorB, blend: ghostBlend }, intensity * 0.18)}
            {renderSlices()}
        </div>
    )
}

addPropertyControls(SlicedText, {
    contentType: {
        type: ControlType.Enum,
        title: "Content",
        options: ["text", "image"],
        optionTitles: ["Text", "Image"],
        displaySegmentedControl: true,
        defaultValue: "text",
    },
    text: {
        type: ControlType.String,
        title: "Text",
        defaultValue: "SLICED TEXT",
        displayTextArea: true,
        hidden: (props: SlicedTextProps) => props.contentType !== "text",
    },
    font: {
        type: ControlType.Font,
        title: "Typography",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 64,
        },
        hidden: (props: SlicedTextProps) => props.contentType !== "text",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#111111",
        hidden: (props: SlicedTextProps) => props.contentType !== "text",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        hidden: (props: SlicedTextProps) => props.contentType !== "image",
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
    rgbSplitColorA: {
        type: ControlType.Color,
        title: "Split Color 1",
        defaultValue: "#00e5ff",
        hidden: (props: SlicedTextProps) => !props.rgbSplit || props.contentType === "image",
    },
    rgbSplitColorB: {
        type: ControlType.Color,
        title: "Split Color 2",
        defaultValue: "#ff2d55",
        hidden: (props: SlicedTextProps) => !props.rgbSplit || props.contentType === "image",
    },
    replay: {
        type: ControlType.Boolean,
        title: "Replay on Re-enter",
        defaultValue: true,
        hidden: (props: SlicedTextProps) => props.trigger !== "scroll",
    },
})
