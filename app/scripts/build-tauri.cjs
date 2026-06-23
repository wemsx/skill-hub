#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function readSigningKey() {
  if (process.env.TAURI_SIGNING_PRIVATE_KEY) {
    return process.env.TAURI_SIGNING_PRIVATE_KEY;
  }
  const keyPath =
    process.env.TAURI_SIGNING_PRIVATE_KEY_PATH ||
    path.join(os.homedir(), ".skill-hub", "updater.key");
  if (!fs.existsSync(keyPath)) {
    return undefined;
  }
  return fs.readFileSync(keyPath, "utf8");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      TAURI_SIGNING_PRIVATE_KEY: readSigningKey() || "",
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || "",
    },
    shell: process.platform === "win32",
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const passthrough = process.argv.slice(2).filter((arg) => arg !== "--repack-dmg");
run("npx", ["tauri", "build", ...passthrough]);

if (process.argv.includes("--repack-dmg") && process.platform === "darwin") {
  run("sh", [path.join("scripts", "repack-dmg-alias.sh")]);
}
