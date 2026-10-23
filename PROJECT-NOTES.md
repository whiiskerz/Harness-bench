# E90 LS harness map — source notes

## DT12 power breakout
1 Yellow — ignition coils +12V
2 Engine ground — wire color not specified
3 Green — GPO2 fuel pump 1 (surge 535)
4 Purple — GPO6 A/C compressor clutch
5 Blue — GPO3 fuel pump 2 (surge 525)
6 Black — starter input
7 Red — ECU switched +12V
8 blank — GPO8 tach output
9 blank — GPO15 +12V output
10 blank — H-bridge motor 2 +
11 blank — H-bridge motor 2 −
12 blank — alternator excite (not used; self-exciting alternator)

## DT8 analog sub (DT16 pins 1–8)
1 Red +5V sensors; 2 Black MaxxECU sensor ground; 3 Green paddle resistor AIN1; 4 blank AIN2 spare; 5 Yellow fuel-pressure signal; 6 Blue A/C-pressure signal; 7 blank spare DIN/GPO; 8 Purple radiator fan PWM / GPO5.

## DT8 CAN/control sub (DT16 pins 9–16)
1 Pink/Purple CAN Low; 2 Grey/Blue CAN High; 3 Black brake DIN1; 4 Blue shifter input 1; 5 Black shifter input 2; 6 Yellow flex-fuel DIN5; 7 Purple nitrous GPO4 to SSR; 8 blank spare.

## Sub-harnesses and vehicle interface
- Flex fuel: yellow signal wire.
- Shifter DT4: pin 1 blue input, pin 2 black input, pin 3 brown/green ground, pin 4 spare.
- CAN keypad: CAN Low, CAN High, switched +12V, ground.
- 8HP six-position functional map (owner supplied): pin 1 constant +12V; pin 2 switched +12V; pin 3 chassis ground; pin 4 CAN Low; pin 5 CAN High; pin 6 sealed/unused. Confirm connector face/orientation before assigning physical cavity numbers.
- Nitrous: GPO4 trigger to SSR then solenoid; future purge, bottle heater/opener and pressure sensor.
- BMW DME X60001 as supplied: pin 20 radiator fan PWM interface, pin 38 brake switch, pin 7 chassis CAN Low, pin 8 chassis CAN High.
- Trunk: battery distribution, dual fuel pump relay board, surge 535/525, ground bus, future accessory loads.

## Open verification items
1. Verify the 8HP six-position map against the actual connector drawing and connector face orientation.
2. Choose 8HP constant-feed fuse rating, wire gauge and distribution path based on controller requirements; do not run pin 1 directly from the battery unfused.
3. Confirm whether the standalone CAN bus is compatible with the MaxxECU, 8HP controller and keypad, including bitrate and termination.
4. Exact electrical behavior of the EKP trigger and Leash C+ input.
5. Confirm BMW X60001 pin 20 fan signal wiring and output compatibility; do not tie active outputs together.
6. Alternator/starter cable gauge and protection strategy based on current, length, and vehicle requirements.
7. Verify all connector face views and terminal/cavity part numbers against actual hardware before crimping.

## Connector Studio update
A Connector Studio tab was added for image references and generated cavity indexes. Component images are not automatically identified or verified; each component can be marked as verified manufacturer reference, owner photo with confirmed/unknown part number, needs verification, or illustration only. The generated pin grid is an index based on the current catalog and must not be treated as the physical mating-face orientation. Add local images to an `assets/` directory next to `index.html` and reference them by relative path.

## Connector photo references added in Update 3

- Deutsch DT 12-way reference: https://www.deutschconnector.com/products/deutsch_connectors/deutsch_dt_series_connectors/deutsch_dt_12-way_connectors/ (visual image served from Custom Connector Kits; use the product family page to verify part numbers).
- Leash dual 70A relay module: https://www.leashelectronics.com/products/dual-70-amp-relay-module
- Leash OG4 relay module: https://www.leashelectronics.com/products/og4-relay-module
- Leash Street/Strip wiring board: https://www.leashelectronics.com/products/street-strip-wiring-board

These are external online reference images. They do not establish that the pictured Leash product is the user's exact single board, nor do they establish connector face orientation or pin assignment. Confirm exact model and terminal labels before using a photo to fabricate wiring.


## Update 4 — Build tracker and direct photo upload

- Added a **Build tracker** tab with staged planning, electrical review, assembly, and bench-test checklists. Progress is saved in the browser and included in the full JSON backup. This is a workflow aid, not a safety certification.
- Connector Studio now accepts a photo directly from an iPad/computer. The app resizes it to a maximum 1100 px edge and compresses it to JPEG before saving it in browser storage. Keep original photos in the GitHub repository as a separate backup; browser storage limits vary.
- Backup now exports the full app state, including connector photos/status and build checklist progress. Older partial backups remain loadable, but cannot restore data they never contained.
- Existing vendor-gallery images are still external URLs and require internet. The new upload option lets you use your own photo without hosting it first, on the same browser/device.
