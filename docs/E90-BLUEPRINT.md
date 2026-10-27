# WireForge v0.24 — E90 LS example blueprint

## Layout decisions

The six schematic work areas run in a front-to-rear order. Components are grouped using approximate installation zones (engine bay, DME/firewall, cabin, underbody/8HP, left trunk, right trunk). All box positions are illustrative. They are deliberately NOT measured vehicle coordinates or manufacturing length evidence. Generous clearance between schematic node rectangles helps prevent accidental overlap.

Click E90 Blueprint and a zone card to jump to that physical planning area. Arrange example explicitly reflows the reference components; it asks for confirmation and preserves a normal undo snapshot. Loading a user-saved layout never silently rearranges it.

## Connection provenance

Source input 1: MaxxECU RACE LS terminated engine-harness reference (the attached Maxxecu Race LS Wiring.txt); source input 2: owner-described E90 wiring topology and assignments in this project. The manufacturer's extra breakout connector table lists:

- 12-pin C = GPO2, E = GPO3 (low-side relay outputs).
- 16-pin pin 7 = GPO7 / DIN3; pin 4 = AIN2.
- 16-pin pin 1 = 5 V sensor supply; pin 2 = sensor ground. Sensor ground must NOT be connected to chassis / engine ground.
- 16-pin pin 5 = AIN6; pin 6 = AIN7; pin 8 = GPO5; pins 11, 12, 13, 14 = DIN1, DIN2, DIN4, DIN5.

The four newly restored schematic links correspond to GPO2, GPO3, GPO7 and AIN2. They terminate on owner-described cabin DT2-A/DT2-B functional breakout positions and then the one trunk DT6. No exact molded Deutsch cavity or connector gender is claimed. Owner-described physical wires, currents, fuse sizes and contact assignments require inspection.

The remaining tracker checks whether two modeled endpoints share a net in the existing diagram. This only proves that the design model contains a wire path. The model does not inspect installed wiring, determine terminal/contact compatibility, prove CAN termination or polarity, calculate physical cable lengths or certify safe operation.

## Physical confirmation requests

1. Photos/part numbers of both halves of the DT6 and three DT2s plus actual cavity numbers and wire-side orientation.
2. Physical pin tables and photos for custom ECU breakout housings (12-pin, analog/control DT8) and any modified CMC wiring.
3. Real fuse ratings/positions, board terminals, pump wiring gauges and measured pump currents.
4. GPO15 purge-control and relay pin 85/86 details, and separately identify real muffler-valve outputs. An ECU low-side output should not be assumed to drive a relay positive coil terminal.
5. Modified CLT/IAT/oil pressure, crank/cam adapter and coil/injector terminated engine-harness details.
6. CAN speed, two termination points and the 8HP TCU/keypad topology.
7. Measured branch and loom lengths, service loops, grommet locations, and covering.
8. Nitrous SSR model/polarity, pressure transducer, heater protection and solenoid requirements.

Answers recorded inside E90 Blueprint are browser-project notes, not manufacturer verification. Owners should check actual part manuals or manufacturer CAD/pinouts before crimping/energizing.

## Inspiration and boundaries

- harness.design: Schematic, physical layout, connectors/parts, reviewed connections and export are distinct engineering views: https://docs.harness.design/
- harness.design recommends avoiding overlap and maintaining at least 60–90 diagram units between components: https://docs.harness.design/feature/local-files/json-format
- JC HarnessLab: connector/loom detail, render visualization, physical fittings and documentation are useful product goals: https://jcharnesslabs.com/

This is an independently implemented WireForge interface, not a duplicate of either product. No third-party graphics or CAD models were imported.

## Tests

The e90-blueprint workflow uses Chromium to verify 59 active components, 94 wires, six nonoverlapping zones, the four newly restored paths, a reference report, note persistence, zone navigation and responsive UI. Other WireForge CI workflows continue to cover 3D, Project Vault and Validation Lab.
