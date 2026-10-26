# WireForge 3D Harness Studio — v0.20 preview

## Overview
Interactive WebGL 3D harness mockup generated from the current 2D harness drawing. Not a dimensionally verified manufacturing CAD model.

## Open
From Harness Designer or Production Studio choose **Render 3D**. WireForge resolves existing diagram routes and places a portable snapshot into local browser storage before opening the renderer. Use Back to editor to return.

## Features
- Orbit, zoom and pan, including touch gestures on phones.
- ISO, TOP, FRONT, SIDE camera presets and FIT.
- Toggle connector housings, wire runs, loom jackets, labels and grid.
- Generic 3D connector bodies with cavity markers showing connected wire colors.
- Loom coverings as textured tubes: braid, convoluted tubing, or smooth heat shrink.
- Select/search components and wire runs; view circuit details.
- Save PNG renders, GLB 3D meshes, and portable JSON scene files; import saved JSON.

## Geometry provenance
The bridge samples cubic segments produced by the existing editor's geo(w).segs path. Connector housing dimensions are visual approximations based on cavity count, not manufacturer models. Wires start from the corresponding component body and follow the schematic routing. Loom coverings use a representative member wire centerline. User-entered lengths appear as annotations only. Branch quantities from Production Studio are counted but physical 3D branch coordinates are not established.

## Safety and scope
Do not use exported mesh geometry or measured image distance to cut, terminate or certify a harness. Verify housing dimensions, cavity assignments, bends, bundle composition, current and safety margins independently.

This preview fetches Three.js via jsDelivr and requires WebGL + network connectivity. Projects and generated snapshots remain in browser local storage unless exported. Large scenes can exceed mobile graphics capacity.

## Release verification
Automated smoke workflow checks editor-to-renderer launch, geometry transfer, controls and PNG/JSON exports. GLB decoding, mobile compatibility and exact visual quality still require additional manual validation.

## Next iterations
- Edit 3D branch points, Y-splits, lengths and breakout sleeves.
- Load manufacturer-verified STL, GLB or STEP-converted connector models.
- Clamp, splice, grommet, label and strain-relief objects.
- Dimensioned physical routing separate from schematic wire lengths.
