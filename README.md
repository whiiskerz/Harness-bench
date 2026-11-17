# Harness Bench — E90 LS Example

**Current version:** v0.4.0 · **Built by:** @whiiskerzbuilt

See [CHANGELOG.md](CHANGELOG.md) for release history.


Standalone browser-based wiring harness planner. Open `index.html` locally or publish the folder with GitHub Pages.

## v0.2.0 additions
- Added Electrical Checker as a tab in the main navigation (no separate URL needed).
- Added a version/creator footer and `CHANGELOG.md`.
- Electrical Checker estimates voltage drop, load voltage and wire power loss from entered values. It does not validate ampacity or certify safety.

## Update 7 additions
- **Harness Book** tab with editable circuit/connector records seeded from owner-confirmed DT6 → three DT2 → MaxxECU details.
- Records for the six DT6 circuits, DT2 cavity assignments, ECU termination cavities, shared sensor +5V/ground splice notes, and paired valved muffler motors.
- Search across records, add/delete records, CSV copy/export, print register, and restore starter records.
- Records are stored in browser project state and included in JSON backups.
- Valved muffler topology documented as joined positives and joined negatives, one outgoing wire per polarity, original controller bypassed, Motor 2 controlled from CAN keypad per owner. Output current, protection, wire gauge and route remain explicitly unverified.

## Use
1. Back up your current project from the Backup tab before replacing the deployed file.
2. Replace `index.html` in the GitHub repository with this version and commit.
3. Refresh the GitHub Pages site. If an old version remains cached, try a private tab or hard refresh.
4. Open **Harness Book** to inspect/edit the new records. Use Backup to export the whole project as JSON.

## Important
This is documentation and design software, not a certified electrical design. Confirm connector face/orientation, cavity numbers, manufacturer specifications, output ratings, fuse placement, wire sizing and circuit behavior before fabrication or energizing. MaxxECU low-side outputs are control signals, not load power supplies. Keep ECU sensor ground separate from chassis ground.


## v0.3.0 updates

- Selecting a wire now shows a live, preliminary voltage-drop and resistive-loss estimate in the inspector. It uses the drawing length estimate unless a measured length is entered.
- The E90 LS example now sketches the battery, starter, alternator and major ground connections as a topology reminder. High-current sizing, protection and termination remain marked TBD and must be engineered/verified before use.
- App version and creator credit: **Built by @whiiskerzbuilt**.

The screening calculations are educational aids only; they do not certify wire ampacity, fuse coordination, connector ratings, or vehicle safety.


## v0.4.0 updates

- **Circuit Audit:** per-wire missing information flags, endpoint connector/pin labels, review status and notes, jump-to-wire inspection, and CSV export.
- **Editable work zones:** drag Engine bay / DME box / Cabin / Trunk zone outlines, resize from the lower-right handle, and edit their names, colors, and dimensions in the inspector. Add or delete custom zones.
- **Expanded E90 example:** includes fuel-pressure and A/C-pressure sensor placeholders, oil-pressure / CLT / IAT placeholders, flex-fuel signal routing, valved muffler Motor 2 endpoints, and nitrous SSR planning.
- Sensor connector pinouts, temperature-input setup, SSR compatibility, auxiliary fuse feed, high-current sizing and protection remain to be verified against the actual installed hardware.


## Physical Formboard (branch preview)

Open **Physical Formboard** in the core workspace. Generate a draft from the active schematic, or place connectors and junctions manually. Connect nodes to build a physical tree; drag nodes to arrange it. Select branches to enter measured length in inches, sleeve type and inside diameter. Split a branch to create another breakout (remeasure both replacement branches). Select a wire to highlight its entire physical path.

The formboard is stored in the same project JSON and browser vault. It does not change electrical connectivity or overwrite manually entered wire lengths. Cut lengths are calculated only when all segments on a route are measured, using the sum of branch lengths plus two end allowances and any service-loop allowance. The Production Studio export uses a complete formboard route if a manual wire length is absent. Wire and sleeve material exports include the configured waste factor. Estimated bundle diameters are advisory; verify insulation OD, packing, fit, bend radius, and connector backshells before fabrication.

The generated tree is a starting draft ordered by schematic placement, not a measured E90 routing plan. Same-component leads require separate measurement. Separate physical trunks may be drawn as separate trees. The tool intentionally prohibits cycles to keep routing unambiguous.

Inspired by the schematic/physical-layout workflow of [Twisted Builds Harness Designer](https://github.com/twisted-builds-llc/Twisted_Builds_Harness_Designer) (GPLv3-or-later); this browser-native implementation does not incorporate its source code.
