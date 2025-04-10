import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [react()],
    server: {
      port: 3000, // You can keep the port as 3000 if you want
      host: '0.0.0.0', // Add this line to expose the app to the network
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    define: {
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME),
      'import.meta.env.VITE_SESSION_TIMEOUT_MINUTES': JSON.stringify(env.VITE_SESSION_TIMEOUT_MINUTES),
    }
  }
})
