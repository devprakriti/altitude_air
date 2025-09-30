import { createAuthClient } from "better-auth/vue";
import { admin } from "better-auth/plugins";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const origin =
    typeof window === "undefined"
      ? nuxtApp.ssrContext?.url
      : window.location.origin;
  const baseURL = origin + config.public.baseURL;

  const authClient = createAuthClient({
    baseURL: baseURL + "/auth",
    plugins: [admin()],
  });

  return {
    provide: {
      authClient: authClient,
    },
  };
});
