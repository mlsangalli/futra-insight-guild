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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
            // Group admin pages/components into a single chunk that public users never load
            if (id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')) {
              return 'admin';
            }
            // Tournament bracket — only loaded for /bracket routes
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
          // NOTE: lucide-react is intentionally NOT split into a manual chunk.
          // Manual chunking forces the entire package into one bundle (672kB),
          // defeating tree-shaking. Letting Rollup handle it via per-import
          // tree-shaking yields ~30-50kB total for the icons actually used.
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
