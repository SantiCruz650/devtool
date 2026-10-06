import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // CAMBIO DE CONFIGURACION (4B): base '/' explicito. estela.netlify.app es
  // raiz de dominio, no subcarpeta; los assets se sirven desde /.
  base: '/',
  plugins: [react(), tailwindcss()],
})
