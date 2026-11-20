#!/usr/bin/env node
/**
 * Gate HQ behind a Cursor login, then start the playground server.
 * Usage: node scripts/ensure-login-and-serve.mjs [--port 3000]
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const credentialsPath = path.join(
  homedir(),
  ".config",
  "agent-serve",
  "credentials.json",
);
/** Local CLI from this package's deps — not assumed on PATH. */
const agentSdkEntry = path.join(
  projectRoot,
  "node_modules",
  "@grok",
  "agent-sdk",
  "dist",
  "bin",
  "agent-serve.js",
);
const portFlagIndex = process.argv.indexOf("--port");
const port =
  portFlagIndex >= 0 && process.argv[portFlagIndex + 1]
    ? process.argv[portFlagIndex + 1]
    : "3000";

function runAgentSdk(args, opts = {}) {
  return spawnSync(process.execPath, [agentSdkEntry, ...args], {
    cwd: projectRoot,
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
  console.log("AI Company HQ needs a Cursor login before the playground can run turns.");
  console.log("Opening browser sign-in… finish it, then this script will continue.");
  console.log("");

  const login = runAgentSdk(["login"], { stdio: "inherit" });

  if (isSignedIn()) {
    console.log("Login ok. Starting HQ…");
    return;
  }

  if (login.status !== 0 && login.status !== null) {
    console.error("Login failed or was cancelled. Playground was not started.");
    process.exit(login.status ?? 1);
  }

  console.error("Still not signed in after login. Playground was not started.");
  process.exit(1);
}

if (!existsSync(agentSdkEntry)) {
  console.error(
    `agent-sdk CLI missing at ${agentSdkEntry}. Run: npm install`,
  );
  process.exit(1);
}

ensureLogin();

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
    port,
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
