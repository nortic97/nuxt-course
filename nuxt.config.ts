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

  modules: ['@nuxt/eslint', '@nuxt/image', '@nuxt/ui'],

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
