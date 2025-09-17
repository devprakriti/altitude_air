// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-09-17',
	devtools: { enabled: true },
	modules: ["@nuxt/ui", 'nitro-cloudflare-dev'],
	css: ["~/assets/css/main.css"],
	devServer: {
		port: 3001,
	},
	ssr: true,
	runtimeConfig: {
		public: {
			serverURL: process.env.NUXT_PUBLIC_SERVER_URL,
		},
	},
  nitro: {
        preset: "cloudflare_module",
        cloudflare: {
          deployConfig: true,
          nodeCompat: true
        }
      }
});
