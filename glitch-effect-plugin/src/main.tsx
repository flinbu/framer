import * as React from "react"
import { createRoot } from "react-dom/client"
import GlitchEffect from "./GlitchEffect"

const pageStyle: React.CSSProperties = {
    background: "linear-gradient(160deg, #2a1a5c, #1a1440 60%, #10122e)",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "-apple-system, sans-serif",
}

const sectionStyle: React.CSSProperties = {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    padding: 48,
}

const labelStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8f8ac2",
}

// Recreates the reference: a glowing neon ring built from stacked box-shadows.
function NeonRing() {
    return (
        <div
            style={{
                width: 240,
                height: 240,
                borderRadius: "50%",
                border: "10px solid #fff",
                boxShadow: `
                    0 0 8px 2px #fff,
                    0 0 24px 8px #00e5ff,
                    0 0 48px 16px #ff2df0,
                    inset 0 0 24px 4px #00e5ff
                `,
            }}
        />
    )
}

function App() {
    return (
        <div style={pageStyle}>
            <section style={sectionStyle}>
                <span style={labelStyle}>trigger: hover — neon ring (reference recreation)</span>
                <GlitchEffect trigger="hover" intensity={70} streakCount={7} noiseBlockCount={4}>
                    <NeonRing />
                </GlitchEffect>
            </section>

            <section style={{ ...sectionStyle, background: "rgba(0,0,0,0.15)" }}>
                <span style={labelStyle}>trigger: auto loop — wrapping text</span>
                <GlitchEffect trigger="auto" autoInterval={1.4} intensity={55} streakCount={5} noiseBlockCount={3}>
                    <span
                        style={{
                            fontSize: 72,
                            fontWeight: 800,
                            fontFamily: "system-ui, sans-serif",
                            color: "#fff",
                        }}
                    >
                        SIGNAL LOST
                    </span>
                </GlitchEffect>
            </section>

            <section style={sectionStyle}>
                <span style={labelStyle}>trigger: random — wrapping a photo-style image</span>
                <GlitchEffect
                    trigger="random"
                    randomMinInterval={0.5}
                    randomMaxInterval={2.2}
                    intensity={65}
                    streakCount={6}
                    noiseBlockCount={5}
                    direction="vertical"
                >
                    <div
                        style={{
                            width: 360,
                            height: 220,
                            borderRadius: 8,
                            background: "linear-gradient(135deg, #ff5a36, #ffd23f 55%, #00c2d1)",
                        }}
                    />
                </GlitchEffect>
            </section>

            <section style={{ height: "120vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={labelStyle}>scroll down ↓</span>
            </section>

            <section style={{ ...sectionStyle, minHeight: "80vh" }}>
                <span style={labelStyle}>trigger: scroll into view (replay on re-enter)</span>
                <GlitchEffect trigger="scroll" replay={true} intensity={75} streakCount={8} noiseBlockCount={5}>
                    <NeonRing />
                </GlitchEffect>
            </section>

            <section style={{ height: "60vh" }} />
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
