import * as React from "react"
import { useEffect, useId, useRef, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

interface AccessibilityToggleButtonProps {
    icon?: string
    ariaLabel?: string
    size?: number
    background?: string
    color?: string
    customButton?: React.ReactNode
    style?: React.CSSProperties
}

// Same key prefix and "no Framer Variables needed" approach used
// throughout this plugin — a plain window CustomEvent plus (for the
// persisted settings, not this one) localStorage. panelOpen specifically
// is NOT persisted: it's meant to reset closed on every page load rather
// than reopen automatically, so it only lives in this module-level
// variable + the event, never localStorage.
const A11Y_PREFIX = "fr-a11y-"
const PANEL_OPEN_KEY = "panel-open"
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

// Framer wraps a ComponentInstance-connector value in its own container,
// sized by whatever Fixed/Fill/Fit mode the connected layer had on the
// canvas. If that layer was left on Fit (hug content) and the connected
// component's own root is width/height: 100% of its frame, the two
// collapse to 0x0 — same failure mode, and same fix, documented in
// AccessibilityPanel.tsx for Custom Switch. Only rescues the genuinely
// broken case: an earlier version unconditionally forced every connected
// node to a fixed size, which also overrode a button that was already
// sized correctly (confirmed on a real published site — the header
// button stopped respecting its connected component's actual size).
//
// Measured once, decided once — a version in between kept a
// ResizeObserver watching this same span after deciding, which meant our
// own rescue rule (forcing its size once collapsed = true) triggered the
// observer again, which measured the now-larger box, decided it wasn't
// collapsed anymore, removed the rule, watched it shrink back, decided
// it collapsed again... an unbounded flip-flop, confirmed on a real
// published site as a flickering, doubled-looking button. A plain
// one-time check right after mount has no such feedback path: it never
// watches its own fix's effect on layout.
function ConnectedSlot({ node, size }: { node: React.ReactNode; size: number }) {
    const slotId = useId().replace(/[:]/g, "")
    const ref = useRef<HTMLSpanElement>(null)
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        // A genuinely collapsed connection rarely measures exactly 0 —
        // the connected component's own border/padding (added outside
        // a percentage-based content width) still contributes a few
        // px on top of a 0-width content box. 10px is comfortably
        // below any real button's actual size, so this only catches
        // the true collapse case, never a small-but-real design.
        if (rect.width < 10 || rect.height < 10) setCollapsed(true)
    }, [])

    return (
        <>
            {collapsed && (
                <style>{`
                    [data-a11y-slot="${slotId}"] { display: inline-flex; width: ${size}px; height: ${size}px; }
                    [data-a11y-slot="${slotId}"] > * { width: 100% !important; height: 100% !important; box-sizing: border-box !important; }
                `}</style>
            )}
            <span ref={ref} data-a11y-slot={slotId}>
                {node}
            </span>
        </>
    )
}

/**
 * AccessibilityToggleButton — drop this inside your existing header
 * component. On click it flips a shared "panel open" flag that
 * AccessibilityPanel.tsx listens for, so the two can be placed completely
 * independently of each other in the layer tree (same pattern discussed
 * for a global toggle button driving another component, but built with a
 * plain window event instead of Framer's Variables feature, so it works
 * on any plan).
 */
export default function AccessibilityToggleButton(props: AccessibilityToggleButtonProps) {
    const {
        icon = "♿",
        ariaLabel = "Accessibility options",
        size = 40,
        background = "#1a1440",
        color = "#fff",
        customButton,
        style,
    } = props

    const open = usePanelOpen()

    // Unlike the panel's Custom Switch (On/Off), this only needs one
    // connection — the button itself doesn't have two looks to alternate
    // between, it's just a trigger, so there's no state to hand back to a
    // connected component the way the switch's checked/unchecked look
    // needs to be. Whatever's connected here just needs to look right
    // sitting still; the click is still handled by this wrapping button
    // either way, so a purely visual custom component (no code, no props
    // of its own) works fine.
    if (customButton) {
        return (
            <button
                type="button"
                aria-label={ariaLabel}
                aria-pressed={open}
                onClick={() => setPanelOpen(!panelOpenMemory)}
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "inline-flex", ...style }}
            >
                <ConnectedSlot node={customButton} size={size} />
            </button>
        )
    }

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            aria-pressed={open}
            onClick={() => setPanelOpen(!panelOpenMemory)}
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                border: "none",
                background,
                color,
                fontSize: size * 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                lineHeight: 1,
                ...style,
            }}
        >
            {icon}
        </button>
    )
}

addPropertyControls(AccessibilityToggleButton, {
    customButton: {
        type: ControlType.ComponentInstance,
        title: "Custom Button",
    },
    icon: {
        type: ControlType.String,
        title: "Icon",
        defaultValue: "♿",
        hidden: (props: AccessibilityToggleButtonProps) => Boolean(props.customButton),
    },
    ariaLabel: {
        type: ControlType.String,
        title: "Aria Label",
        defaultValue: "Accessibility options",
    },
    size: {
        type: ControlType.Number,
        title: "Size",
        min: 24,
        max: 80,
        step: 1,
        defaultValue: 40,
        unit: "px",
        hidden: (props: AccessibilityToggleButtonProps) => Boolean(props.customButton),
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#1a1440",
        hidden: (props: AccessibilityToggleButtonProps) => Boolean(props.customButton),
    },
    color: {
        type: ControlType.Color,
        title: "Icon Color",
        defaultValue: "#ffffff",
        hidden: (props: AccessibilityToggleButtonProps) => Boolean(props.customButton),
    },
})
