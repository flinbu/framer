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

            <section style={{ ...sectionStyle, minHeight: "50vh" }}>
                <span style={labelStyle}>trigger: auto loop</span>
                <SlicedText
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

            <section style={{ height: "60vh" }} />
        </div>
    )
}

createRoot(document.getElementById("root")!).render(<App />)
