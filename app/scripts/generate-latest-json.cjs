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

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function platformKeyForCurrent() {
  const os = platformOs(process.platform);
  const arch = platformArch(process.arch);
  return `${os}-${arch}`;
}

function platformOs(platform) {
  if (platform === "darwin") return "darwin";
  if (platform === "win32") return "windows";
  if (platform === "linux") return "linux";
  throw new Error(`Unsupported updater platform: ${platform}`);
}

function platformArch(arch) {
  if (arch === "x64") return "x86_64";
  if (arch === "arm64") return "aarch64";
  throw new Error(`Unsupported updater architecture: ${arch}`);
}

function platformKeyForAsset(filePath, fallback = platformKeyForCurrent()) {
  const lower = filePath.toLowerCase();
  const fallbackArch = fallback.split("-").pop() || "x86_64";
  const arch =
    lower.includes("aarch64") || lower.includes("arm64")
      ? "aarch64"
      : lower.includes("x86_64") || lower.includes("x64") || lower.includes("amd64")
        ? "x86_64"
        : fallbackArch;
  if (lower.endsWith(".app.tar.gz")) {
    return `darwin-${arch}`;
  }
  if (lower.includes(".appimage")) {
    return `linux-${arch}`;
  }
  if (
    lower.endsWith(".msi") ||
    lower.endsWith(".msi.zip") ||
    lower.endsWith(".nsis.zip") ||
    lower.endsWith(".exe") ||
    lower.endsWith(".exe.zip")
  ) {
    return `windows-${arch}`;
  }
  if (lower.endsWith(".deb") || lower.endsWith(".rpm")) {
    return `linux-${arch}`;
  }
  return fallback;
}

function updaterPriority(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".app.tar.gz")) return 100;
  if (lower.includes(".appimage")) return 100;
  if (lower.endsWith("-setup.exe") || lower.endsWith(".nsis.zip")) return 100;
  if (lower.endsWith(".msi") || lower.endsWith(".msi.zip")) return 80;
  if (lower.endsWith(".deb") || lower.endsWith(".rpm")) return 40;
  return 10;
}

function releaseUrl(repo, version, fileName) {
  // GitHub renames spaces to dots in uploaded asset filenames.
  const safeName = fileName.replace(/ /g, ".");
  return `https://github.com/${repo}/releases/download/v${version}/${encodeURIComponent(safeName)}`;
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(entryPath);
    return [entryPath];
  });
}

function updaterArtifacts(bundleDir, platformFallback) {
  return walkFiles(bundleDir)
    .filter((file) => file.endsWith(".sig"))
    .map((signaturePath) => {
      const assetPath = signaturePath.slice(0, -4);
      if (!fs.existsSync(assetPath)) {
        throw new Error(`Missing updater bundle: ${assetPath}`);
      }
      const assetName = path.basename(assetPath);
      return {
        assetName,
        assetPath,
        platform: platformKeyForAsset(assetPath, platformFallback),
        signaturePath,
      };
    });
}

function main() {
  const root = path.resolve(__dirname, "..");
  const packageJson = readJson(path.join(root, "package.json"));
  const tauriConfig = readJson(path.join(root, "src-tauri", "tauri.conf.json"));
  const version = argValue("version", tauriConfig.version || packageJson.version);
  const repo = argValue("repo", "JerryLiu-uestc/skill-hub");
  const bundleDir = argValue("bundle-dir", path.join(root, "src-tauri", "target", "release", "bundle"));
  const notes = argValue("notes", "");
  const output = argValue("output", path.join(bundleDir, "latest.json"));
  const platform = argValue("platform", platformKeyForCurrent());
  const allPlatforms = hasArg("all-platforms");

  const artifacts = updaterArtifacts(bundleDir, platform).filter(
    (artifact) => allPlatforms || artifact.platform === platform,
  );
  if (artifacts.length === 0) {
    throw new Error(`No updater artifacts with .sig files found in ${bundleDir}`);
  }

  const platforms = {};
  const selected = {};
  for (const artifact of artifacts) {
    const current = selected[artifact.platform];
    if (current && current.priority >= updaterPriority(artifact.assetName)) {
      continue;
    }
    selected[artifact.platform] = {
      artifact,
      priority: updaterPriority(artifact.assetName),
    };
  }

  for (const [platformName, { artifact }] of Object.entries(selected)) {
    platforms[platformName] = {
      signature: fs.readFileSync(artifact.signaturePath, "utf8").trim(),
      url: releaseUrl(repo, version, artifact.assetName),
    };
  }
  const latest = {
    version,
    notes,
    pub_date: new Date().toISOString(),
    platforms,
  };

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(latest, null, 2)}\n`);
  console.log(`Wrote ${output}`);
  console.log(`Upload these files to GitHub release v${version}:`);
  for (const artifact of artifacts) {
    console.log(`- ${artifact.assetPath}`);
    console.log(`- ${artifact.signaturePath}`);
  }
  console.log(`- ${output}`);
}

try {
  main();
} catch (error) {
  console.error(`[generate-latest-json] ${error.message}`);
  process.exit(1);
}
