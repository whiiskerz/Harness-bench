# Handoff (checkpoint: relay pigtails, Loom/Individual wires, breakouts)

Branch: feature/loomwright-assembly

## Passed (tests/branch-harness-browser.cjs, iPad touch)
- 4/5-pin relay+socket pigtails: each lead selectable, lands on a DT cavity, unused leads markable.
- Loom / Individual wires toggle. Same harness, IDs, lengths and covering kept in both views.
- Breakouts: right-click or 520 ms long-press menu; Add breakout splits a segment, flags both new pieces "needs measure"; drag moves only conductors, wire lengths stay.
- Reload keeps wires, unused lead, breakout and flags.
- Wire schedule CSV: both ends per wire; L30 = "Supplied lead", M30 = "Cut wire".
- E90 project still loads (59 parts / 94 wires).

## Where to tap
- Long-press or right-click a segment: Add breakout / Mark unused.
- Top toggle: Loom | Individual wires. Tap a wire in Individual view for its editor.
- Tap near a lead tip selects the lead, not the wire; tap mid-wire.

## Needs manufacturer confirmation (TBD)
- DT04-4P / DT06-4S cavity view and 1:1 mate mapping (assumed, shown in exports).
- Relay socket lead gauge/colors, MaxxECU Molex numbers and contact map.

## Not done yet
- Add electrical splice action, true wire choice per branch.
- Five parts: Leash 1HO, Dual 70X, Big Dog 1, RIFE SSR, P3 BMW E9X gauge.
- Complete-circuit test + electrical checks.
- Loomwright rename, logo, docs page.
