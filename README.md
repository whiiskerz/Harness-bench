# Harness Bench — E90 LS Example

**Current version:** v0.2.0 · **Built by:** @whiiskerzbuilt

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
