# Changelog

## Unreleased — v0.21.0 Blackglass + 3D hardware realism preview
- Replaced generic 3D component blocks with parametric Deutsch-style connector bodies, Leash-style relay module trays, conventional relay sockets, ECU enclosures and power terminal visuals.
- Added a more realistic insulation material pass: gauge-scaled wire thickness, tracer markings, visual twisted pairs, pigtail exit paths, braided / convoluted / shrink sleeve treatments and end collars.
- Added hardware focus shortcuts, adjustable pigtail transition lengths and tracer/twist toggles in 3D.
- Overhauled the 3D interface and main WireForge styling with a coordinated graphite / ice-blue Blackglass visual system while keeping wire identity colors independent from UI themes.
- Expanded browser smoke tests for component categories, cable geometry, GLB file validity and mobile viewport layouts.
- All geometry remains an illustrative, schematic-derived mockup; confirm actual connector cavity numbering, physical dimensions and relay-module terminals from manufacturer resources.

## Unreleased — v0.20.0 3D Harness Studio preview
- Added 3D Render launch actions in Harness Designer and Production Studio. 2D routing and connector-cavity metadata become a portable schematic-derived scene snapshot.
- Added a responsive interactive Three.js studio with orbit, pan, zoom, view presets, selection, component search, and visibility layers.
- Added generic 3D connector bodies with wire-colored cavities, 3D insulated wire paths and loom covering previews (braid, convoluted, smooth).
- Added render appearance controls, PNG export, GLB mesh export, and portable 3D scene JSON import/export.
- Added browser integration smoke tests, mobile viewport coverage and JavaScript syntax checks.
- Cleaned six obsolete E90 starter wires referencing removed ECU-connector instances; missing real breakout assignments remain unresolved rather than guessed.
- **Preview limitations:** scene geometry is schematic-derived, not manufacturer-dimensioned; sleeving uses representative member runs and does not yet map physical Y-branches; runtime requires WebGL and Three.js CDN availability. Generated meshes must not be treated as manufacturing dimensions.

## Unreleased — v0.17.0 editor overhaul (preview)
- Redesigned the drawing workspace header, action controls, and responsive editor dashboard.
- Added an on-demand structural wiring audit for invalid endpoints, shared cavities, missing circuit labels/colors, and entered load/fuse conflicts.
- Added 20px grid snapping for all components or the selected component, with undo integration.
- Added connector cavity/pinout CSV export and harness-bundle CSV export.
- Added selected-component lock metadata as a preview; drag enforcement is not implemented yet.
- Existing 90-degree routing, loom tools, and SVG/print exports remain available. Automatic obstacle-free rerouting, fully interactive bundle branches, and comprehensive validation remain future work.


## Unreleased — E90 wiring accuracy corrections
- Corrected each 4-port and 6-port CAN hub port to pin 1 CAN H, pin 2 CAN L, pin 3 switched 12V VDD, pin 4 GND.
- Kept the CAN hub as a planned library option and represented the installed 1-in / 3-out CAN1 DT twisted splitter in the E90 example.
- Removed separate MaxxECU 12-pin / 16-pin connector instances and their example pin-for-pin loops so the diagram centers on the terminated breakout side.
- Corrected BMW X126 A/C pressure to a signal-only tap on the black/white OEM wire feeding AIN7; removed extra power and ground branches from that signal tap.
- Split the trunk layout into left and right zones: surge tank and wiring/electronics on the left; OEM battery and nitrous bottle on the right plate/cubby.


## v0.16.0 — 2026-10-24
- Added a Power Budget workspace grouping wire segments by entered fuse/circuit label, reporting recorded current sums, known fuse ratings, and missing load/fuse data.
- Improved the E90 example's default wire paths with orthogonal, lane-separated routes to reduce diagonal crossings and make circuits easier to follow.
- Added downloadable Power Budget CSV and consolidated JSON project report with readiness findings, self-test results, project counts, circuit-book records, and documented limitations.
- Added live Wire List search across signal, endpoint, color, gauge and fuse metadata, plus filters for incomplete documentation and wires with entered current values.
- Preserved the distinction between an entered route length and a drawing-derived estimate when loading a wire into the Electrical Checker; applying current/gauge/fuse data no longer silently converts an estimated length into a measured one.
- Added explicit cautions that per-segment current sums may double-count loads and are not a substitute for fuse coordination, wire ampacity or safety validation.

