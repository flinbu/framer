/**
 * Stand-in for the "framer" package when running outside the Framer editor.
 * Only used by the local Vite preview (aliased in vite.config.ts) — the real
 * "framer" package is still what ships when SlicedText.tsx is pasted into a
 * Framer project. addPropertyControls is a no-op here since the preview
 * passes props directly instead of through Framer's UI panel.
 */
export enum ControlType {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Color = "color",
    Enum = "enum",
    Font = "font",
}

export function addPropertyControls(
    _component: unknown,
    _controls: Record<string, unknown>
): void {}
