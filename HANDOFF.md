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
