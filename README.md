# Harness Bench — E90 LS Example

Standalone browser-based wiring harness planner. Open `index.html` locally or publish the folder with GitHub Pages.

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
