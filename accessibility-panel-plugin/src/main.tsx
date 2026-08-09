import * as React from "react"
import { createRoot } from "react-dom/client"
import AccessibilityToggleButton from "./AccessibilityToggleButton"
import AccessibilityPanel from "./AccessibilityPanel"
// Demo-only convenience imports across plugin folders, so this preview
// can prove the cross-plugin "Reduce Effects" flag actually works
// end-to-end. The real pasted-into-Framer components never import each
// other — they're independent files that happen to agree on the same
// localStorage key/event name by convention (see each file's own
// comment on useA11yEffectsEnabled).
import CRTEffect from "../../crt-effect-plugin/src/CRTEffect"
import GlitchEffect from "../../glitch-effect-plugin/src/GlitchEffect"

const pageStyle: React.CSSProperties = {
    background: "#0c0c10",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "-apple-system, sans-serif",
}

const labelStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8f8ac2",
}

// Stands in for a user's own Framer-native Switch component (built from
// variants, no code) connected TWICE — once already left in its "off"
// look, once switched to its "on" look — exactly the two-instance shape
// described in the README's Custom Switch section, since a variants-only
// component has no way to accept an incoming boolean prop, only expose
// outgoing Events. Deliberately styled nothing like the built-in Switch
// in AccessibilityPanel.tsx, so it's obvious in the demo that these are
// actually being rendered instead of falling back to the default.
function MockCustomSwitch({ on }: { on: boolean }) {
    return (
        <div
            style={{
                width: 54,
                height: 28,
                borderRadius: 6,
                border: `2px solid ${on ? "#3dffb0" : "#555"}`,
                background: on ? "rgba(61,255,176,0.15)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 10,
                fontWeight: 700,
                color: on ? "#3dffb0" : "#888",
                flexShrink: 0,
            }}
        >
            {on ? "ON" : "OFF"}
        </div>
    )
}

// Stands in for a user's own header icon/button — connected via
// AccessibilityToggleButton's single Custom Button connector, since
// unlike the switch there's no on/off look to alternate between, just
// one trigger. Deliberately styled nothing like the built-in circle
// button, same reasoning as MockCustomSwitch below.
function MockCustomButton() {
    return (
        <div
            style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: "2px solid #ff9d3d",
                background: "rgba(255,157,61,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 16,
                color: "#ff9d3d",
            }}
        >
            A11Y
        </div>
    )
}

function NeonRing() {
    return (
        <div
            style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                border: "8px solid #fff",
                boxShadow: "0 0 8px 2px #fff, 0 0 24px 8px #00e5ff, 0 0 48px 16px #ff2df0",
            }}
        />
    )
}

function App() {
    return (
        <div style={pageStyle}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderBottom: "1px solid #232030",
                }}
            >
                <span style={{ fontWeight: 800 }}>Jane Doe</span>
                {/* Dropped inside the header — connects to AccessibilityPanel
                    below purely through the shared "panel open" flag, not
                    the layer tree. */}
                <AccessibilityToggleButton customButton={<MockCustomButton />} />
            </div>

            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 56 }}>
                <span style={labelStyle}>
                    open the accessibility button (top-right) and toggle "Reduce Effects" — both rings below should
                    stop glitching/curving live
                </span>

                <div style={{ display: "flex", gap: 64, flexWrap: "wrap", justifyContent: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        <span style={labelStyle}>CRTEffect (hover)</span>
                        <CRTEffect clipContent={false}>
                            <NeonRing />
                        </CRTEffect>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        <span style={labelStyle}>GlitchEffect (hover, datamosh)</span>
                        <GlitchEffect trigger="hover" intensity={70} effect="datamosh">
                            <NeonRing />
                        </GlitchEffect>
                    </div>
                </div>

                <p style={{ maxWidth: 480, textAlign: "center", color: "#8f8ac2", fontSize: 14 }}>
                    Try the Font Size and High Contrast toggles too — both apply to this whole demo page, and all
                    three settings persist across a reload (stored in localStorage). Reduce Effects and the panel's
                    own open/close state don't persist on purpose: Reduce Effects should stick as a real
                    accessibility preference, panel-open resets closed so it doesn't reopen unexpectedly.
                </p>
            </div>

            <AccessibilityPanel
                customSwitchOn={<MockCustomSwitch on={true} />}
                customSwitchOff={<MockCustomSwitch on={false} />}
            />
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
