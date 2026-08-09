import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

type PanelPosition = "left" | "right"

interface AccessibilityPanelProps {
    position?: PanelPosition
    width?: number
    title?: string
    backgroundColor?: string
    textColor?: string
    accentColor?: string
    reduceEffectsLabel?: string
    fontSizeLabel?: string
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
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "inline-flex" }}
            >
                {checked ? customSwitchOn : customSwitchOff}
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
        width = 320,
        title = "Accessibility",
        backgroundColor = "#15132a",
        textColor = "#ffffff",
        accentColor = "#7c5cff",
        reduceEffectsLabel = "Reduce Effects",
        fontSizeLabel = "Font Size",
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
    // live page, so there's nothing sensible to zoom/filter there, and
    // doing it anyway would distort the editing surface itself.
    useEffect(() => {
        if (isCanvas) return
        const previous = document.documentElement.style.zoom
        document.documentElement.style.zoom = fontScale === 1 ? "" : String(fontScale)
        return () => {
            document.documentElement.style.zoom = previous
        }
    }, [isCanvas, fontScale])

    useEffect(() => {
        if (isCanvas) return
        if (!highContrast) return
        const previous = document.body.style.filter
        document.body.style.filter = "contrast(1.35) saturate(0.9)"
        return () => {
            document.body.style.filter = previous
        }
    }, [isCanvas, highContrast])

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

    return (
        <>
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
                    position: isCanvas ? "relative" : "fixed",
                    top: 0,
                    bottom: 0,
                    [position]: 0,
                    width,
                    maxWidth: "90vw",
                    background: backgroundColor,
                    color: textColor,
                    fontFamily: "-apple-system, sans-serif",
                    padding: 24,
                    boxSizing: "border-box",
                    overflowY: "auto",
                    zIndex: 2147483600,
                    ...style,
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

                <div style={rowStyle}>
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

                <div style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: 10 }}>
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

                <div style={{ ...rowStyle, borderBottom: "none" }}>
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
    width: {
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
    reduceEffectsLabel: {
        type: ControlType.String,
        title: "Reduce Effects Label",
        defaultValue: "Reduce Effects",
    },
    fontSizeLabel: {
        type: ControlType.String,
        title: "Font Size Label",
        defaultValue: "Font Size",
    },
    highContrastLabel: {
        type: ControlType.String,
        title: "High Contrast Label",
        defaultValue: "High Contrast",
    },
    fontScaleMin: {
        type: ControlType.Number,
        title: "Font Scale Min",
        min: 0.5,
        max: 1,
        step: 0.05,
        defaultValue: 0.8,
    },
    fontScaleMax: {
        type: ControlType.Number,
        title: "Font Scale Max",
        min: 1,
        max: 3,
        step: 0.05,
        defaultValue: 1.6,
    },
    fontScaleStep: {
        type: ControlType.Number,
        title: "Font Scale Step",
        min: 0.05,
        max: 0.5,
        step: 0.05,
        defaultValue: 0.1,
    },
})
