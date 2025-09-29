import { createAuthClient } from "better-auth/vue";
import { admin } from "better-auth/plugins";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const authUrl = config.public.apiURL;

  // Handle relative URLs by using window.location.origin in browser
  const baseURL =
    typeof window !== "undefined" && authUrl.startsWith("/")
      ? window.location.origin + authUrl + "/auth"
      : authUrl + "/auth";

  const authClient = createAuthClient({
    baseURL,
    plugins: [admin()],
  });

  return {
    provide: {
      authClient: authClient,
    },
  };
});
