import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { treaty } from "@elysiajs/eden";
import type { App } from "../../../server/src/index";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const serverUrl = config.public.serverURL;

  const client = treaty<App>(serverUrl, {
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
