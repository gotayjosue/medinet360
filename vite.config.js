import { sign } from "crypto";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/",

  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        faq: resolve(__dirname, "src/faq.html"),
        pricing: resolve(__dirname, "src/pricing.html"),
        signIn: resolve(__dirname, "src/signIn.html"),
        signUp: resolve(__dirname, "src/signUp.html"),
      },
    },
  },
});