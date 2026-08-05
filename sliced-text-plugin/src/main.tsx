import * as React from "react"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import SlicedText from "./SlicedText"

const sectionStyle: React.CSSProperties = {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    padding: 48,
    borderBottom: "1px solid #eee",
}

const labelStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#999",
}

// Self-contained placeholder graphic (no network dependency) with bold,
// high-contrast shapes so the slicing/distortion and chromatic
// difference-blend are easy to see.
const demoImageSrc =
    "data:image/svg+xml," +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
          <rect width="480" height="320" fill="#141018"/>
          <circle cx="150" cy="160" r="120" fill="#ff5a36"/>
          <rect x="230" y="40" width="220" height="220" fill="#ffd23f"/>
          <polygon points="360,300 460,300 410,140" fill="#00c2d1"/>
          <circle cx="130" cy="120" r="40" fill="#141018"/>
        </svg>
    `)

function LiveControls() {
    const [intensity, setIntensity] = useState(40)
    const [sliceCount, setSliceCount] = useState(10)
    const [direction, setDirection] = useState<"horizontal" | "vertical">("horizontal")
    const [rgbSplit, setRgbSplit] = useState(true)

    return (
        <div style={sectionStyle}>
            <span style={labelStyle}>trigger: hover — live controls</span>
            <SlicedText
                text="DISTORT ME"
                font={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 88 }}
                color="#111111"
                direction={direction}
                sliceCount={sliceCount}
                trigger="hover"
                intensity={intensity}
                duration={0.6}
                stagger={0.02}
                easing="smooth"
                rgbSplit={rgbSplit}
                replay={true}
                contentType="text"
            />
            <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: "sans-serif", fontSize: 13 }}>
                <label>
                    Intensity {intensity}
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                    />
                </label>
                <label>
                    Slices {sliceCount}
                    <input
                        type="range"
                        min={2}
                        max={24}
                        value={sliceCount}
                        onChange={(e) => setSliceCount(Number(e.target.value))}
                    />
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={direction === "vertical"}
                        onChange={(e) => setDirection(e.target.checked ? "vertical" : "horizontal")}
                    />
                    Vertical
                </label>
                <label>
                    <input type="checkbox" checked={rgbSplit} onChange={(e) => setRgbSplit(e.target.checked)} />
                    RGB Split
                </label>
            </div>
        </div>
    )
}

function App() {
    return (
        <div style={{ background: "#fff" }}>
            <section style={{ ...sectionStyle, minHeight: "50vh" }}>
                <span style={labelStyle}>trigger: load (plays once on mount)</span>
                <SlicedText
                    contentType="text"
                    text="ON LOAD"
                    font={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 88 }}
                    color="#111111"
                    direction="horizontal"
                    sliceCount={9}
                    trigger="load"
                    intensity={50}
                    duration={0.7}
                    stagger={0.03}
                    easing="snappy"
                    rgbSplit={true}
                    replay={true}
                />
            </section>

            <LiveControls />

            <section style={{ ...sectionStyle, minHeight: "60vh" }}>
                <span style={labelStyle}>multi-line text (trigger: hover)</span>
                <SlicedText
                    contentType="text"
                    text={"TWO\nLINES"}
                    font={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 72 }}
                    color="#111111"
                    direction="horizontal"
                    sliceCount={12}
                    trigger="hover"
                    intensity={35}
                    duration={0.6}
                    stagger={0.02}
                    easing="smooth"
                    rgbSplit={true}
                    replay={true}
                />
            </section>

            <section style={{ ...sectionStyle, minHeight: "50vh" }}>
                <span style={labelStyle}>trigger: auto loop</span>
                <SlicedText
                    contentType="text"
                    text="AUTO LOOP"
                    font={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 88 }}
                    color="#111111"
                    direction="vertical"
                    sliceCount={12}
                    trigger="auto"
                    intensity={30}
                    duration={0.9}
                    stagger={0.015}
                    easing="linear"
                    rgbSplit={true}
                    replay={true}
                />
            </section>

            <section style={{ height: "120vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={labelStyle}>scroll down ↓</span>
            </section>

            <section style={{ ...sectionStyle, minHeight: "80vh" }}>
                <span style={labelStyle}>trigger: scroll into view (replay on re-enter)</span>
                <SlicedText
                    contentType="text"
                    text="SCROLL TRIGGER"
                    font={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 72 }}
                    color="#111111"
                    direction="horizontal"
                    sliceCount={14}
                    trigger="scroll"
                    intensity={60}
                    duration={0.8}
                    stagger={0.02}
                    easing="elastic"
                    rgbSplit={true}
                    replay={true}
                />
            </section>

            <section style={{ ...sectionStyle, minHeight: "60vh", background: "#141018" }}>
                <span style={{ ...labelStyle, color: "#888" }}>content: image (trigger: hover)</span>
                <SlicedText
                    contentType="image"
                    image={{ src: demoImageSrc, alt: "Demo graphic", pixelWidth: 480, pixelHeight: 320 }}
                    direction="horizontal"
                    sliceCount={10}
                    trigger="hover"
                    intensity={45}
                    duration={0.6}
                    stagger={0.02}
                    easing="smooth"
                    rgbSplit={true}
                    replay={true}
                    style={{ width: 480, height: 320 }}
                />
            </section>

            <section style={{ height: "60vh" }} />
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
