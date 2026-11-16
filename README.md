# LAN Party App

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Coded with Claude](https://img.shields.io/badge/coded%20with-Claude-d97757.svg)](https://claude.com/claude-code)

Desktop app for our LAN party group (Windows, macOS, Linux). Built with Electron, React and TypeScript.

> 🤖 This project is coded using [Claude Code](https://claude.com/claude-code), Anthropic's AI coding assistant.

## Features

### Age of Empires II: DE ranking

- **Overview tab**: one row per player with the rating (and global rank) in every shown game mode, plus total wins/losses, win %, the longest current win streak and lose streak, and when they last played.
- **One tab per game mode** (RM 1v1, RM Team, EW 1v1, …): the group ranking (🥇🥈🥉) with rating, peak rating, global rank, wins, losses, games, win %, current streak, drops and last game.
- Click any column header to sort. Click a player's name to open their aoe2companion profile.
- **Players & settings**: search players by in-game name, profile ID or aoe2companion link. You can also give players a LAN nickname, reorder or remove them, choose which game modes to show, and set auto refresh.
- Your settings are saved, and the last loaded stats are cached, so the table still shows something when the LAN has bad internet.

Notes:
- "unranked" means the official ladder has no current rank for that player in that mode, usually because they have been inactive. Their rating is still shown.
- Streaks are the *current* streaks reported by the game servers (W = wins in a row, L = losses in a row).

Data sources: stats come from the official AoE II DE community API (`aoe-api.worldsedgelink.com`), and player search uses [aoe2companion](https://www.aoe2companion.com).

## Development

Requires Node.js 22+.

```bash
npm install
npm run dev        # start with hot reload
npm run typecheck
npm run icon       # re-render build/icon.png after editing build/icon.svg
```

Settings are stored as JSON in the OS app-data folder (`%APPDATA%\LAN Party App` on Windows, `~/Library/Application Support/LAN Party App` on macOS, `~/.config/LAN Party App` on Linux).

## Building installers

```bash
npm run dist:win     # NSIS installer + portable .exe  -> release/
npm run dist:linux   # AppImage + .deb
npm run dist:mac     # .dmg (must be built on a Mac)
```

## Releases

Download the latest installers from the [Releases page](https://github.com/Grimgorg/lan-party-app/releases/latest):

| Platform | File |
| --- | --- |
| Windows | `LAN-Party-App-Setup-<version>.exe` (installer) or `LAN-Party-App-Portable-<version>.exe` (no install) |
| macOS | `LAN-Party-App-<version>-mac-arm64.dmg` (Apple Silicon) or `…-mac-x64.dmg` (Intel) |
| Linux | `LAN-Party-App-<version>-linux-x86_64.AppImage` or `…-linux-amd64.deb` |

Releases are automatic. Every push to `master` builds all three platforms, using `.github/workflows/release.yml`. When the `version` in `package.json` has no GitHub release yet, the workflow publishes release `v<version>` with the installers attached. To ship a new version:

```bash
npm version patch   # or minor / major: bumps package.json, commits and tags
git push
```

### Updates

At every start, the app checks GitHub for a newer release. When it finds one, it asks: **Update now**, **Later** or **Skip this version**. "Update now" downloads the new version, closes the app, installs the update and starts it again. The Windows installer build, the AppImage and the .deb update themselves this way. The macOS app (unsigned) and the Windows portable .exe can't install updates themselves, so they offer to open the download page instead. Without internet the check fails silently and tries again at the next start. The version you have is shown in the top bar.

The builds are unsigned, so Windows SmartScreen ("More info" → "Run anyway") and macOS Gatekeeper will warn on first launch. On macOS, right-click the app and choose **Open**.

## Project layout

```
src/main/       Electron main process: window, IPC, API client, persistence
src/preload/    Safe bridge exposing window.api to the UI
src/renderer/   React UI
src/shared/     Types and game-mode definitions shared by both sides
```

## License

[MIT](LICENSE): free for anyone to use, copy, modify and distribute, including commercially.
