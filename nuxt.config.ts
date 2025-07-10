// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  css: ['./app/assets/css/main.css'],

  modules: ['@nuxt/ui', '@nuxt/eslint'],
})