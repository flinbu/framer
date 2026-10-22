import * as React from "react"
import { createRoot } from "react-dom/client"
import FigmaEmbedCard from "./FigmaEmbedCard"

const pageStyle: React.CSSProperties = {
    background: "#09090b",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "-apple-system, sans-serif",
    padding: "48px 24px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 48,
}

const labelStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8f8ac2",
    margin: "0 0 12px",
}

// Framer fills unset props from defaultProps, so the preview does the
// same: spread them first, then override per demo.
const defaults = (FigmaEmbedCard as any).defaultProps

// Inline poster so the preview works offline; in Framer this comes from
// the Poster image control.
const demoPoster =
    "data:image/svg+xml," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#A259FF"/>
                <stop offset="0.5" stop-color="#F24E1E"/>
                <stop offset="1" stop-color="#1ABCFE"/>
            </linearGradient></defs>
            <rect width="1280" height="720" fill="url(#g)"/>
        </svg>`
    )

// The defaults ship blank/placeholder, so the filled-in demos supply a
// real community file of their own.
const example = {
    embedUrl:
        "https://embed.figma.com/design/r9odjnt6HZukFONWigAHy6/Seed-Design-System?node-id=0-1&embed-host=flinbu",
    fileUrl: "https://www.figma.com/community/file/1694480861909658527",
    title: "Seed for Figma",
    meta: "528 variables · 53 text styles · 19 effect styles · 142 component sets · 1,115 variants",
    fileName: "Seed Design System",
    fileNote: "Free on the Figma Community · Light and Dark modes",
}

function App() {
    return (
        <div style={pageStyle}>
            <div style={{ width: "100%", maxWidth: 1072 }}>
                <p style={labelStyle}>Defaults (placeholders, no Embed URL)</p>
                <FigmaEmbedCard {...defaults} />
            </div>
            <div style={{ width: "100%", maxWidth: 1072 }}>
                <p style={labelStyle}>Filled in, click to load</p>
                <FigmaEmbedCard {...defaults} {...example} />
            </div>
            <div style={{ width: "100%", maxWidth: 720 }}>
                <p style={labelStyle}>
                    Auto Load, with poster and custom colors (poster never shows)
                </p>
                <FigmaEmbedCard
                    {...defaults}
                    {...example}
                    autoLoad
                    poster={{ src: demoPoster, alt: "" }}
                    surface="#1a1325"
                    stage="#0f0a18"
                    border="#3b2a55"
                    radius={8}
                    font={{ fontFamily: "-apple-system, sans-serif" }}
                />
            </div>
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
