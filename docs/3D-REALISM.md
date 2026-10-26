# WireForge v0.21 Hardware Realism Pass

## User-facing changes

**3D studio**
- A consistent graphite and ice-blue production UI with improved studio lighting, clearer controls and hardware-focus shortcuts.
- Procedural **Deutsch-style** DT/DTM/DTP connector shells: molded housing, wedge-lock coloration, keyed latch, rim seals, rear grommet, wire-exit boots and cavity markers.
- **Leash-style relay board** visual concepts: black high-current relay modules, molded tray, mounting ears, brass studs and low-current spade terminals. These are styled after the general real-world form, not exact board CAD or terminal locations.
- Relay and socket visuals, generic ECU housings, and distribution hardware, built from component categories already in the editor.
- Cable radius influenced by entered AWG, glossy insulation, optional color tracer stripe, paired twisted wire preview, terminal-to-route pigtail transitions, representative woven-style sleeve materials, molded collars and sleeve breakouts.
- Hide or show wire tracer and twisted-pair detail and adjust render-only pigtail length. Zoom to Deutsch, Leash, relay, or ECU from sidebar.
- Actual wire color tokens remain directly linked to the project data. The theme changes do not recolor insulation.

**Editor**
- Shared Blackglass theme gives Harness Designer / Production Studio the same neutral visual language as the 3D tool.
- Light mode remains available as an explicit theme option.

## Critical engineering limitations

- These are schematic-derived **illustrative procedural models**, **not manufacturer-verified CAD**. Housing dimensions, latch geometry, wedge indexing, and cavity arrangements are not claimed to be exact.
- A green or orange wedge is a visual cue, not an authoritative variant selector. Confirm actual wedge model and color from TE Connectivity documents.
- The Leash board mockup is **not a reproduction** of a named Leash PCB design, fuse assignment, stud numbering, electrical layout, or mounting drawing. Supply an actual module part number and measured geometry before generating production-accurate boards.
- Rendered pigtails, bends, tubing diameters and sleeve transitions are stylized and use diagram coordinates. They do not determine cut lengths, minimum bend radii, contact and cavity sizing, or harness safety.
- Twisted-pair depiction is for visualization, not a specification of electromagnetic performance or twist pitch.
- Production documentation remains driven by verified user-entered physical measurements and electrical data, not by geometric measurements on these rendered meshes.

## Automated verification

The existing 3D Playwright/Chromium workflow verifies launch from the editor, modeled Deutsch/Leash/relay instances, colored wires and sleeves, lens and model-focus controls, tracer/twist controls, PNG and binary GLB exports, and mobile viewport sizing. The workflow archives rendered desktop/mobile screenshots for design review. Node syntax checks include both new modeling modules.

## Technical structure

- `render3d-hardware.js`: parametric component geometry and render-space terminal ports, differentiated by declared part category.
- `render3d-wiring.js`: cable materials, optional tracer runs, paired strands and sleeve transitions.
- `render3d.js`: viewport, project snapshot, shader/material composition, selection, camera and export.
- `render3d.html`: responsive UI and controls.

The code uses Three.js through the existing jsDelivr import map; the CI smoke workflow substitutes a pinned local Three.js dependency to remove CDN flakiness.

## Next engineering-grade upgrade

Use verified TE/Deutsch manufacturer 3D files or user-provided CAD, authentic Leash-specific photos/CAD and real part numbers; introduce measured branch centerlines and breakout endpoints. The preview should never auto-label a schematic-to-3D projection as a production-valid design.
