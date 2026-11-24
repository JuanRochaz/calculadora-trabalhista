/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Endereço público do site, sem barra no final. O workflow do GitHub Pages define SITE_URL.
 * new URL() deixa o domínio em minúsculas (o dono do repositório pode ter maiúsculas).
 */
const SITE_URL = new URL(
  process.env.SITE_URL ?? 'https://juanrochaz.github.io/calculadora-trabalhista',
).href.replace(/\/$/, '')

// https://vite.dev/config/
export default defineConfig({
  define: { __SITE_URL__: JSON.stringify(SITE_URL) },
  // No GitHub Pages o site fica em /calculadora-trabalhista/ (definido no workflow).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
