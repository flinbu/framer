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

// A fixed-size placeholder with corner labels, standing in for a photo —
// makes crop/alignment differences obvious when the frame and content
// don't match, unlike a plain gradient rectangle.
function PhotoCard() {
    return (
        <div
            style={{
                position: "relative",
                width: 220,
                height: 150,
                borderRadius: 6,
                background: "linear-gradient(135deg, #ff5a36, #ffd23f 55%, #00c2d1)",
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 800,
                color: "#1a1440",
            }}
        >
            <span style={{ position: "absolute", top: 6, left: 8 }}>TL</span>
            <span style={{ position: "absolute", top: 6, right: 8 }}>TR</span>
            <span style={{ position: "absolute", bottom: 6, left: 8 }}>BL</span>
            <span style={{ position: "absolute", bottom: 6, right: 8 }}>BR</span>
        </div>
    )
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
                <span style={labelStyle}>trigger: hover — effect: datamosh (default settings)</span>
                <GlitchEffect trigger="hover" intensity={70} effect="datamosh">
                    <NeonRing />
                </GlitchEffect>
            </section>

            <section style={{ ...sectionStyle, background: "rgba(0,0,0,0.15)" }}>
                <span style={labelStyle}>trigger: hover — effect: slide (position jump + hue cycle)</span>
                <GlitchEffect trigger="hover" intensity={70} effect="slide">
                    <NeonRing />
                </GlitchEffect>
            </section>

            <section style={sectionStyle}>
                <span style={labelStyle}>trigger: hover — effect: melt (streaky displacement + grain)</span>
                <GlitchEffect trigger="hover" intensity={70} effect="melt">
                    <NeonRing />
                </GlitchEffect>
            </section>

            <section style={{ ...sectionStyle, background: "rgba(0,0,0,0.15)" }}>
                <span style={labelStyle}>trigger: auto loop — effect: slide, on text</span>
                <GlitchEffect trigger="auto" autoInterval={1.4} intensity={60} duration={0.8} effect="slide">
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
                <span style={labelStyle}>trigger: random — effect: melt, on a photo-style image</span>
                <GlitchEffect
                    trigger="random"
                    randomMinInterval={0.5}
                    randomMaxInterval={2.2}
                    intensity={65}
                    duration={0.7}
                    effect="melt"
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

            <section style={{ ...sectionStyle, background: "rgba(0,0,0,0.15)" }}>
                <span style={labelStyle}>
                    frame bigger than content, Clip Content on — Align top-left vs. bottom-right vs. center
                </span>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
                    <div style={{ border: "1px dashed #8f8ac2", width: 380, height: 260 }}>
                        <GlitchEffect
                            trigger="hover"
                            intensity={60}
                            effect="datamosh"
                            alignX="left"
                            alignY="top"
                            clipContent={true}
                            style={{ width: 380, height: 260 }}
                        >
                            <PhotoCard />
                        </GlitchEffect>
                    </div>
                    <div style={{ border: "1px dashed #8f8ac2", width: 380, height: 260 }}>
                        <GlitchEffect
                            trigger="hover"
                            intensity={60}
                            effect="datamosh"
                            alignX="right"
                            alignY="bottom"
                            clipContent={true}
                            style={{ width: 380, height: 260 }}
                        >
                            <PhotoCard />
                        </GlitchEffect>
                    </div>
                    <div style={{ border: "1px dashed #8f8ac2", width: 380, height: 260 }}>
                        <GlitchEffect
                            trigger="hover"
                            intensity={60}
                            effect="datamosh"
                            clipContent={true}
                            style={{ width: 380, height: 260 }}
                        >
                            <PhotoCard />
                        </GlitchEffect>
                    </div>
                </div>

                <span style={labelStyle}>
                    frame smaller than content, Clip Content on — a true crop window, Align picks which part shows
                </span>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
                    <div style={{ border: "1px dashed #8f8ac2", width: 140, height: 100 }}>
                        <GlitchEffect
                            trigger="hover"
                            intensity={60}
                            effect="datamosh"
                            alignX="left"
                            alignY="top"
                            clipContent={true}
                            style={{ width: 140, height: 100 }}
                        >
                            <PhotoCard />
                        </GlitchEffect>
                    </div>
                    <div style={{ border: "1px dashed #8f8ac2", width: 140, height: 100 }}>
                        <GlitchEffect
                            trigger="hover"
                            intensity={60}
                            effect="datamosh"
                            alignX="right"
                            alignY="bottom"
                            clipContent={true}
                            style={{ width: 140, height: 100 }}
                        >
                            <PhotoCard />
                        </GlitchEffect>
                    </div>
                </div>
            </section>

            <section style={{ height: "120vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={labelStyle}>scroll down ↓</span>
            </section>

            <section style={{ ...sectionStyle, minHeight: "80vh" }}>
                <span style={labelStyle}>
                    trigger: scroll into view (replay on re-enter) — everything layered:
                    datamosh + tear + ghost + streaks + noise
                </span>
                <GlitchEffect
                    trigger="scroll"
                    replay={true}
                    intensity={75}
                    effect="datamosh"
                    tearContent={true}
                    ghostContent={true}
                    streakCount={6}
                    noiseBlockCount={4}
                >
                    <NeonRing />
                </GlitchEffect>
            </section>

            <section style={{ height: "60vh" }} />
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
