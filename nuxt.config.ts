// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Configurar layers
  extends: [
    './layers/base',
    './layers/auth',
    './layers/chat',
    './layers/marketing'
  ],

  css: [
    'highlight.js/styles/atom-one-dark.css'
  ],

  modules: ['@nuxt/eslint', '@nuxt/image', '@nuxt/ui'],

  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
  },

  vite: {
    optimizeDeps: {
      include: ['debug'],
    },
  },

  nitro: {
    storage: {
      db: {
        driver: 'fs',
        base: './.data',
      },
    },
  },

  $production: {
    nitro: {
      storage: {
        db: {
          driver: 'netlify-blobs',
          name: 'db',
        },
      },
    },
  },
})
