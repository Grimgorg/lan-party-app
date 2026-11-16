# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React + TypeScript desktop app (Windows, macOS, Linux) for a LAN party group. Its current feature is a group ranking for Age of Empires II: DE: an overview tab plus one sortable tab per ranked game mode. It's built with electron-vite and packaged with electron-builder. Requires Node.js 22+.

## Commands

```bash
npm install
npm run dev          # electron-vite dev server with hot reload
npm run typecheck    # tsc --noEmit — the only automated check (no tests, no linter)
npm run build        # bundle to out/
npm run dist:win     # NSIS installer + portable exe -> release/  (also dist:linux, dist:mac; mac only builds on a Mac)
npm run icon         # re-render build/icon.png and build/icon-256.png from build/icon.svg
```

There is no test suite. Check changes with `npm run typecheck` and by running the app with `npm run dev`. TypeScript is strict, with `noUnusedLocals`/`noUnusedParameters`, so unused imports fail the typecheck.

## Architecture

The code is split into three Electron processes plus shared code. `tsconfig.json` covers all of it.

- **`src/main/`**: Node side. `index.ts` creates the window and registers all `ipcMain.handle` channels. `aoe-api.ts` is the HTTP client. `store.ts` handles persistence.
- **`src/preload/index.ts`**: maps each `window.api` method to an `ipcRenderer.invoke` channel.
- **`src/renderer/`**: React UI. It is sandboxed (`contextIsolation`, `sandbox`, no `nodeIntegration`) and talks to main only through `window.api`.
- **`src/shared/`**: `types.ts` (data shapes and the `Api` interface) and `modes.ts` (leaderboard IDs and their names). Both sides import these.

**Adding a renderer→main call touches four places:** the `Api` interface in `src/shared/types.ts`, the preload mapping, a `ipcMain.handle('<area>:<action>', …)` in `src/main/index.ts`, and the call site in the renderer. Validate IPC arguments in main, since they come from the renderer; the existing handlers check and clamp their inputs.

### Data flow

- **Stats:** `refreshStats()` in main takes the watched player IDs from the config. It calls `fetchStats`, which uses the official World's Edge API (`aoe-api.worldsedgelink.com/.../GetPersonalStat`) in batches of 50 IDs. It writes the result to the stats cache and returns it. Calls made while a refresh is already running share that refresh's promise. The API returns `statGroups` and `leaderboardStats` separately, and they are joined by `statgroup_id` (the member whose `personal_statgroup_id` equals the group id). `toModeStats` normalizes the data: `rank <= 0` becomes `null`, which the UI shows as "unranked".
- **Player search:** `searchPlayers` first tries to read a profile ID from a number or a profile URL, and looks that ID up through the official API. Otherwise it searches by name with the aoe2companion API (`data.aoe2companion.com/api/profiles`). aoe2companion is used only for search and for profile links.
- **Persistence (`store.ts`):** `config.json` and `stats-cache.json` live in Electron's `userData` folder. Writes go to a temp file that is then renamed into place, and a file that can't be parsed is renamed to `*.corrupt-<ts>`. Every config read and write goes through `sanitize()`, which **drops fields it doesn't know about**. A new `AppConfig` field therefore has to be added to `DEFAULT_CONFIG` and `sanitize()` as well as to the type, or it is silently lost. Visible modes are filtered against `GAME_MODES` in `src/shared/modes.ts`.
- **Renderer (`App.tsx`):** on startup it shows the cached stats right away, then refreshes. It also handles the auto-refresh timer, F5/Ctrl+R, and the error banner, which falls back to the cache. `format.ts#buildRows` combines watched players with their snapshots: the nickname is shown in place of the in-game name, which then appears underneath. The tables use `useSort`, which always sorts missing values last. Only the active tab is kept in `localStorage`; all other state lives in main's config.

### Auto updates

`src/main/updater.ts` uses electron-updater. It is the only runtime `dependency`, because electron-vite leaves `dependencies` out of the bundle and electron-builder packs them. The update source is the `build.publish` GitHub setting in `package.json`, which electron-builder writes into the app as `resources/app-update.yml`.

- **Check:** `UpdateDialog` calls `update:check` once per start. Only packaged builds check. The result is cached for the whole run, and a failed check (e.g. offline) just returns `null`.
- **Asking:** the user chooses Update now, Later, or Skip this version. Skip stores `skippedUpdateVersion` in the config.
- **Install:** `update:install` downloads with progress events on `update:progress`, then calls `quitAndInstall(true, true)`.
- **Where updates install themselves:** only on the Windows NSIS build, the AppImage and the .deb (`canInstall`). macOS refuses updates for an unsigned app, and the portable exe can't replace itself, so both open the releases page instead. Main refuses an install that `canInstall` rejects.
- **What releases must contain:** the workflow uploads the `latest*.yml` files, the blockmaps, and the macOS `zip` target that `latest-mac.yml` points to.
- **Compatibility:** changing release asset names, the `v<version>` tag format or the `publish` repo breaks updates for installed apps.
- **Testing locally:** build with `--dir`, then edit `release/win-unpacked/resources/app-update.yml` to `provider: generic` with a `url` that serves another build's `latest.yml` and installer.

The window refuses to navigate away and opens `http(s)` links in the system browser. The app runs as a single instance: starting it again focuses the open window. Closing the window quits the app on every OS, macOS included.

## Releases

`.github/workflows/release.yml` runs on every push to `master` and on PRs. It typechecks and builds unsigned installers for all three OSes. If the `version` in `package.json` has no `v<version>` GitHub release yet, it publishes that release with the installers. **Pushing a version bump to `master` ships a public release**, so release with `npm version patch|minor|major` followed by `git push`. The default branch is `master`.
