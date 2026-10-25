# WireForge engineering overhaul roadmap

## Phase 1 — v0.18 preview (this pull request)
- Add editable physical harness branch records with optional loom IDs, measured lengths and diameters.
- Add a non-destructive routing review highlighting close endpoints and manually routed wires.
- Export wire cut-list review CSV with measured vs drawing-derived length clearly distinguished; cut lengths deliberately blank until allowance is specified.
- Export MaxxECU pin schedule from currently connected project wires; require physical connector verification.
- Export validation review CSV with missing endpoints, circuit labels, colors, fuse/load comparison and length provenance.

## Phase 2 — routing engine
- Orthogonal obstacle-aware rerouting after component moves, deterministic lane spacing, crossing penalties and route regression tests.
- Verify routes with complex E90 examples before enabling by default.

## Phase 3 — physical harness builder
- Editable Y-branches, breakout positions, trunk/bundle paths, segment lengths and wire membership.
- Integrate branches with the drawing and production estimates.

## Phase 4 — connector designer and MaxxECU integration
- User-defined connector definitions, cavity mapping and contact metadata.
- Verified source pinout imports, connector orientation, visual assignments and pin conflict checks.
- Keep manufacturer-verified cavity positions separate from schematic approximations.

## Phase 5 — manufacturing
- Measured cut lengths, user-entered service allowances, labels, splice sheets, connector tables, BOM and printable assembly sheets.
- Explicit provenance for dimensions and parts.

## Phase 6 — validation and release
- Connectivity graph checks, circuit type and power/ground compatibility, CAN termination review and electrical limits.
- Unit and browser regression tests, save/load compatibility and release documentation.
- Electrical checks are advisory; not safety certifications.

## Scope limits
Phase 1 does not deliver automatic collision-free routing, physical branch rendering, a full connector designer, or verified MaxxECU pinouts. Do not cut or energize a harness solely from generated reports.
