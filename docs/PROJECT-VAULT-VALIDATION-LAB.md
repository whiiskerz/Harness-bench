# WireForge v0.23 — Project Vault and Validation Lab

## Primary workflow

Design in Harness Designer, check with Validation Lab, save named versions in Project Vault, then use Production Studio for build documentation. The header includes Save to Browser, My Projects and autosave status.

## Browser saving

Existing working autosave remains. Project Vault stores independent named snapshots locally. Save to Browser creates a named snapshot on the first click and updates that snapshot subsequently. Save a new copy creates an independent version. Users can load, rename, delete and download versions. Loads and deletions ask for confirmation. Portable project JSON can be imported and exported. New blank project requires confirmation. Earlier saved designs from the previous Backup screen can be migrated into Project Vault while keeping the originals intact.

Up to 16 named versions are stored in separate browser localStorage entries. Storage quota, browser blocking and corrupted project files must be handled as failures rather than silently claiming success. Named snapshots are not automatically updated; users must click Save to Browser to update them.

Browser data may be erased by clearing site data, private browsing, device replacement or browser settings. It is not encrypted cloud synchronization or multi-user collaboration. Download project JSON backups for long-term storage.

## Validation Lab

Reports known structural conflicts, duplicate cavity usage, missing circuit labels and colors, unmeasured lengths and missing gauge. Uses existing electrical compatibility rules where endpoints are valid. Findings are filterable, searchable, clickable to inspect and downloadable as CSV or JSON.

The Connection Tester compares two selected cavity endpoints using the schematic's modeled union of wires, splices and bus links. It does not send current through hardware or model energized contacts.

Zero detected problems does not mean electrically safe. Unknown manufacturer mating compatibility, terminals, seals, fuse dynamics, insulation and installation ratings require verification outside this tool. Wiring reports are for review, not certification.

## Product scope

This upgrade targets paid-software user experience and polish, not an actual payment system. Subscription billing, account authentication, secure cloud saving, shared workspaces and verified manufacturer CAD remain outside this release.

## Tests

The Project Vault and Validation Lab CI workflow checks syntax and uses Chromium to verify named snapshots, reload persistence, separate versions, restore, import/export, continuity, a known injected fuse/current issue, actionable navigation and mobile UI. Existing application and 3D tests must also pass.
