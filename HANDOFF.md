# HANDOFF

**Branch:** `feature/formboard-wire-workflow` (Phase 2, PR #40). Phase 1 pigtails merged in #39.

## What works
- Tap a connector in Design: compact cavity picker (function + Open / Used / Loose lead). Tap a cavity, **Run wire**, tap the destination connector, tap its cavity. Mouse users can also drag a cavity onto another connector.
- Wire editor: ID, circuit, color, stripe, gauge, measured length, from/to connector and cavity (used cavities blocked), swap, delete, trace.
- Separate DT04-4P receptacle and DT06-4S plug parts. Set **Mated with** on either half: cavity n joins cavity n, adds no wire to the cut list, and the wire editor shows the chain across the mate (also joins nets in the compat checker).
- Landing a MaxxECU pigtail lead uses the same flow and reuses its function/color data, no duplicate.
- Cut list page shows endpoints, gauge/color and measured length. **Wire schedule CSV** adds connector instance, cavity, side, contact (TBD if unknown), covering.
- Loom inspector lists each wire and where it exits.

## Passed
`tests/wire-workflow-browser.cjs` (iPad touch, blank project, relay 30 to DT04-4P cav 1, DT06-4S cav 1 to device, mate trace, reload, CSV rows, loom measurements survive moving a connector, C1 AIN 4 landed, H3 left loose), node tests, workspace smoke (E90 still 59 parts / 94 wires), e90 blueprint, pigtails.

## Not done / unverified
- DT cavity face orientation and mate drawing: labeled "confirm on Deutsch drawing". Contacts stay TBD.
- Tapping a wire on the canvas to select it (use the connector's wire list for now).
- Broader visual redesign, catalog expansion.

## PR (tap wires and hardware art)
- Tap any cable on the canvas: one wire opens its editor, several open a picker (ID + endpoints). Selected wire and its continuation through the mate highlight. Empty tap dismisses, drag pans, pinch zooms. Camera refits so the route stays visible beside the inspector.
- Distinct relay-in-socket, DT04-4P (teal, pins) and DT06-4S (orange, sockets) art. Short node labels.
- DT source check (TE DT06-4S product page, Deutsch DT Series catalog): confirms 4-way, size 16 contacts, the pair mates. Cavity view (mating face vs wire entry) and cavity-to-cavity map NOT stated, so shown as ASSUMPTION in the inspector and the schedule CSV (column Mate assumption).

## Next exact task (earlier)
Tap-to-select wires on the canvas (24px+ hit area), then bigger relay/DT part art with cavity numbers on the body.
