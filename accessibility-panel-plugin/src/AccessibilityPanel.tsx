import * as React from "react"
import { useEffect, useId, useRef, useState } from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

type PanelPosition = "left" | "right"

interface AccessibilityPanelProps {
    position?: PanelPosition
    // Named panelWidth, not width — `width`/`height` are prop names
    // Framer's own runtime treats specially for every code component
    // (it manages layer sizing, Fixed/Fill/Fit, through them), and a
    // custom property control sharing that exact name collides with it.
    // Confirmed via DevTools on a real published site: the rendered
    // inline style showed `width: 100%` — Framer's own Fill-derived
    // value — instead of the configured Number control's value,
    // regardless of what this component's own code did with it.
    panelWidth?: number
    title?: string
    backgroundColor?: string
    textColor?: string
    accentColor?: string
    showReduceEffects?: boolean
    reduceEffectsLabel?: string
    showFontSize?: boolean
    fontSizeLabel?: string
    showHighContrast?: boolean
    highContrastLabel?: string
    fontScaleMin?: number
    fontScaleMax?: number
    fontScaleStep?: number
    customSwitchOn?: React.ReactNode
    customSwitchOff?: React.ReactNode
    style?: React.CSSProperties
}

// Same shared-state approach as AccessibilityToggleButton.tsx (duplicated
// rather than imported, so every file in this plugin stays a single
// paste-in component) — a window CustomEvent plus, for the three actual
// settings below, localStorage so they survive a page reload. Framer's
// own Variables feature would do the "assign a variable to a property"
// half of this natively, but not the "apply this globally to the whole
// page" half these three settings need (font zoom, a body-wide contrast
// filter, disabling effects in unrelated components) — that part still
// has to be real code regardless of how the value gets set.
const A11Y_PREFIX = "fr-a11y-"
const PANEL_OPEN_KEY = "panel-open"
const EFFECTS_ENABLED_KEY = "effects-enabled"
const FONT_SCALE_KEY = "font-scale"
const HIGH_CONTRAST_KEY = "high-contrast"

let panelOpenMemory = false

function setPanelOpen(value: boolean) {
    panelOpenMemory = value
    window.dispatchEvent(new CustomEvent(A11Y_PREFIX + PANEL_OPEN_KEY, { detail: value }))
}

function usePanelOpen(): boolean {
    const [open, setOpen] = useState(panelOpenMemory)
    useEffect(() => {
        setOpen(panelOpenMemory)
        const handler = (e: Event) => setOpen((e as CustomEvent<boolean>).detail)
        window.addEventListener(A11Y_PREFIX + PANEL_OPEN_KEY, handler)
        return () => window.removeEventListener(A11Y_PREFIX + PANEL_OPEN_KEY, handler)
    }, [])
    return open
}

function readPersisted<T>(key: string, fallback: T): T {
    try {
        const raw = window.localStorage.getItem(A11Y_PREFIX + key)
        return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
        return fallback
    }
}

function writePersisted<T>(key: string, value: T) {
    try {
        window.localStorage.setItem(A11Y_PREFIX + key, JSON.stringify(value))
    } catch {
        // localStorage can throw in private-browsing/storage-restricted
        // contexts — the setting still works for the current session via
        // the CustomEvent below, it just won't survive a reload.
    }
    window.dispatchEvent(new CustomEvent(A11Y_PREFIX + key, { detail: value }))
}

function usePersisted<T>(key: string, fallback: T): [T, (v: T) => void] {
    const [value, setValue] = useState<T>(fallback)
    useEffect(() => {
        setValue(readPersisted(key, fallback))
        const handler = (e: Event) => setValue((e as CustomEvent<T>).detail)
        window.addEventListener(A11Y_PREFIX + key, handler)
        return () => window.removeEventListener(A11Y_PREFIX + key, handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    const set = (v: T) => {
        setValue(v)
        writePersisted(key, v)
    }
    return [value, set]
}

function Switch({
    checked,
    onChange,
    accentColor,
    label,
}: {
    checked: boolean
    onChange: (v: boolean) => void
    accentColor: string
    label: string
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                border: "none",
                padding: 2,
                background: checked ? accentColor : "rgba(255,255,255,0.2)",
                cursor: "pointer",
                display: "flex",
                justifyContent: checked ? "flex-end" : "flex-start",
                flexShrink: 0,
            }}
        >
            <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                }}
            />
        </button>
    )
}

