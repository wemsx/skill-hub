#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

function platformKey() {
  if (process.platform !== "darwin") {
    throw new Error(`Only macOS updater manifests are supported by this helper, got ${process.platform}`);
  }
  if (process.arch === "arm64") return "darwin-aarch64";
  if (process.arch === "x64") return "darwin-x86_64";
  throw new Error(`Unsupported macOS architecture: ${process.arch}`);
}

function releaseUrl(repo, version, fileName) {
  // GitHub renames spaces to dots in uploaded asset filenames.
  const safeName = fileName.replace(/ /g, ".");
  return `https://github.com/${repo}/releases/download/v${version}/${encodeURIComponent(safeName)}`;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const packageJson = readJson(path.join(root, "package.json"));
  const tauriConfig = readJson(path.join(root, "src-tauri", "tauri.conf.json"));
  const version = argValue("version", tauriConfig.version || packageJson.version);
  const repo = argValue("repo", "JerryLiu-uestc/skill-hub");
  const bundleDir = argValue(
    "bundle-dir",
    path.join(root, "src-tauri", "target", "release", "bundle", "macos"),
  );
  const notes = argValue("notes", "");
  const output = argValue("output", path.join(bundleDir, "latest.json"));

  const assetName = `${tauriConfig.productName}.app.tar.gz`;
  const assetPath = path.join(bundleDir, assetName);
  const signaturePath = `${assetPath}.sig`;
  if (!fs.existsSync(assetPath)) {
    throw new Error(`Missing updater bundle: ${assetPath}`);
  }
  if (!fs.existsSync(signaturePath)) {
    throw new Error(`Missing updater signature: ${signaturePath}`);
  }

  const key = platformKey();
  const entry = {
    signature: fs.readFileSync(signaturePath, "utf8").trim(),
    url: releaseUrl(repo, version, assetName),
  };
  const latest = {
    version,
    notes,
    pub_date: new Date().toISOString(),
    platforms: {
      [key]: entry,
    },
  };

  fs.writeFileSync(output, `${JSON.stringify(latest, null, 2)}\n`);
  console.log(`Wrote ${output}`);
  console.log(`Upload these files to GitHub release v${version}:`);
  console.log(`- ${assetPath}`);
  console.log(`- ${signaturePath}`);
  console.log(`- ${output}`);
}

try {
  main();
} catch (error) {
  console.error(`[generate-latest-json] ${error.message}`);
  process.exit(1);
}
