import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiServerDir = path.resolve(__dirname, "../../artifacts/api-server");

let serverProcess = null;
let testPort = null;
let baseUrl = null;

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

export async function startServer() {
  if (serverProcess && baseUrl) return baseUrl;

  testPort = await getFreePort();
  baseUrl = `http://127.0.0.1:${testPort}`;

  serverProcess = spawn("node", ["./dist/index.mjs"], {
    cwd: apiServerDir,
    env: { ...process.env, PORT: String(testPort), NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.on("error", (err) => {
    console.error("Test server error:", err);
  });

  // Poll until ready
  const start = Date.now();
  while (Date.now() - start < 10000) {
    try {
      const res = await fetch(`${baseUrl}/api/healthz`);
      if (res.ok) {
        return baseUrl;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  throw new Error(`Test server failed to start on port ${testPort} within timeout`);
}

export function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  if (!baseUrl) {
    await startServer();
  }

  const url = `${baseUrl}/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}
