import { createAuthClient } from "better-auth/vue";
import { admin } from "better-auth/plugins";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const authUrl = config.public.apiURL;

  const authClient = createAuthClient({
    baseURL: authUrl + "/auth",
    plugins: [admin()],
  });

  return {
    provide: {
      authClient: authClient,
    },
  };
});
