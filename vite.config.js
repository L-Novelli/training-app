import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// IMPORTANT for GitHub Pages:
// If you deploy to https://<username>.github.io/<repo-name>/ set base to '/<repo-name>/'
// If you deploy to https://<username>.github.io/ (a user/org page repo named <username>.github.io) set base to '/'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: 'https://l-novelli.github.io/training-app/',
})