// Framer wraps a ComponentInstance-connector value in its own container
// div, sized according to whatever Fixed/Fill/Fit mode the connected
// layer had on the canvas — not by anything this component controls. If
// that layer was left on Fit (hug content) and the connected component's
// own root is itself width/height: 100% of its frame (typical for a
// component designed to fill whatever frame holds it), the two collapse
// to 0x0: Fit says "size me to my content," content says "size me to
// 100% of my (contentless) parent." Confirmed via DevTools on a real
// published site — the generated wrapper measured 0 x 0.
//
// The real fix is on the canvas (set those two connected Switch
// instances to a Fixed pixel size instead of Fit). This only rescues the
// broken case, and leaves an already-correctly-sized connection
// completely alone: an earlier version unconditionally forced every
// connected node's direct child to width/height: 100% via an injected
// `!important` rule, which did fix the collapse but also overrode a
// Switch that was already sized exactly the way it was designed —
// confirmed on a real published site (the switch's own styling and
// proportions were no longer respected, and the header button ignored
// its connected component's actual size too). Instead, this measures
// the slot's real rendered box after mount via ResizeObserver, and only
// injects the forcing rule if that measurement is genuinely near zero —
// the actual collapse this exists for. A correctly Fixed-sized
// connection is measured once, found fine, and never touched.
function ConnectedSlot({ node, fallbackWidth, fallbackHeight }: { node: React.ReactNode; fallbackWidth: number; fallbackHeight: number }) {
    const slotId = useId().replace(/[:]/g, "")
    const ref = useRef<HTMLSpanElement>(null)
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const check = () => {
            const rect = el.getBoundingClientRect()
            // A genuinely collapsed connection rarely measures exactly 0 —
            // the connected component's own border/padding (added outside
            // a percentage-based content width) still contributes a few
            // px on top of a 0-width content box. 10px is comfortably
            // below any real switch's actual size, so this only catches
            // the true collapse case, never a small-but-real design.
            setCollapsed(rect.width < 10 || rect.height < 10)
        }
        check()
        const observer = new ResizeObserver(check)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <>
            {collapsed && (
                <style>{`
                    [data-a11y-slot="${slotId}"] { display: inline-flex; width: ${fallbackWidth}px; height: ${fallbackHeight}px; flex-shrink: 0; }
                    [data-a11y-slot="${slotId}"] > * { width: 100% !important; height: 100% !important; box-sizing: border-box !important; }
                `}</style>
            )}
            <span ref={ref} data-a11y-slot={slotId}>
                {node}
            </span>
        </>
    )
}

// Two static connectors — one already set to the Switch's "on" look, one
// to its "off" look — rather than one instance driven by a prop. A
// component built purely from Framer variants (no code, no custom
// Properties for incoming state) has no way to accept a boolean from
// outside; the only thing it exposes is Events (outgoing), which is the
// wrong direction for this. Two fixed instances sidesteps that entirely:
// nothing about the connected component needs to be controllable, we
// just choose which of the two to display, wrapped in a plain button
// that handles the actual click ourselves. Falls back to the built-in
// Switch above when either connector is left empty.
function renderSwitch({
    checked,
    onChange,
    accentColor,
    label,
    customSwitchOn,
    customSwitchOff,
}: {
    checked: boolean
    onChange: (v: boolean) => void
    accentColor: string
    label: string
    customSwitchOn?: React.ReactNode
    customSwitchOff?: React.ReactNode
}) {
    if (customSwitchOn && customSwitchOff) {
        return (
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "inline-flex", flexShrink: 0 }}
            >
                <ConnectedSlot node={checked ? customSwitchOn : customSwitchOff} fallbackWidth={44} fallbackHeight={26} />
            </button>
        )
    }
    return <Switch checked={checked} onChange={onChange} accentColor={accentColor} label={label} />
}

