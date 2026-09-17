// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import react from "file:///D:/Project/posqrcode/posqrcode/node_modules/.pnpm/@vitejs+plugin-react@4.7.0__adca23f460cf9b25369f43e178ce0e84/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "file:///D:/Project/posqrcode/posqrcode/node_modules/.pnpm/vite@5.4.21_@types+node@22.20.1_terser@5.49.2/node_modules/vite/dist/node/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/Project/posqrcode/posqrcode/apps/web/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
      // Point at the TS entry so Vite never picks up accidental CJS .js next to sources.
      "@bear360/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", __vite_injected_original_import_meta_url)
      )
    }
  },
  optimizeDeps: {
    exclude: ["@bear360/shared"]
  },
  server: {
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQcm9qZWN0XFxcXHBvc3FyY29kZVxcXFxwb3NxcmNvZGVcXFxcYXBwc1xcXFx3ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFByb2plY3RcXFxccG9zcXJjb2RlXFxcXHBvc3FyY29kZVxcXFxhcHBzXFxcXHdlYlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovUHJvamVjdC9wb3NxcmNvZGUvcG9zcXJjb2RlL2FwcHMvd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAnbm9kZTp1cmwnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxyXG4gICAgICAvLyBQb2ludCBhdCB0aGUgVFMgZW50cnkgc28gVml0ZSBuZXZlciBwaWNrcyB1cCBhY2NpZGVudGFsIENKUyAuanMgbmV4dCB0byBzb3VyY2VzLlxyXG4gICAgICAnQGJlYXIzNjAvc2hhcmVkJzogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKCcuLi8uLi9wYWNrYWdlcy9zaGFyZWQvc3JjL2luZGV4LnRzJywgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGV4Y2x1ZGU6IFsnQGJlYXIzNjAvc2hhcmVkJ10sXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDUxNzMsXHJcbiAgfSxcclxufSlcclxuXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVQsU0FBUyxlQUFlLFdBQVc7QUFDdFYsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsb0JBQW9CO0FBRm9LLElBQU0sMkNBQTJDO0FBSWxQLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBO0FBQUEsTUFFcEQsbUJBQW1CO0FBQUEsUUFDakIsSUFBSSxJQUFJLHNDQUFzQyx3Q0FBZTtBQUFBLE1BQy9EO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxpQkFBaUI7QUFBQSxFQUM3QjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
