/**
 * Stand-in for the "framer" package when running outside the Framer editor.
 * Only used by the local Vite preview (aliased in vite.config.ts) — the real
 * "framer" package is still what ships when these components are pasted
 * into a Framer project. addPropertyControls is a no-op here since the
 * preview passes props directly instead of through Framer's UI panel.
 */
export enum ControlType {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Color = "color",
    Enum = "enum",
    Font = "font",
    ComponentInstance = "componentinstance",
}

export function addPropertyControls(
    _component: unknown,
    _controls: Record<string, unknown>
): void {}

// The preview always behaves like Framer's Preview mode, never the canvas —
// components should animate/interact normally here.
export enum RenderTarget {
    canvas = "CANVAS",
    export = "EXPORT",
    preview = "PREVIEW",
    thumbnail = "THUMBNAIL",
}

export namespace RenderTarget {
    export function current(): RenderTarget {
        return RenderTarget.preview
    }
}