/**
 * AccessibilityPanel — a slide-in drawer with three settings: Reduce
 * Effects (disables CRTEffect/CRTEffectAuto/GlitchEffect site-wide, via
 * the same shared-state pattern those components read from),
 * a Font Size stepper (applies `zoom` to the page so it works regardless
 * of whether the page's own text uses px or rem), and High Contrast
 * (a body-wide CSS filter). Opens/closes via the shared panelOpen flag
 * that AccessibilityToggleButton.tsx writes to — drop that anywhere
 * (typically inside your header) and this anywhere else; their only
 * connection is that shared flag, not the layer tree.
 */
export default function AccessibilityPanel(props: AccessibilityPanelProps) {
    const {
        position = "right",
        panelWidth = 320,
        title = "Accessibility",
        backgroundColor = "#15132a",
        textColor = "#ffffff",
        accentColor = "#7c5cff",
        showReduceEffects = true,
        reduceEffectsLabel = "Reduce Effects",
        showFontSize = true,
        fontSizeLabel = "Font Size",
        showHighContrast = true,
        highContrastLabel = "High Contrast",
        fontScaleMin = 0.8,
        fontScaleMax = 1.6,
        fontScaleStep = 0.1,
        customSwitchOn,
        customSwitchOff,
        style,
    } = props

    // Visible while designing regardless of the real (session-only) open
    // state, so the panel can actually be styled on canvas — Framer's
    // canvas doesn't correspond to one live page, so there's no
    // meaningful "closed" state to preview there anyway.
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const livePanelOpen = usePanelOpen()
    const open = isCanvas || livePanelOpen

    const [effectsEnabled, setEffectsEnabled] = usePersisted(EFFECTS_ENABLED_KEY, true)
    const [fontScale, setFontScale] = usePersisted(FONT_SCALE_KEY, 1)
    const [highContrast, setHighContrast] = usePersisted(HIGH_CONTRAST_KEY, false)

    // Page-wide side effects. Skipped on canvas — canvas isn't a single
    // live page, so there's nothing sensible to apply there, and doing it
    // anyway would distort the editing surface itself.
    //
    // Font Size used to set `zoom` on document.documentElement. Confirmed
    // in real use to throw off a page's own custom cursor (a fixed-
    // position element tracking the pointer) — `zoom` rescales the whole
    // page's rendering, including how fixed-position coordinates map to
    // actual screen pixels, which a cursor script positioning itself from
    // raw mousemove clientX/clientY has no way to account for. Switched
    // to scaling the root `font-size` instead: this only affects
    // rem/em-sized text, not the whole page's layout or coordinate
    // system, so it can't touch fixed-position elements at all. The
    // tradeoff (documented in the README) is real: most text authored
    // directly in Framer's canvas is set in px, which this can't reach —
    // effective reach depends on how the page's own type is sized, unlike
    // `zoom` which affected everything unconditionally (at the cost of
    // being unsafe to use alongside a custom cursor).
    useEffect(() => {
        if (isCanvas) return
        const previous = document.documentElement.style.fontSize
        document.documentElement.style.fontSize = fontScale === 1 ? "" : `${fontScale * 100}%`
        return () => {
            document.documentElement.style.fontSize = previous
        }
    }, [isCanvas, fontScale])

    // High Contrast used to set `filter` directly on document.body — the
    // same containing-block trap documented (and fixed) for
    // CRTEffectAuto: it makes body the containing block for any
    // position:fixed/sticky descendant elsewhere on the page, which is
    // exactly what broke a real custom cursor in testing. Fixed the same
    // way that class of bug gets fixed in general: don't put the filter
    // on a real ancestor at all. Rendered below as a `position: fixed`
    // overlay `div` with no children of its own, using `backdrop-filter`
    // instead of `filter` — backdrop-filter reads the pixels *behind* the
    // element without making that element an ancestor (let alone a
    // containing-block-changing one) of anything else on the page, since
    // it has nothing rendered inside it to be an ancestor of.

    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const previouslyFocusedRef = useRef<HTMLElement | null>(null)
    useEffect(() => {
        if (isCanvas) return
        if (open) {
            previouslyFocusedRef.current = document.activeElement as HTMLElement
            closeButtonRef.current?.focus()
        } else {
            previouslyFocusedRef.current?.focus()
        }
    }, [isCanvas, open])

    useEffect(() => {
        if (isCanvas || !open) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPanelOpen(false)
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isCanvas, open])

    const rowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
    }

    // Whichever row ends up actually last (any combination of the three
    // can be hidden via Show Reduce Effects/Font Size/High Contrast)
    // shouldn't have a bottom border — hardcoding that onto High Contrast
    // specifically only worked back when it was unconditionally the last
    // row rendered.
    const lastVisibleRow = showHighContrast
        ? "highContrast"
        : showFontSize
          ? "fontSize"
          : showReduceEffects
            ? "reduceEffects"
            : null

    return (
        <>
            {!isCanvas && highContrast && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: 2147483400,
                        backdropFilter: "contrast(1.35) saturate(0.9)",
                        WebkitBackdropFilter: "contrast(1.35) saturate(0.9)",
                    }}
                />
            )}
            {!isCanvas && open && (
                <div
                    aria-hidden="true"
                    onClick={() => setPanelOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        zIndex: 2147483500,
                    }}
                />
            )}
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                data-accessibility-panel-root="true"
                style={{
                    // `...style` first, not last: Framer injects this with
                    // whatever size/position the layer's own frame has on
                    // the canvas, which is meaningless for this component
                    // (it's a fixed-position drawer, not a box someone
                    // should resize to mean something — same as
                    // CRTEffectAuto's approach to its own frame). Letting
                    // that win over Width, or over the fixed-drawer layout
                    // entirely, was a real bug: a frame dragged to fill
                    // the page silently overrode the Width control,
                    // stretching the panel edge-to-edge and shoving its
                    // switches off past the visible edge.
                    ...style,
                    position: isCanvas ? "relative" : "fixed",
                    top: 0,
                    bottom: 0,
                    [position]: 0,
                    width: panelWidth,
                    maxWidth: "90vw",
                    background: backgroundColor,
                    color: textColor,
                    fontFamily: "-apple-system, sans-serif",
                    padding: 24,
                    boxSizing: "border-box",
                    overflowY: "auto",
                    zIndex: 2147483600,
                }}
                initial={false}
                animate={
                    isCanvas
                        ? { x: 0 }
                        : { x: open ? 0 : position === "right" ? "100%" : "-100%" }
                }
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{title}</span>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        aria-label="Close"
                        onClick={() => setPanelOpen(false)}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: "none",
                            background: "rgba(255,255,255,0.1)",
                            color: textColor,
                            fontSize: 16,
                            cursor: "pointer",
                        }}
                    >
                        ✕
                    </button>
                </div>

                {showReduceEffects && (
                    <div style={lastVisibleRow === "reduceEffects" ? { ...rowStyle, borderBottom: "none" } : rowStyle}>
                        <span>{reduceEffectsLabel}</span>
                        {renderSwitch({
                            checked: !effectsEnabled,
                            onChange: (reduced) => setEffectsEnabled(!reduced),
                            accentColor,
                            label: reduceEffectsLabel,
                            customSwitchOn,
                            customSwitchOff,
                        })}
                    </div>
                )}

                {showFontSize && (
                <div
                    style={{
                        ...rowStyle,
                        flexDirection: "column",
                        alignItems: "stretch",
                        gap: 10,
                        ...(lastVisibleRow === "fontSize" ? { borderBottom: "none" } : null),
                    }}
                >
                    <span>{fontSizeLabel}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                            type="button"
                            aria-label="Decrease font size"
                            onClick={() => setFontScale(Math.max(fontScaleMin, Math.round((fontScale - fontScaleStep) * 100) / 100))}
                            disabled={fontScale <= fontScaleMin}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                border: "none",
                                background: "rgba(255,255,255,0.1)",
                                color: textColor,
                                fontSize: 16,
                                cursor: fontScale <= fontScaleMin ? "default" : "pointer",
                                opacity: fontScale <= fontScaleMin ? 0.4 : 1,
                            }}
                        >
                            −
                        </button>
                        <span style={{ minWidth: 44, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                            {Math.round(fontScale * 100)}%
                        </span>
                        <button
                            type="button"
                            aria-label="Increase font size"
                            onClick={() => setFontScale(Math.min(fontScaleMax, Math.round((fontScale + fontScaleStep) * 100) / 100))}
                            disabled={fontScale >= fontScaleMax}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                border: "none",
                                background: "rgba(255,255,255,0.1)",
                                color: textColor,
                                fontSize: 16,
                                cursor: fontScale >= fontScaleMax ? "default" : "pointer",
                                opacity: fontScale >= fontScaleMax ? 0.4 : 1,
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>
                )}

                {showHighContrast && (
                <div style={lastVisibleRow === "highContrast" ? { ...rowStyle, borderBottom: "none" } : rowStyle}>
                    <span>{highContrastLabel}</span>
                    {renderSwitch({
                        checked: highContrast,
                        onChange: setHighContrast,
                        accentColor,
                        label: highContrastLabel,
                        customSwitchOn,
                        customSwitchOff,
                    })}
                </div>
                )}
            </motion.div>
        </>
    )
}