## v0.15.0 — 2026-10-24
- Linked the Electrical Checker to the active drawing: load a selected wire's current, length, gauge and fuse values, then explicitly apply reviewed values back to that wire.
- Added reusable voltage-drop calculation logic, support for large copper gauges in the calculator, and an explicit warning when a loaded circuit has no fuse rating entered.
- Added in-app project self-tests for duplicate IDs, missing wire endpoints, pin-index validity, numeric wire fields, CSV quoting and a known voltage-drop calculation.
- Added a downloadable JSON readiness report and one-click JSON project backup.
- Validated backups before loading; malformed parts, duplicate IDs, missing endpoints, invalid pin indices and unknown connector types are rejected without replacing the active drawing.
- Added Node.js smoke tests and a GitHub Actions workflow to run them on pull requests and pushes to main.

## v0.14.0 — 2026-10-24
- Added a Project Readiness audit for duplicate part IDs, missing wire endpoints, invalid pin indices, incomplete wire documentation, and unresolved Harness Book records.
- Flagged the valved-muffler output assignment conflict instead of treating GPO13/GPO14 as verified: the supplied Race LS wiring reference maps Motor 2 +/− to 12-pin K/L and does not establish GPO13/GPO14 as the reversing pair.
- Added printable connector pinout sheets and direct CSV downloads for the wire list, cut list, pinouts, and Harness Book.
- Kept unknown physical cavity numbers, ECU output availability, fuse hardware, current ratings, and wire routing explicitly unresolved.

## v0.13.0 — 2026-10-24
- Reworked the E90 trunk starter topology around one trunk-side DT6 feeding three cabin DT2 branches; removed the assumed cabin-side DT6.
- Updated the starter wire map for the owner-confirmed Leash dual-board pump assignments, 10 AWG red pump feeds, 40A board fuses, A+ to B+ control-power jumper, and separate ECU-side DT2 runs.
- Marked unknown DT6 cavity mapping, trunk fuse slots/ratings, main fuse hardware, EKP terminals, starlights branch path, conductor count, and wire lengths as unverified rather than assigning guessed values.
- Expanded the Harness Book with the approved trunk power, ground, Leash board, heater, starlights, fuse-box, and boundary-count records.
- Updated valved-muffler documentation to reflect paired motors on MaxxECU polarity-reversing outputs and removed the unsupported trunk fuse-box power/ground assumption.

## v0.12.0 — 2026-10-24
- Added direct wire routing by dragging a wire segment: dragging the visible wire creates or repositions a bend/waypoint; normal clicks still select the wire.
- Reuses the existing selected-wire waypoint handle and preserves the wire's endpoints and electrical properties while routing.

## v0.11.0 — 2026-10-24
- Added a dedicated Delete all wires button in the drawing toolbar. It asks for confirmation and removes wires only, preserving parts, connector pinouts, zones, and loom definitions.
- Cleans up active wire selection and CAN wire-pair mode after clearing.

## v0.10.0 — 2026-10-24
- Added physical, pinout-backed MaxxECU Gen1 RACE 48-pin main Molex and 32-pin black Connector 2 parts to the Parts Library and drawing canvas.
- Rendered ECU cavities as a 4-column connector grid with cavity/function labels and clickable wire pins; library search now matches pin names and functions.
- Reorganized Parts Library into compact collapsible categories focused on Gen1 RACE, HD30 shell-size-24 inserts, Maven circular connectors, Deutsch DT, and useful power/sensor/E90 components.
- Removed generic custom bulkhead and custom connector builders from the visible catalog, and hid legacy generic 12-/16-pin ECU parts from the catalog while retaining their definitions for existing projects.
- Clarified Maven single/dual configurations and removed the inaccurate fixed shell-size label from dual Maven configurations.

## v0.9.0 — 2026-10-24
- Reworked Loom Studio into an editing workspace: drag parts, manage loom covers/colours, assign wires to sleeves, and edit gauge/current/fuse inputs.
- Added a trunk-to-cabin DT6 six-core example: pins 1–6 carry GPO2, GPO3, GPO7 heater-relay trigger, AIN2 pressure signal, +5 V and sensor ground, with three cabin DT2 pigtails.
- Kept the Leash dual board dedicated to fuel-pump A−/B− triggers; GPO7 now drives a separate heater relay terminal 85. The heater contact fuse rating and load-wire gauge remain explicitly TBD.
- Reorganized the E90 example into vehicle zones and added a re-layout control.
- Expanded Test Sim / wire audit checks for fuse-to-wire ampacity mismatch, load-vs-fuse mismatch, missing current data, and voltage drop. These remain rough design-screening checks, not certification.

## v0.8.0 — 2026-10-24
- Added a dedicated MaxxECU RACE pinout reference workspace for the supplied 48-pin main connector and 32-pin black Connector 2.
- Added V1/RACE/PRO, STREET and SPORT variant selection, searchable cavity maps/tables, cavity selection, and CSV export.
- Pin data is transcribed from user-provided notes; connector maps are schematic and require verification against official documentation before wiring.

