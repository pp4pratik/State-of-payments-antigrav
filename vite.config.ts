import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// Base path assumes GitHub Pages project URL (pp4pratik.github.io/state-of-payments/).
// If a custom domain is attached later, change this to '/' and redeploy.
export default defineConfig({
  base: '/state-of-payments/',
  plugins: [
    tanstackRouter({ routesDirectory: 'src/routes', generatedRouteTree: 'src/routeTree.gen.ts' }),
    react(),
    tailwindcss(),
  ],
})
