
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configure React and Tailwind CSS for the frontend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
