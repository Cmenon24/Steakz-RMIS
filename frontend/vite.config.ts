
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configure React, Tailwind CSS, and Railway preview access.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  preview: {
    allowedHosts: ['steakz-rmis.up.railway.app'],
  },
})
