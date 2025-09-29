export default defineAppConfig({
  ui: {
    colors: {
      primary: "blue",
      neutral: "stone",
    },
    icons: {
      loading: "i-lucide-loader",
    },
    formField: {
      slots: {
        labelWrapper:
          "flex content-center items-center justify-between min-h-[2.5rem]",
      },
    },
  },
  colorMode: {
    preference: "light",
  },
});
