import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import net from "net";

function autoBackendPlugin(): Plugin {
  let backendProc: ChildProcess | null = null;
  return {
    name: "auto-backend",
    configureServer() {
      const socket = net.createConnection({ port: 5000, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.destroy();
      });
      socket.once("error", () => {
        socket.destroy();
        const rootDir = path.resolve(import.meta.dirname, "..");
        const serverFile = path.resolve(rootDir, "server", "server.js");
        backendProc = spawn(process.execPath, [serverFile], {
          stdio: "inherit",
          env: process.env,
          cwd: rootDir,
        });
      });

      const killBackend = () => {
        if (backendProc) {
          backendProc.kill();
          backendProc = null;
        }
      };

      process.once("exit", killBackend);
      process.once("SIGINT", killBackend);
      process.once("SIGTERM", killBackend);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), autoBackendPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    hmr: false,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