addPropertyControls(AccessibilityPanel, {
    customSwitchOn: {
        type: ControlType.ComponentInstance,
        title: "Custom Switch (On)",
    },
    customSwitchOff: {
        type: ControlType.ComponentInstance,
        title: "Custom Switch (Off)",
    },
    position: {
        type: ControlType.Enum,
        title: "Position",
        options: ["left", "right"],
        optionTitles: ["Left", "Right"],
        displaySegmentedControl: true,
        defaultValue: "right",
    },
    panelWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 240,
        max: 480,
        step: 1,
        defaultValue: 320,
        unit: "px",
    },
    title: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "Accessibility",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#15132a",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "#ffffff",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent Color",
        defaultValue: "#7c5cff",
    },
    showReduceEffects: {
        type: ControlType.Boolean,
        title: "Show Reduce Effects",
        defaultValue: true,
    },
    reduceEffectsLabel: {
        type: ControlType.String,
        title: "Reduce Effects Label",
        defaultValue: "Reduce Effects",
        hidden: (props: AccessibilityPanelProps) => props.showReduceEffects === false,
    },
    showFontSize: {
        type: ControlType.Boolean,
        title: "Show Font Size",
        defaultValue: true,
    },
    fontSizeLabel: {
        type: ControlType.String,
        title: "Font Size Label",
        defaultValue: "Font Size",
        hidden: (props: AccessibilityPanelProps) => props.showFontSize === false,
    },
    fontScaleMin: {
        type: ControlType.Number,
        title: "Font Scale Min",
        min: 0.5,
        max: 1,
        step: 0.05,
        defaultValue: 0.8,
        hidden: (props: AccessibilityPanelProps) => props.showFontSize === false,
    },
    fontScaleMax: {
        type: ControlType.Number,
        title: "Font Scale Max",
        min: 1,
        max: 3,
        step: 0.05,
        defaultValue: 1.6,
        hidden: (props: AccessibilityPanelProps) => props.showFontSize === false,
    },
    fontScaleStep: {
        type: ControlType.Number,
        title: "Font Scale Step",
        min: 0.05,
        max: 0.5,
        step: 0.05,
        defaultValue: 0.1,
        hidden: (props: AccessibilityPanelProps) => props.showFontSize === false,
    },
    showHighContrast: {
        type: ControlType.Boolean,
        title: "Show High Contrast",
        defaultValue: true,
    },
    highContrastLabel: {
        type: ControlType.String,
        title: "High Contrast Label",
        defaultValue: "High Contrast",
        hidden: (props: AccessibilityPanelProps) => props.showHighContrast === false,
    },
})
