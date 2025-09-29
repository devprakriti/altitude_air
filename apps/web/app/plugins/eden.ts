import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { treaty } from "@elysiajs/eden";
import type { App } from "../../../server/src/index";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiURL;

  const client = treaty<App>(apiUrl, {
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
