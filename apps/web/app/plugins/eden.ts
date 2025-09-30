import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { treaty } from "@elysiajs/eden";
import type { App } from "../../../server/src/index";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const origin =
    typeof window === "undefined"
      ? nuxtApp.ssrContext?.url
      : window.location.origin;
  const baseURL = origin + config.public.baseURL;

  const client = treaty<App>(baseURL, {
    fetch: {
      credentials: "include",
    },
  });

  return {
    provide: {
      eden: client,
    },
  };
});

declare module "#app" {
  interface NuxtApp {
    $eden: ReturnType<typeof treaty<App>>;
  }
}
