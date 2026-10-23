# Project notes — Harness Bench E90 LS

## Owner-confirmed Harness Book entries
- DT6 from trunk to cabin, splitting near ECU into three DT2 connectors.
- DT2-A: cavity 1 GPO2, cavity 2 GPO3. Green 14 AWG for GPO2; yellow 14 AWG for GPO3.
- DT2-B: cavity 1 GPO7, cavity 2 AIN2. Orange 14 AWG for GPO7; purple 20 AWG for AIN2.
- DT2-C: cavity 1 +5V, cavity 2 sensor ground. Red 20 AWG +5V; black 20 AWG sensor ground. Both splice to other sensors.
- MaxxECU Race termination as supplied by owner: 12-pin cavity 3 GPO2; 12-pin cavity 5 GPO3; 16-pin cavity 7 GPO7; 16-pin cavity 4 AIN2; 16-pin cavity 1 sensor +5V; 16-pin cavity 2 sensor ground.
- GPO7 ground-triggers a relay.
- Valved mufflers: original black control box bypassed; both positives joined and both negatives joined, with one outgoing wire per polarity. Owner states Motor 2 handles the motor pair and CAN keypad controls it.

## Unverified / intentionally not inferred
- Exact physical DT6 cavity order / connector face orientation.
- Shared sensor +5V and sensor-ground splice location and branch topology.
- Valved muffler output current, Motor 2 rating for the actual actuator load, protection/fuse details, feed wire gauge and route.
- Other previously documented ECU, BMW chassis, 8HP, Leash relay board and high-current paths still require physical verification before use as production pinouts.
