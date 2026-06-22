# Skill Hub

[English](README.en.md) · [中文](README.md)

![Skill Hub desktop app preview](docs/images/skill-hub-preview.png)

Skill Hub is a macOS desktop app for managing local Codex and Claude skills and plugins. It scans local resource folders, classifies where each resource came from, and helps distinguish official, GitHub-backed, and local skills.

## Features

- Inventory view for Codex and Claude skills/plugins.
- Separate Skills, Plugins, Market, and Settings sections.
- Source classification: Official, GitHub, and Local.
- Source tag filtering with per-view counts.
- GitHub source matching against configurable public index JSON files.
- GitHub Market: discover skills and plugins directly from GitHub repositories (no pre-published index needed), with built-in official and community catalogs so the Market has content on first open.
- Top-level Market tabs switch between **Plugin** and **Skill**. The Added section shows locally installed resources for the selected type, not just entries matched by a market source.
- Market prefetch and cache: the app warms the Market in the background after startup, keeps a 30-minute local cache, and only refreshes from GitHub when the user explicitly clicks Refresh.
- Paste any GitHub repo, skill URL, or plugin URL to discover and install resources inside it.
- Leaderboard: sort the Market by source-repo stars, with rank badges for the top entries. Large Market result sets are rendered in batches to keep tab switching responsive.
- Market refresh uses an animated Rose Three loader and shows per-source loading status.
- Update detection for GitHub-backed skills by comparing the remote `SKILL.md` hash.
- In-app update checks through GitHub Releases `latest.json` and signed updater artifacts.
- Details panel with summary, source URL, update status, path, compatibility, and warnings.
- Manual extra skill path scanning.
- Language setting for English and Chinese.
- Dark and light themes.
- Local install workflow that replaces `/Applications/Skill-Hub.app` without reinstalling through a DMG each iteration.

## How Scanning Works

Skill Hub scans these default roots:

- `~/.codex/skills`
- `~/.codex/plugins`
- `~/.claude/skills`
- `~/.claude/plugins`

You can add extra skill roots in Settings. A directory is treated as a skill when it contains `SKILL.md`. A Codex plugin is detected by `.codex-plugin/plugin.json`; a Claude plugin is detected by `plugin.json`.

Source classification uses this user-facing order:

1. GitHub: `.git/config`, `SKILL.md` frontmatter, or matched GitHub index metadata.
2. Official: Codex system skills, bundled plugin content, or curated plugin cache content.
3. Local: manually added, custom, or external resources that do not match a known GitHub source.

## GitHub Source Matching

GitHub matching is opt-in from Settings. When enabled, Skill Hub downloads one or more public index JSON files and compares them locally against installed skills. Local skill files and paths are not uploaded.

An index can be an array:

```json
[
  {
    "name": "ppt-master",
    "repository": "https://github.com/example/ppt-master",
    "description": "AI-driven multi-format SVG content generation system.",
    "skillSha256": "optional-sha256-of-SKILL.md"
  }
]
```

Or wrapped in a `skills` field:

```json
{
  "skills": [
    {
      "name": "ppt-master",
      "repository": "https://github.com/example/ppt-master"
    }
  ]
}
```

Matching confidence:

- `GitHub verified`: `SKILL.md` SHA-256 matches the index.
- `GitHub probable`: name and description match the index.

## GitHub Market

The Market discovers skills and plugins **directly from GitHub repositories** — no pre-published index file is required. It always shows built-in catalogs (so the Market has content even offline or when rate-limited), plus everything discovered from your configured **market sources**. New installs seed three default sources:

