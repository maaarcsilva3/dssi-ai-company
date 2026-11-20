#!/usr/bin/env node
/**
 * From the repo root: login gate → HQ playground (:3000).
 * Reports land in ./reports next to this script's parent folder.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hqDir = path.join(root, "ai-company");
const credentialsPath = path.join(
  homedir(),
  ".config",
  "agent-serve",
  "credentials.json",
);
/** Local CLI from ai-company deps — not assumed on PATH. */
const agentSdkEntry = path.join(
  hqDir,
  "node_modules",
  "@grok",
  "agent-sdk",
  "dist",
  "bin",
  "agent-serve.js",
);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!existsSync(path.join(hqDir, "package.json"))) {
  fail(`Missing HQ project at ${hqDir}`);
}
if (!existsSync(path.join(hqDir, "node_modules"))) {
  fail(`HQ deps missing. Run: cd ai-company && npm install`);
}
if (!existsSync(agentSdkEntry)) {
  fail(
    `agent-sdk CLI missing at ${agentSdkEntry}. Run: cd ai-company && npm install`,
  );
}

function runAgentSdk(args, opts = {}) {
  return spawnSync(process.execPath, [agentSdkEntry, ...args], {
    cwd: hqDir,
    ...opts,
  });
}

function hasEnvCredential() {
  return Boolean(
    process.env.CURSOR_API_KEY ||
      process.env.CURSOR_API_KEY_FILE ||
      process.env.CURSOR_SERVICE_ACCOUNT_KEY,
  );
}

function hasStoredCredentials() {
  return existsSync(credentialsPath);
}

/** agent-sdk whoami on Windows can print success then abort (UV assert). */
function whoamiOk() {
  const result = runAgentSdk(["whoami", "--json"], { encoding: "utf8" });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (/not signed in/i.test(out)) return false;

  const jsonLine = (result.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("{"));
  if (jsonLine) {
    try {
      const json = JSON.parse(jsonLine);
      if (json?.error) return false;
      if (json?.email || json?.authId || json?.credentialSource) return true;
    } catch {
      /* fall through */
    }
  }

  if (/\S+@\S+/.test(out) && /credential:/i.test(out)) return true;
  return false;
}

function isSignedIn() {
  return hasEnvCredential() || whoamiOk() || hasStoredCredentials();
}

function ensureLogin() {
  if (isSignedIn()) {
    console.log("Signed in to Cursor.");
    return;
  }

  console.log("");
  console.log("AI Company needs a Cursor login before HQ can run turns.");
  console.log("Opening browser sign-in… finish it, then HQ starts.");
  console.log("");

  const login = runAgentSdk(["login"], { stdio: "inherit" });

  if (isSignedIn()) {
    console.log("Login ok.");
    return;
  }

  if (login.status !== 0 && login.status !== null) {
    fail("Login failed or was cancelled. Nothing was started.");
  }

  fail("Still not signed in after login. Nothing was started.");
}

ensureLogin();

console.log("Starting HQ…");
console.log("");
console.log("  Playground  http://127.0.0.1:3000/playground");
console.log("  Reports     " + path.join(root, "reports"));
console.log("Ctrl+C stops HQ.");
console.log("");

const child = spawn(
  process.execPath,
  [
    agentSdkEntry,
    "serve",
    "--dir",
    ".",
    "--mode",
    "single",
    "--dev",
    "--port",
    "3000",
  ],
  {
    cwd: hqDir,
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  child.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  child.kill();
  process.exit(0);
});
