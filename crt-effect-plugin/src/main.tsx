import * as React from "react"
import { createRoot } from "react-dom/client"
import CRTEffect from "./CRTEffect"

const pageStyle: React.CSSProperties = {
    background: "linear-gradient(160deg, #1a1a1a, #0a0a0a 60%, #000)",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "-apple-system, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 56,
    padding: "48px 24px",
}

const labelStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8f8ac2",
    textAlign: "center",
    maxWidth: 420,
}

// A small mock "page" — nav, hero, heading, buttons — standing in for a
// real Framer template's root layer, so the demo shows CRTEffect wrapping
// actual interactive content (the buttons are real <button> elements,
// clickable straight through the overlay layers).
function MockPage() {
    const [clicks, setClicks] = React.useState(0)
    return (
        <div
            style={{
                width: 390,
                height: 760,
                background: "#0c0c10",
                color: "#fff",
                fontFamily: "-apple-system, sans-serif",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        border: "2px solid #ff5470",
                        borderRadius: 8,
                        transform: "rotate(45deg)",
                    }}
                />
                <div style={{ display: "flex", gap: 16, fontSize: 18 }}>
                    <span>⌕</span>
                    <span>≡</span>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    background: "linear-gradient(160deg, #2a2a32, #16161c 70%)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "0 24px 40px",
                }}
            >
                <h1 style={{ fontSize: 44, lineHeight: 1.05, margin: "0 0 8px" }}>
                    Jane
                    <br />
                    Doe
                </h1>
                <p style={{ fontSize: 16, color: "#c9c6df", margin: "0 0 6px" }}>Product Designer</p>
                <p style={{ fontSize: 13, color: "#8f8ac2", margin: "0 0 24px" }}>
                    12 years of UX/UI across web and native
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        onClick={() => setClicks((c) => c + 1)}
                        style={{
                            flex: 1,
                            padding: "14px 0",
                            borderRadius: 8,
                            border: "1px solid #ff5470",
                            background: "transparent",
                            color: "#ff5470",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Projects
                    </button>
                    <button
                        onClick={() => setClicks((c) => c + 1)}
                        style={{
                            flex: 1,
                            padding: "14px 0",
                            borderRadius: 8,
                            border: "1px solid #fff",
                            background: "#fff",
                            color: "#0c0c10",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        About
                    </button>
                </div>
                <p style={{ fontSize: 11, color: "#6b678f", marginTop: 12 }}>Button clicks: {clicks}</p>
            </div>
        </div>
    )
}

function App() {
    return (
        <div style={pageStyle}>
            <span style={labelStyle}>
                default settings — curvature, aberration, scanlines, vignette, grain, flicker all on at their
                defaults. Buttons are real, click through the overlay to test.
            </span>
            <CRTEffect>
                <MockPage />
            </CRTEffect>

            <span style={labelStyle}>off — clipContent + everything disabled, for a clean no-op comparison</span>
            <CRTEffect
                curvature={0}
                aberration={0}
                scanlines={false}
                vignette={false}
                grain={false}
                flicker={false}
            >
                <MockPage />
            </CRTEffect>

            <span style={labelStyle}>heavy — curvature 70, aberration 60, phosphor tint, roll bar on</span>
            <CRTEffect
                curvature={70}
                aberration={60}
                scanlineOpacity={45}
                vignetteOpacity={70}
                tint={true}
                tintColor="#33ff66"
                tintOpacity={30}
                rollBar={true}
                rollBarSpeed={5}
            >
                <MockPage />
            </CRTEffect>

            <span style={labelStyle}>subtle — curvature 12, aberration 8, no tint, for a barely-there look</span>
            <CRTEffect curvature={12} aberration={8} scanlineOpacity={18} vignetteOpacity={30} flickerIntensity={10}>
                <MockPage />
            </CRTEffect>

            <span style={labelStyle}>
                frame smaller than the page (Clip Content on) — a real crop window into the mock page
            </span>
            <div style={{ border: "1px dashed #8f8ac2" }}>
                <CRTEffect curvature={35} style={{ width: 260, height: 420 }}>
                    <MockPage />
                </CRTEffect>
            </div>
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
