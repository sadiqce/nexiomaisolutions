import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/nexiomaisolutions/", // REPLACE 'nexiom-ai' WITH YOUR REPO NAME
})