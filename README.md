# LAN Party App

Desktop app for our LAN party group (Windows, macOS, Linux). Built with Electron, React and TypeScript.

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
```

Settings are stored as JSON in the OS app-data folder (`%APPDATA%\LAN Party App` on Windows, `~/Library/Application Support/LAN Party App` on macOS, `~/.config/LAN Party App` on Linux).

## Building installers

```bash
npm run dist:win     # NSIS installer + portable .exe  -> release/
npm run dist:linux   # AppImage + .deb
npm run dist:mac     # .dmg (must be built on a Mac)
```

The GitHub Actions workflow in `.github/workflows/build.yml` builds all three platforms. It runs when you push a `v*` tag or start it by hand. The builds are unsigned, so Windows SmartScreen and macOS Gatekeeper will warn on first launch. On macOS, right-click the app and choose **Open**.

## Project layout

```
src/main/       Electron main process: window, IPC, API client, persistence
src/preload/    Safe bridge exposing window.api to the UI
src/renderer/   React UI
src/shared/     Types and game-mode definitions shared by both sides
```
