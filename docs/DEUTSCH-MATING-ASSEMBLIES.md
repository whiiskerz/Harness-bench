# WireForge v0.25 — Deutsch full mating assemblies

## What's new

The existing 3D renderer only modeled one housing per schematic connector. The updated renderer creates two separate halves:

- Half A: schematic-defined housing contacts (plug/receptacle as indicated by owner entry or inferred reference role), mating face and rear grommet exits. Its existing wires are driven by actual 2D schematic records.
- Half B: opposing housing, complementary socket/pin concept, latch, keyed insert, wedge lock, rear seal and individual cavity-specific exits. Its conductor records are stored **independently** from Half A.
- Mated or exploded view; visible mate pigtails can be turned off independently. PNG and GLB exports include the geometry.

The dual housing does not mean a purchased or crimped mating half exists. Half B uses *planned* leads derived from the schematic where no user data is entered. This is an illustration to help plan both sides, not a wiring report claiming completion.

## Engineering data model

Each assembly has its own housing part numbers and cavity records under the saved project's dtAssemblies field. The matrix records:

- Side A: schematic circuit, gauge and color.
- Side B: planned, owner-confirmed, unassigned or sealed, plus destination, color, gauge, contact PN, seal PN and evidence.
- 8/12-way key letter; connection family and cavity count; actual housing pair references.

Owner-confirmed status is only allowed with both parseable mating housing PNs, a destination, a contact PN and a written evidence reference; mismatched roles/genders/keys are rejected. That is **owner-provided evidence**, not manufacturer certification or an electronic test of a crimp.

Project Vault persists this data with the rest of the harness. The A/B matrix exports as CSV. The Validation Lab shows unconfirmed mating tails, incorrect housings and out-of-family wire gauges.

## Manufacturer reference / physical limitations

TE Connectivity's publicly published DT catalog describes size-16 contacts, standard 14–20 AWG conductor range and 2/3/4/6/8/12 cavity inline formats; common DT04-6P receptacles use pin contacts and mate to DT06-6S socket-contact plugs. DTM uses size-20 contacts and nominal 16–22 AWG, while DTP uses size-12 contacts and nominal 10–14 AWG (2/4-way).

- https://www.te.com/en/products/connectors/automotive-connectors/intersection/deutsch-dt-series-connectors.html
- https://www.te.com/en/products/connectors/automotive-connectors/intersection/deutsch-dtm-connectors.html
- https://www.te.com/en/products/connectors/automotive-connectors/intersection/deutsch-dtp-connectors.html
- https://www.te.com/content/dam/te-com/documents/industrial-and-commercial-transportation/global/dt-inline-catalog.pdf

The illustrative 3D geometries are **not** actual TE STEP/CAD models and must not be used to size tools, inserts, seals, clips, boots, mounting clearances or bend limits. Physical cavity numbers may be mirrored by front vs rear viewing orientation; follow the exact manufacturer's drawing for the actual part number. Verify insulation OD/seal range, contact part and appropriate crimp tooling. A successful schematic inspection is not evidence that the real harness passes continuity, voltage drop, insulation or load tests.

## Quality gates

- Node pure-model assertions for housing pair roles, keys, counts, gauge limits, and owner confirmation.
- Chromium visual smoke tests for independent A/B terminations, blocked false confirmation, CSV export, save/restore, Lab findings, 3D mate cavity uniqueness, mate pigtail origins, exploded spacing and mobile layout.
- Existing 3D/export, electrical, production, workspace and blueprint smoke tests remain required.
