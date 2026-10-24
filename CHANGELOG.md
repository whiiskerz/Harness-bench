# Changelog

## v0.5.0 — 2026-10-24
- Added DEUTSCH HD30 shell-size-24 insert presets for 24-9, 24-21, 24-14, 24-23, 24-7, 24-19, 24-16, 24-29, 24-18, and 24-31.
- Added circular schematic cavity layouts with contact-size-dependent cavity diameters.
- Added adjustable dual-bulkhead side-by-side/stacked layout and mating-face/wire-side mirrored view controls.
- Added a circular insert preview to Connector Studio.
- Cavity numbering is schematic only until verified against the exact manufacturer insert drawing; do not use it as a fabrication pin map.


## v0.4.0 — 2026-10-23
- Added a Circuit Audit table with per-wire missing-data flags, direct connector/pin endpoints, review status, review notes, jump-to-wire inspection, and CSV export.
- Added wire review statuses: Draft, Needs verification, and Verified. “Verified” is a manual review label and does not certify safety.
- Made E90 drawing work-area zones (Engine bay, DME box, Cabin, Trunk) draggable and resizable. Zone name, color, dimensions, and deletion are available in the inspector; custom zones can be added.
- Added additional E90 example components for fuel pressure, A/C pressure, oil pressure, CLT, IAT, shifter interface, valved mufflers, and nitrous SSR planning.
- Corrected the example flex-fuel signal route to the DT8 CAN/control branch pin mapped as DIN5, and changed the flex sensor supply branch to the switched fuse-box output with sensor-spec verification noted.
- Added explicit TBD notes for uncertain sensor types/channels, SSR model, auxiliary fuse feed, and high-current wiring. Example remains a planning model, not a production-ready harness.


## v0.3.0 — 2026-10-23
- Added live wire screening to the wire inspector: estimated length, voltage drop, percentage drop, approximate resistive loss, and warnings for missing current/fuse details.
- Added the E90 example’s battery-positive, starter B+, alternator B+, engine-ground and trunk-ground topology as planning-level wire runs.
- High-current example runs explicitly retain TBD gauge/protection/current values; the app does not imply these are engineered or safe.
- Updated version label and release notes.

## v0.2.0 — 2026-10-23
- Added an Electrical Checker tab to the main Harness Bench navigation.
- Added approximate copper-wire voltage-drop, load-voltage and wire-loss estimates.
- Added screening warnings for voltage-drop target and fuse/load current comparison.
- Added visible app version and creator credit footer.
- Added this changelog to begin tracking future releases.

## v0.1.0 — baseline
- Existing Harness Bench app with drawing, connector catalog, wire/cut lists, pinouts, Harness Book, parts list, checks, build tracker, notes and backup.

## Notes
Version numbers use a simple semantic pattern: patch for fixes, minor for new backward-compatible features, major for substantial breaking changes. The Electrical Checker is a screening aid only; it does not validate ampacity or certify circuit safety.
