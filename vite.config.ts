import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  // Evita 504/ERR_ABORTED no preview quando o dep optimizer entra em estado
  // inconsistente. Esses pacotes são servidos como módulos ESM normais.
  optimizeDeps: {
    exclude: [
      "lucide-react",
      "framer-motion",
      "zod",
      "date-fns",
      "recharts",
      "@tanstack/react-query",
      "@tanstack/query-core",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-progress",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/react-query": path.resolve(__dirname, "./node_modules/@tanstack/react-query/build/modern/index.js"),
      "@tanstack/query-core": path.resolve(__dirname, "./node_modules/@tanstack/query-core/build/modern/index.js"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    sourcemap: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')) {
              return 'admin';
            }
            if (id.includes('/src/pages/bracket/') || id.includes('/src/components/bracket/')) {
              return 'bracket';
            }
            return undefined;
          }

          // node_modules chunking
          if (id.includes('react-router')) return 'vendor-react';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@tanstack/react-query') || id.includes('@tanstack/query-core')) return 'vendor-query';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          // Lucide isolado em chunk próprio — combinado com optimizeDeps.exclude
          // garante tree-shake correto dos ícones individuais.
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('date-fns')) return 'vendor-dates';
          if (id.includes('react-helmet')) return 'vendor-seo';
          if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';
          if (id.includes('sonner') || id.includes('embla-carousel')) return 'vendor-ui';
          return 'vendor';
        },
      },
    },
  },
}));
