# Harness Bench — E90 LS / MaxxECU Race Gen 1 update

A standalone browser harness-planning app. Open `index.html` in a modern browser or publish the folder with GitHub Pages.

## Start here
1. Open the **E90 Project** tab.
2. Choose **Load E90 harness mock-up**. This replaces the current drawing, so use **Backup → Copy backup** first if you need to preserve an existing design.
3. Open **Mockup** to inspect the physical-style branch layout, **Pinouts** to see connector assignments, **Wire list** and **Cut list** for planning, **Parts list** for a preliminary BOM, and **Checks** for basic drawing checks.
4. Use **Backup → Copy backup** regularly. The app stores data in browser local storage; it does not automatically sync between devices.

## Included project-specific parts
- User-mapped DT12 power breakout, DT8 analog sub-harness and DT8 CAN/control sub-harness.
- Shifter DT4 and CAN keypad connectors.
- Owner-supplied six-position 8HP functional map: constant +12V, switched +12V, chassis ground, CAN Low, CAN High, sealed/unused. Physical cavity orientation and feed sizing still require verification.
- BMW DME X60001 interface view containing only the owner-supplied pins 7, 8, 20 and 38.
- Dual pump relay board, surge tank, switched fuse box, A/C relay, Leash single board, EKP trigger endpoint, CAN hub, flex-fuel sensor, nitrous SSR, Speedway self-exciting alternator, starter, battery and high-current junction.
- Project notes distinguishing owner-supplied mappings from items requiring verification.

## Important limits
This is a visual planning tool, not an electrical design approval. The 8HP six-position functional map is owner-supplied and not independently verified against a connector drawing; confirm connector face/orientation before crimping. The 8HP constant +12V feed is intentionally not routed until fuse rating, gauge and distribution path are selected. The MaxxECU/8HP/keypad CAN network is shown separately from BMW chassis CAN; do not bridge the buses without confirming protocol, bitrate, termination and controller requirements. The radiator fan interface and EKP-to-Leash trigger require electrical verification. High-current alternator/starter paths are deliberately not routed until cable sizing and protection strategy are confirmed. Sensor ground remains separate from chassis ground. Check connector mating-face orientation, terminal part numbers, wire gauge, current, fusing and OEM diagrams before building.

The mock-up's approximate placement and routing are for planning; actual branch lengths should be measured on the vehicle or fixture before cutting wire.

## Connector Studio (new)
The Connector Studio tab lets you select a component in the current drawing, attach a publicly reachable image URL or a relative image path from your repository, and label the image/pinout verification status. It generates a cavity index from the app's current pin catalog. **That index is not a manufacturer connector-face drawing**; confirm the actual part number, viewing side and pin numbering before fabrication. Image URLs and status labels are saved in the browser project backup.

For repository-hosted images, create `assets/` beside `index.html`, upload photos there, then enter paths such as `assets/dt12-front.jpg` in Connector Studio. Avoid hotlinking images from websites that may block embedding; prefer photos you own or manufacturer assets whose use is permitted.

## Update 3 — reference photos in Connector Studio

Connector Studio now includes a starter reference gallery for:
- Deutsch DT 12-way connector kit
- Leash Electronics dual 70A relay module
- Leash Electronics OG4 relay module
- Leash Electronics Street/Strip wiring board

Known component names may auto-populate a vendor reference image in the preview. These are online image URLs, so they require internet access and may change if the vendor changes its image URLs. They are reference photos, not confirmation of the exact part installed in the vehicle. Use the product links in the gallery to confirm the board/connector model.

### More useful current features
- Default reference photo selection for parts whose names match DT12/DT8 or Leash relay terms
- Gallery cards with source/product links
- Existing image URL override and per-part status labels remain available
- Cavity grids are still generated from the app's current pin data, not verified physical face diagrams

For a more reliable/offline image library, upload images you have permission to use into `assets/` and set each part's image path to a repository-relative path, such as `assets/dt12-front.jpg`.


## Update 4 — Build tracker and direct photo upload

- Added a **Build tracker** tab with staged planning, electrical review, assembly, and bench-test checklists. Progress is saved in the browser and included in the full JSON backup. This is a workflow aid, not a safety certification.
- Connector Studio now accepts a photo directly from an iPad/computer. The app resizes it to a maximum 1100 px edge and compresses it to JPEG before saving it in browser storage. Keep original photos in the GitHub repository as a separate backup; browser storage limits vary.
- Backup now exports the full app state, including connector photos/status and build checklist progress. Older partial backups remain loadable, but cannot restore data they never contained.
- Existing vendor-gallery images are still external URLs and require internet. The new upload option lets you use your own photo without hosting it first, on the same browser/device.
