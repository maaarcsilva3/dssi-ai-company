#!/usr/bin/env node
/**
 * Gate HQ behind a Cursor login, then start the playground server.
 * Usage: node scripts/ensure-login-and-serve.mjs [--port 3000]
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portFlagIndex = process.argv.indexOf("--port");
const port =
  portFlagIndex >= 0 && process.argv[portFlagIndex + 1]
    ? process.argv[portFlagIndex + 1]
    : "3000";

function hasEnvCredential() {
  return Boolean(
    process.env.CURSOR_API_KEY ||
      process.env.CURSOR_API_KEY_FILE ||
      process.env.CURSOR_SERVICE_ACCOUNT_KEY,
  );
}

function whoamiOk() {
  const result = spawnSync("agent-sdk", ["whoami", "--json"], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) return false;
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (/not signed in/i.test(out)) return false;
  try {
    const json = JSON.parse(result.stdout || "{}");
    if (json?.error) return false;
    // whoami --json typically includes account or email when signed in
    return true;
  } catch {
    return !/not signed in/i.test(out) && result.status === 0;
  }
}

function ensureLogin() {
  if (hasEnvCredential()) {
    console.log("Cursor credential found in environment.");
    return;
  }
  if (whoamiOk()) {
    console.log("Signed in to Cursor.");
    return;
  }

  console.log("");
  console.log("AI Company HQ needs a Cursor login before the playground can run turns.");
  console.log("Opening browser sign-in… finish it, then this script will continue.");
  console.log("");

  const login = spawnSync("agent-sdk", ["login"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });

  if (login.status !== 0) {
    console.error("Login failed or was cancelled. Playground was not started.");
    process.exit(login.status ?? 1);
  }

  if (!hasEnvCredential() && !whoamiOk()) {
    console.error("Still not signed in after login. Playground was not started.");
    process.exit(1);
  }

  console.log("Login ok. Starting HQ…");
}

ensureLogin();

const child = spawn(
  "agent-sdk",
  ["serve", "--dir", ".", "--mode", "single", "--dev", "--port", port],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
