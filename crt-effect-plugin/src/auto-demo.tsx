import * as React from "react"
import { createRoot } from "react-dom/client"
import CRTEffectAuto from "./CRTEffectAuto"

// A real fixed-position nav bar, unrelated to CRTEffectAuto, placed here
// on purpose — this is what a page's own sticky header would look like,
// and it's part of proving that CRTEffectAuto's document.body filter
// doesn't visually break other fixed elements at a modest curvature (the
// containing-block quirk documented in CRTEffectAuto.tsx's comment block
// and the README is real, but small at the default 30/25 settings).
function FixedNav() {
    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: 48,
                background: "rgba(10,10,14,0.9)",
                borderBottom: "1px solid #2a2a34",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: 13,
                zIndex: 10,
            }}
        >
            real fixed nav — unrelated to CRTEffectAuto, here to check it doesn't break
        </div>
    )
}

function Page() {
    const [clicks, setClicks] = React.useState(0)
    return (
        <div style={{ background: "#0c0c10", color: "#fff", fontFamily: "-apple-system, sans-serif" }}>
            <FixedNav />
            <div style={{ height: 48 }} />
            <div
                style={{
                    minHeight: "100vh",
                    background: "linear-gradient(160deg, #2a2a32, #16161c 70%)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 12,
                    padding: 24,
                    textAlign: "center",
                }}
            >
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#8f8ac2", maxWidth: 480 }}>
                    CRTEffectAuto is dropped once below, with nothing connected to it — it applies to this whole
                    page by reaching document.body directly.
                </span>
                <h1 style={{ fontSize: 48, margin: "8px 0" }}>Jane Doe</h1>
                <p style={{ fontSize: 16, color: "#c9c6df", margin: 0 }}>Product Designer</p>
                <button
                    onClick={() => setClicks((c) => c + 1)}
                    style={{
                        marginTop: 16,
                        padding: "14px 28px",
                        borderRadius: 8,
                        border: "1px solid #fff",
                        background: "#fff",
                        color: "#0c0c10",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    Click me — {clicks}
                </button>
            </div>
        </div>
    )
}

function App() {
    return (
        <>
            <Page />
            {/* Dropped with zero connections — proves the "just drop it
                anywhere" claim. Its own position in the tree is
                irrelevant since it targets document.body directly. */}
            <CRTEffectAuto curvature={30} aberration={25} rollBar={true} rollBarSpeed={6} />
        </>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
