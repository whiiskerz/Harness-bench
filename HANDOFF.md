# Handoff: first five minutes + manufacturer export

Branch: feature/first-five-minutes. Test: tests/first-five-minutes-browser.cjs (iPad 1024x768 touch, reloads, downloads PDF + CSV).

## New on the main canvas
- Blank project shows "Add your first connector": search, chips (RACE pigtails, bulkhead, injector, coil), "My own housing" (P/N + cavity labels).
- Connector panel: Name + Housing P/N + Duplicate (INJ1 -> INJ2). Cavity search (J4, AIN 4). Run wire. Continue from mate (bulkhead other side, or DT mate).
- Step bar: Place, Make wires, Bundle into loom, Breakout + measure, Export for manufacturer.
- Tap a cable run -> "Cable run: length + breakout".
- Export for manufacturer (header + tab): drawing PDF + wire CSV. Lengths = user-entered only (wire length = sum of entered run lengths, else TBD). Unknown P/N, AWG, color, unverified mate mapping go to the TBD list.

## Needs manufacturer confirmation (TBD)
- Injector and coil housings (inj2, coil3) have no part numbers or pin functions yet.
- DT mate cavity mapping assumed 1:1. MaxxECU Molex numbers.

## Not done
- Select several wires and bundle only those (Bundle currently routes every unrouted wire).
- PDF drawing labels can overlap on very short runs.
- Parts library expansion, splice action, circuit test, Loomwright rename/logo/docs.

## v0.32.0-library (universal dashboard + parts library)
- `wireforge-library.js` (`WF_LIB`): 12 part categories (`catOf`, `search`), personal library in localStorage key `wfPersonalLib`, cavity text parser (`A=Function` per line or commas), generic templates (parts + cable runs only; no wires/lengths invented).
- Studio start screen is a dashboard: Blank, Open (vault), Import project, Import CSV, Templates, Demos. Header `Home` button reopens it on any project.
- Parts panel and start screen both search by text + category. Custom parts (name, category, optional P/N, cavities with functions) can be saved to "My library" and are copied into the project (`S.wfCustom`) when placed.
- "Wiring and cable" and "Harness protection" categories have no catalog parts yet (wire specs live in the wire editor).
- Test: `tests/dashboard-library-browser.cjs` (chained in workspace-smoke).
