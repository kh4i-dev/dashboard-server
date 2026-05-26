import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const port = 3199;
const smokeAdminPassword = randomBytes(18).toString("base64url");
const child = spawn(process.execPath, ["server/index.js"], {
  env: { ...process.env, PORT: String(port), NODE_ENV: "test", DASHBOARD_ADMIN_PASSWORD: smokeAdminPassword },
  stdio: ["ignore", "pipe", "pipe"]
});

let cookie = "";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {})
    }
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

try {
  await wait(900);
  await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: smokeAdminPassword })
  });
  await request("/api/v1/dashboard/overview");
  await request("/api/v1/demo/scenario", {
    method: "POST",
    body: JSON.stringify({ scenario: "iis_down" })
  });
  const alerts = await request("/api/v1/alerts?status=open");
  if (!alerts.data.alerts.some((alert) => alert.type === "service_down")) {
    throw new Error("Expected service_down alert after demo scenario");
  }
  console.log("Smoke test passed");
} finally {
  child.kill();
}
