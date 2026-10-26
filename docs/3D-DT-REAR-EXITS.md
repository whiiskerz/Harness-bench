# WireForge v0.22 — Deutsch Wire-Side Exit Geometry

The 3D renderer now uses **one discrete rear terminal-exit position per connected Deutsch-style cavity**. Each wire begins at its populated rear seal aperture, travels away from the housing along the rear tangent, then converges toward the incoming diagram route. The old common-center exit calculation has been replaced.

## What is new
- DT / DTM / DTP-style procedural connector models rotate toward connected diagram paths, with a **front mating face** and an opposed **rear wire-side face**.
- Standard 2, 3 (triangular concept), 4, 6, 8, and 12-cavity layouts get separate indexed positions. This is a **visual arrangement and terminal index match**, *not a manufacturer-certified pin-number mapping*.
- Per-cavity rear elastomer seals, populated-wire color rings and illustrative plugs for unpopulated cavities.
- Rear shell shrouds stay open to reveal the wires. Individual pigtail guides enforce a short straight outward exit, staggered bend stiffness by entered AWG, and gradual convergence toward a loom.
- A **WIRE SIDE** camera preset aims toward the selected (or first) Deutsch rear face; selectable cavities display available assignment metadata.
- Automated geometry tests verify index uniqueness, opposite-side mirroring, outward tangents, convergent fanning, stiffness behavior and invalid-coordinate rejection.
- Browser tests verify end-to-end wiring and that rendered wire endpoints land on the model's rear port coordinates (not somewhere near the center of the housing).

## Source references / why the model is still approximate
TE Connectivity documents the DT family in common 2/3/4/6/8/12 cavity configurations. It specifies that each unused cavity requires a sealing plug to maintain environmental protection. Wedge locks fit at the mating interface, and the product family offers boots and backshell accessories. Standard DT wedge locks are often green depending on part number and keying variant. Exact rear wire-side cavity numbering, terminal, wedge, cavity pitch, orientation and housing dimensions require the specific manufacturer drawing.

- TE **DEUTSCH DT Inline Connectors** catalog: https://www.te.com/content/dam/te-com/documents/industrial-and-commercial-transportation/global/dt-inline-catalog.pdf
- TE **DEUTSCH DT Color Connectors** information: https://www.te.com/content/dam/te-com/documents/industrial-and-commercial-transportation/global/ict-deutsch-DT-ds-a4-en-0224.pdf
- TE **DEUTSCH DT Receptacle Connectors** product family: https://www.te.com/en/product-CAT-J41-DDRC.html

## Engineering restrictions
- This is a renderer, not an electrical continuity or mechanical bend-radius validation.
- Snapshot terminal-index **i** is matched to the renderer's terminal-array **i**, but this does not prove the physical molded cavity number is correct. Import a verified TE connector model and rear-view cavity numbering before releasing manufacturing documentation.
- Visual rear plug geometry does **not** mean physical plugs have been installed. User must check the actual build.
- Pigtail lengths and fanout are controlled by a *diagram-space slider*, not inches or mm. Do not infer cut length from mesh lengths.
- Where the current project stores no connector gender or part number, the software deliberately labels it Deutsch-style rather than claiming a specific DT06- or DT04-series housing.
- Additional physical harness centerline tracing, populated cavity geometry, and actual part-number CAD models remain future work.
