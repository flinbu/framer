import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Local preview only: avoid bundling Framer's full canvas library.
      // The real "framer" package is still what GlitchEffect.tsx targets
      // when pasted into an actual Framer project.
      framer: new URL("./src/framer-shim.ts", import.meta.url).pathname,
    },
  },
})