## v0.7.0 — 2026-10-24
- Rebranded the app UI to **WireForge** while retaining the Harness-bench repository and creator credit.
- Replaced the wide horizontal tab strip with grouped workspace navigation on desktop and compact horizontal navigation on small screens.
- Renamed the physical mockup workspace to **Loom Studio**.
- Added an early **Test Sim** preview: editable per-wire simulated loads, supply voltage / engine-running mode, fuse and wire-rating flags, and estimated two-way copper voltage drop.
- Test Sim is a screening model, not a circuit solver. It does not yet model electrical connectivity, relay behavior, battery sag, thermal fuse curves, moving current, virtual meter or scope.
- JavaScript syntax validation passed; browser visual and interaction testing is still required.

## v0.6.0 — 2026-10-24
- Rebuilt the Add Part library as a searchable visual catalog with connector-face previews, pin counts, family filters, and contact-size summaries where available.
- Added expandable pinout tables showing order number, pin ID, function, and contact size for catalog parts.
- Added schematic mating-face and mirrored wire-side previews in Connector Studio for regular connectors as well as circular bulkheads.
- Updated the in-app version display and application version constant to v0.6.0.
- Visuals remain schematic unless explicitly verified against the exact manufacturer drawing; generated layouts are not fabrication cavity maps.


## v0.5.1 — 2026-10-24
- Replaced crowded circular pin labels with compact per-insert order numbers inside the cavity markers.
- Added a readable pin-order table showing order number, pin ID, contact size, and function/label in the inspector and Connector Studio.
- Clarified that the order numbers are a navigation aid only and do not represent verified manufacturer cavity numbering.


## v0.5.0 — 2026-10-24
- Added DEUTSCH HD30 shell-size-24 insert presets for 24-9, 24-21, 24-14, 24-23, 24-7, 24-19, 24-16, 24-29, 24-18, and 24-31.
- Added circular schematic cavity layouts with contact-size-dependent cavity diameters.
- Added adjustable dual-bulkhead side-by-side/stacked layout and mating-face/wire-side mirrored view controls.
- Added a circular insert preview to Connector Studio.
- Cavity numbering is schematic only until verified against the exact manufacturer insert drawing; do not use it as a fabrication pin map.


## v0.4.0 — 2026-10-23
- Added a Circuit Audit table with per-wire missing-data flags, direct connector/pin endpoints, review status, review notes, jump-to-wire inspection, and CSV export.
- Added wire review statuses: Draft, Needs verification, and Verified. “Verified” is a manual review label and does not certify safety.
- Made E90 drawing work-area zones (Engine bay, DME box, Cabin, Trunk) draggable and resizable. Zone name, color, dimensions, and deletion are available in the inspector; custom zones can be added.
- Added additional E90 example components for fuel pressure, A/C pressure, oil pressure, CLT, IAT, shifter interface, valved mufflers, and nitrous SSR planning.
- Corrected the example flex-fuel signal route to the DT8 CAN/control branch pin mapped as DIN5, and changed the flex sensor supply branch to the switched fuse-box output with sensor-spec verification noted.
- Added explicit TBD notes for uncertain sensor types/channels, SSR model, auxiliary fuse feed, and high-current wiring. Example remains a planning model, not a production-ready harness.


## v0.3.0 — 2026-10-23
- Added live wire screening to the wire inspector: estimated length, voltage drop, percentage drop, approximate resistive loss, and warnings for missing current/fuse details.
- Added the E90 example’s battery-positive, starter B+, alternator B+, engine-ground and trunk-ground topology as planning-level wire runs.
- High-current example runs explicitly retain TBD gauge/protection/current values; the app does not imply these are engineered or safe.
- Updated version label and release notes.

## v0.2.0 — 2026-10-23
- Added an Electrical Checker tab to the main Harness Bench navigation.
- Added approximate copper-wire voltage-drop, load-voltage and wire-loss estimates.
- Added screening warnings for voltage-drop target and fuse/load current comparison.
- Added visible app version and creator credit footer.
- Added this changelog to begin tracking future releases.

## v0.1.0 — baseline
- Existing Harness Bench app with drawing, connector catalog, wire/cut lists, pinouts, Harness Book, parts list, checks, build tracker, notes and backup.

## Notes
Version numbers use a simple semantic pattern: patch for fixes, minor for new backward-compatible features, major for substantial breaking changes. The Electrical Checker is a screening aid only; it does not validate ampacity or certify circuit safety.
