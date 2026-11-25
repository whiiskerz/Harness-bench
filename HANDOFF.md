# HANDOFF

**Branch:** `feature/maxxecu-pigtails` (Phase 1). Merge, then start Phase 2 from latest `main`.

## What works (Phase 1: MaxxECU Race Gen1 pigtails)
- Two parts-picker templates: `mxpig48` (C1, 48-pin) and `mxpig32` (C2, 32-pin black). Every cavity is a loose lead.
- Flying Lead Workbench (`#flying-leads`) has a **Find a lead** box: `J4`, `AIN 4`, `trigger`, `EGT 3+`. Pin-style searches (`J4`) match the cavity only.
- Selecting a lead shows ECU function, wire color/size, contact, twist/shield group, status and Molex reference.
- Land a lead on a bulkhead cavity. It shows in the schematic, wire schedule and CSV. Loose leads stay loose. Both survive reload.
- Data: `wireforge-pigtails.js`. Each fact is tagged official / owner / tbd.

## Verified vs not
- Verified (MaxxECU RACE REV9+ wiring PDF): trigger wire black, home/cam wire grey, shields grounded only through the ECU, sensor GND never to chassis, knock sensor part and polarity, EGT needs K/N thermocouple parts.
- Owner-supplied: Molex housing/cover/contact numbers (not found in the MaxxECU docs reachable; need confirming), CAN H grey / L pink convention, C1/C2 cavity tables.
- **Not verified:** which contact goes in which cavity, wire sizes, cavity face orientation, crank/cam twist and shield build, exact cold-junction note wording (no prior note existed in the repo). All shown as TBD.

## How to test
`python3 -m http.server 8765`, then `NODE_PATH=<playwright> node tests/pigtails-browser.cjs` (also runs inside `tests/workspace-smoke.cjs`). It runs at 390px wide.

## Next exact task (Phase 2, start small)
Parts library records: add a record shape `{mfr, pn, series, category}` and a search box in the picker. Convert the two pigtail templates and the Molex numbers into records first. The same record must be used for placing, cavity assignment and BOM.
