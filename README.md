# Harness Bench

A standalone browser-based wiring harness design tool exported from a Claude Artifact.

## Files

- `index.html` — complete standalone app source, including its built-in parts catalog and application logic.
- `claude-artifact-notes.md` — the Markdown export received from Claude. It contains only a brief app description.
- `catalog-inventory.json` — a transparent inventory of notable built-in catalog entries and known limitations. It is not a verified pinout database.

## Run locally

Open `index.html` in a modern browser. The app uses browser `localStorage` for saved designs. Browser data does not automatically sync between devices or browsers.

## Publish with GitHub Pages

1. Create a GitHub repository (for example, `harness-bench`).
2. Upload these files to the repository root.
3. In repository **Settings → Pages**, choose deployment from the `main` branch and the root (`/`) folder.
4. Open the published Pages URL and test the app.

## Important safety / accuracy note

The catalog is embedded in `index.html`. Some items are generic templates, and many do not contain exact manufacturer part numbers, terminal/seal information, or verified function labels. The existing MaxxECU labels and other pin definitions must be checked against the exact ECU/harness documentation and connector orientation before using this tool to build or energize a real harness. Do not assume a catalog entry is a verified manufacturer pinout.

## Saved design backup

The app has a backup-copy feature that copies a JSON snapshot of the current drawing. Use it periodically and save the copied JSON somewhere safe. The app stores data in local browser storage under `harness-bench-v2`; clearing browser website data may erase those saved designs.
