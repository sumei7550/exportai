import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "content-script") {
    return {
      build: {
        outDir: "dist",
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(__dirname, "src/content/content-script.ts"),
          output: {
            format: "iife",
            inlineDynamicImports: true,
            entryFileNames: "assets/content.js",
          },
        },
      },
    };
  }

  return {
    plugins: [
      react(),
      {
        name: "copy-extension-manifest",
        closeBundle() {
          mkdirSync(resolve(__dirname, "dist"), { recursive: true });
          copyFileSync(resolve(__dirname, "manifest.json"), resolve(__dirname, "dist/manifest.json"));
        },
      },
    ],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "popup.html"),
          background: resolve(__dirname, "src/background/service-worker.ts"),
        },
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
