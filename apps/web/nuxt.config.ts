// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-09-17',
	devtools: { enabled: true },
	modules: [
		"@nuxt/ui", 
		'nitro-cloudflare-dev',
		'@vueuse/nuxt'
	],
	css: ["~/assets/css/main.css"],
	devServer: {
		port: 3001,
	},
	ssr: false,
	runtimeConfig: {
		public: {
			// if development proxy to server
			serverURL: process.env.NODE_ENV === 'development' 
				? 'http://localhost:3001/proxy' 
				: process.env.NUXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
		},
	},
	routeRules: {
		'/api/**': {
			cors: true
		}
	},
  nitro: {
        preset: "cloudflare_module",
        cloudflare: {
          deployConfig: true,
          nodeCompat: true
        },
		devProxy: {
			'/proxy': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				prependPath: true
			}
		}
      }
});