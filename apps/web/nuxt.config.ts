// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-09-17",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@vueuse/nuxt", "@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  devServer: {
    port: 3001,
  },
  debug: false,
  ssr: false,
  colorMode: {
    preference: "light",
    storageKey: "color-mode",
  },
  icon: {
    collections: ["lucide"],
    provider: "server",
    serverBundle: "local",
  },
  runtimeConfig: {
    public: {
      apiURL:
        process.env.NODE_ENV === "development"
          ? "http://localhost:3001/server"
          : process.env.NUXT_PUBLIC_API_URL || "/server",
    },
  },
  experimental: {
    viewTransition: true,
  },
  nitro: {
    preset: "bun",
    devProxy: {
      "/server": {
        target: "http://localhost:3000/server",
        changeOrigin: true,
        prependPath: true,
      },
    },
  },
});
