import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function removeJsPdfRemotePdfObjectBranch() {
  return {
    name: "remove-jspdf-remote-pdfobject-branch",
    transform(code: string, id: string) {
      const normalizedId = id.replaceAll("\\", "/");
      if (!normalizedId.includes("node_modules/jspdf/dist/jspdf.es")) {
        return undefined;
      }

      if (!code.toLowerCase().includes("pdfobject.min.js")) {
        return undefined;
      }

      const remotePdfObjectBranch = /case["']pdfobjectnewwindow["']:[\s\S]*?case["']pdfjsnewwindow["']:/;
      if (!remotePdfObjectBranch.test(code)) {
        throw new Error(`Expected jsPDF remote PDFObject branch was not found in ${id}`);
      }

      return {
        code: code.replace(
          remotePdfObjectBranch,
          'case"pdfobjectnewwindow":throw new Error("PDFObject new-window output is not supported by ExportAI");case"pdfjsnewwindow":',
        ),
        map: null,
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  if (mode === "content-script") {
    return {
      plugins: [removeJsPdfRemotePdfObjectBranch()],
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
      removeJsPdfRemotePdfObjectBranch(),
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
