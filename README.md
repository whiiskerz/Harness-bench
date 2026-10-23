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
