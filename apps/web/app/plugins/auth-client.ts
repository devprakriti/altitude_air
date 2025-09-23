import { createAuthClient } from "better-auth/vue";
import { admin, organization } from "better-auth/plugins";


export default defineNuxtPlugin((nuxtApp) => {
	const config = useRuntimeConfig();
	const serverUrl = config.public.serverURL;

	const authClient = createAuthClient({
		baseURL: serverUrl,
		plugins:[
			admin(),
			organization(),
		]
	});

	return {
		provide: {
			authClient: authClient,
		},
	};
});
