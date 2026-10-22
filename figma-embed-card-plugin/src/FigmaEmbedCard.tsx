// FigmaEmbedCard: a click-to-load Figma embed for Framer.
// Shows a light poster card first (fast, crawlable text, no 3 MB Figma
// iframe on page load), then swaps in the live Figma file on click.
// Paste into Framer: Assets > Code > New code file, name it FigmaEmbedCard.

import { useState } from "react"
import { addPropertyControls, ControlType } from "framer"

type Props = {
    embedUrl: string
    fileUrl: string
    title: string
    meta: string
    fileName: string
    fileNote: string
    buttonLabel: string
    linkLabel: string
    autoLoad: boolean
    poster?: { src: string; alt?: string }
    accent: string
    surface: string
    stage: string
    border: string
    font: Record<string, any>
    radius: number
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1072
 */
export default function FigmaEmbedCard(props: Props) {
    const {
        embedUrl,
        fileUrl,
        title,
        meta,
        fileName,
        fileNote,
        buttonLabel,
        linkLabel,
        autoLoad,
        poster,
        surface,
        stage,
        border,
        font,
        radius,
    } = props
    const [loaded, setLoaded] = useState(false)
    // Auto Load skips the poster; with no Embed URL yet there's nothing
    // to load, so the poster stays up either way.
    const showEmbed = !!embedUrl && (autoLoad || loaded)

    return (
        <section
            aria-label={title}
            style={{
                width: "100%",
                background: surface,
                border: `1px solid ${border}`,
                borderRadius: radius,
                overflow: "hidden",
                color: "#FFFFFF",
                ...font,
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 9",
                    backgroundColor: stage,
                    backgroundImage: poster?.src
                        ? undefined
                        : "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                }}
            >
                {showEmbed ? (
                    <iframe
                        src={embedUrl}
                        title={`${title} (interactive Figma file)`}
                        allowFullScreen
                        loading="lazy"
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            border: 0,
                        }}
                    />
                ) : (
                    <>
                        {poster?.src && (
                            <img
                                src={poster.src}
                                alt={poster.alt ?? ""}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    opacity: 0.55,
                                }}
                            />
                        )}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 20,
                                padding: 24,
                                textAlign: "center",
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "clamp(24px, 3vw, 36px)",
                                    fontWeight: 600,
                                }}
                            >
                                {title}
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 16,
                                    lineHeight: "24px",
                                    color: "#CBD5E1",
                                    maxWidth: 460,
                                }}
                            >
                                {meta}
                            </p>
                            {embedUrl ? (
                                <button
                                    type="button"
                                    onClick={() => setLoaded(true)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 10,
                                        minHeight: 48,
                                        padding: "14px 22px",
                                        borderRadius: 999,
                                        border: 0,
                                        background: "#FFFFFF",
                                        color: "#020303",
                                        font: "inherit",
                                        fontSize: 16,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                    {buttonLabel}
                                </button>
                            ) : (
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 14,
                                        color: "#94A3B8",
                                    }}
                                >
                                    Add an Embed URL to load the Figma file.
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "18px 22px",
                    borderTop: `1px solid ${border}`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <FigmaLogo />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 16, fontWeight: 500 }}>
                            {fileName}
                        </span>
                        <span style={{ fontSize: 14, color: "#BDBDBD" }}>
                            {fileNote}
                        </span>
                    </div>
                </div>
                {fileUrl && (
                    <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener"
                        style={{
                            padding: "12px 18px",
                            borderRadius: 8,
                            border: "1px solid #3F3F46",
                            color: "#FFFFFF",
                            textDecoration: "none",
                            fontWeight: 500,
                            fontSize: 15,
                        }}
                    >
                        {linkLabel}
                    </a>
                )}
            </div>
        </section>
    )
}

function FigmaLogo() {
    return (
        <svg width="20" height="30" viewBox="0 0 38 57" aria-hidden="true">
            <path
                fill="#1ABCFE"
                d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"
            />
            <path
                fill="#0ACF83"
                d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"
            />
            <path fill="#FF7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
            <path
                fill="#F24E1E"
                d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"
            />
            <path
                fill="#A259FF"
                d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"
            />
        </svg>
    )
}

FigmaEmbedCard.defaultProps = {
    embedUrl: "",
    fileUrl: "",
    title: "Your Figma file",
    meta: "A short description of what's inside the file.",
    fileName: "File name",
    fileNote: "Free on the Figma Community",
    buttonLabel: "Load the interactive file",
    linkLabel: "Open in Figma",
    autoLoad: false,
    accent: "#E94B63",
    surface: "#111112",
    stage: "#0B1220",
    border: "#27272A",
    radius: 16,
    font: { fontFamily: '"Rethink Sans", sans-serif' },
}

addPropertyControls(FigmaEmbedCard, {
    embedUrl: {
        type: ControlType.String,
        title: "Embed URL",
        placeholder: "https://embed.figma.com/design/…",
    },
    fileUrl: { type: ControlType.Link, title: "Figma link" },
    autoLoad: {
        type: ControlType.Boolean,
        title: "Auto Load",
        defaultValue: false,
        description:
            "Load the live file right away instead of showing the poster and button first.",
    },
    title: { type: ControlType.String, title: "Title" },
    meta: { type: ControlType.String, title: "Meta", displayTextArea: true },
    fileName: { type: ControlType.String, title: "File name" },
    fileNote: { type: ControlType.String, title: "File note" },
    buttonLabel: {
        type: ControlType.String,
        title: "Button",
        hidden: (props: Props) => props.autoLoad,
    },
    linkLabel: { type: ControlType.String, title: "Link label" },
    poster: { type: ControlType.ResponsiveImage, title: "Poster" },
    surface: { type: ControlType.Color, title: "Surface" },
    stage: { type: ControlType.Color, title: "Stage" },
    border: { type: ControlType.Color, title: "Border" },
    radius: { type: ControlType.Number, title: "Radius", min: 0, max: 40 },
    font: { type: ControlType.Font, title: "Font", controls: "extended" },
})