- [`anthropics/skills`](https://github.com/anthropics/skills)
- [`obra/superpowers`](https://github.com/obra/superpowers)
- [`anthropics/claude-plugins-official`](https://github.com/anthropics/claude-plugins-official)

The Market has **Plugin / Skill** tabs at the top. The Added section for the current tab is based on the local inventory: Skill shows the number of locally installed skills, Plugin shows the number of locally installed plugins, and both provide a short preview plus a Manage shortcut back to the local inventory view.

Market loading is intentionally decoupled from opening the Market tab:

- On app startup, Skill Hub starts a delayed background Market prefetch after the local inventory has begun loading.
- If a valid cache exists, the Market uses it immediately instead of calling GitHub.
- Market cache entries are valid for 30 minutes and are keyed by the configured market source list.
- Opening the Market tab does not trigger a GitHub refresh. Use **Refresh** to force a fresh GitHub fetch.
- Market lists are shown in batches to avoid a large one-time render when many resources are discovered. During refresh, the page shows an animated Rose Three loader plus per-source progress/status rows.

How discovery works for a repository:

1. One `git/trees?recursive=1` GitHub API call lists every `SKILL.md` and plugin manifest path in the repo.
2. Each resource's name and description are read over `raw.githubusercontent.com` (not rate-limited).
3. One repo-metadata call attaches the star count.

Entries are deduplicated by repository URL and marked as already installed when a local resource matches by source URL, `SKILL.md` hash, or name.

**Paste a link.** Paste any GitHub repo URL (`https://github.com/owner/repo`) or a specific resource URL (`.../tree/<branch>/skills/<name>`, `.../tree/<branch>/plugins/<name>`, etc.) into the single input at the top of the Market and click **Discover**. The found resources are merged into the Market and the repo is remembered as a source for future refreshes. Use the plus button next to the search box when you want to add a long-lived market source.

**Leaderboard.** Sort the Market by **Stars** (default) or **Name**. The top three entries get rank badges. Stars are the *source repository's* stargazers — GitHub has no per-skill metric, so skills from the same repo share that number (the star count carries a tooltip noting this).

Installing from the Market:

1. Pick the install target host (Codex or Claude).
2. Click **Install** on a card.

Skill Hub downloads the repository tarball over HTTPS from `codeload.github.com`, extracts it to a temporary directory, locates the skill or plugin (honoring a `/tree/<branch>/<subpath>` URL when present), and copies it into the selected host's `skills` or `plugins` directory.

Every install runs through the same safety guards as the rest of the app:

- Only public GitHub HTTPS/SSH URLs are accepted.
- Sensitive files (`.env`, `*.pem`, `*.key`, anything containing `token`/`secret`/`credential`) are never copied.
- Writes are confined to the host root, and an existing target is never overwritten (install fails with a name conflict instead).

### Rate limits and the optional token

The anonymous GitHub API allows only **60 requests/hour**, which discovery can exhaust quickly. If the Market looks empty on first open, that is usually the limit (the built-in official catalog still shows regardless). Add a personal access token under **Settings → GitHub token** to raise the limit to 5000 requests/hour. The token is stored locally only and never uploaded anywhere except as the `Authorization` header on GitHub API calls. A single source failing (rate limit or network) does not fail the whole Market — other sources and the curated catalog still load.

## Update Detection

For any GitHub-backed skill, the details panel shows a **Check for updates** action. Skill Hub fetches the remote `raw.githubusercontent.com/.../SKILL.md` (resolving the branch and subpath from the source URL, falling back from `main` to `master`), hashes it, and compares it with the local `SKILL.md`:

- `Up to date`: local and remote hashes match.
- `Update available`: hashes differ.
- `Could not determine`: no remote `SKILL.md` could be read.

When an update is available, the **Update** action downloads and validates the new copy into a temporary directory first, then moves the existing skill to the system trash and installs the fresh copy. If the download or validation fails, the installed skill is left untouched, and the old copy always goes to the trash rather than being permanently deleted.

## App Updates

The in-app **Check for updates** button reads `latest.json` from GitHub Releases. When building a release, Tauri generates the updater tarball and signature; then run:

```bash
cd app
npm run release:latest-json
```

The script uses the current `tauri.conf.json` version and updater signature to generate `src-tauri/target/release/bundle/macos/latest.json`, which can be uploaded to the GitHub Release alongside `Skill-Hub.app.tar.gz` and its `.sig` file.

## Development

Prerequisites:

- Node.js
- Rust
- macOS for Tauri app packaging

Install dependencies:

```bash
cd app
npm install
```

Run the Vite development server:

```bash
npm run dev
```

This serves the web UI at `http://127.0.0.1:1420/` for browser-based development. It does **not** update the installed macOS app in `/Applications`.

Run checks:

```bash
npm run test
npm run lint
npm run format:check
cd src-tauri && cargo test
```

Build the app bundle:

```bash
npm run build:app
```

Install the latest local build into `/Applications`:

```bash
npm run install:local
```

Use this command whenever you want the installed desktop app (`/Applications/Skill-Hub.app`) to reflect local code changes. The script builds the Tauri bundle, quits the currently running Skill Hub app, replaces `/Applications/Skill-Hub.app`, clears quarantine metadata when possible, and reopens the app.

If the browser at `http://127.0.0.1:1420/` shows a change but the desktop app does not, you are looking at two different runtime targets. Run `npm run install:local` and reopen the desktop app.

Build the desktop release artifacts:

```bash
npm run build:desktop
```

## Repository Layout

- `app/src`: React UI.
- `app/src-tauri/src`: Tauri/Rust backend for scanning, source matching, installs, and deletion.
- `app/scripts`: local install and DMG post-processing scripts.
- `app/src/*.test.tsx` and `app/src/*.test.ts`: frontend tests.
- `app/src-tauri/src/lib.rs`: backend logic and Rust tests.

## Privacy Notes

GitHub matching is disabled by default. When enabled, the app downloads configured index URLs and performs matching locally. It does not upload local skill directories, file contents, or paths.
