# WireForge v0.26 — Two-sided Deutsch terminations

Deutsch Assembly Studio tracks physical crimp and contact evidence for BOTH connector halves. Merely drawing a wire on Side A does not certify that a real crimp is installed.

- Side A: a drawn schematic conductor defaults to "planned" physical termination. A user must enter actual housing part numbers for both halves, Side A contact part, actual source/destination, and inspection evidence before marking the A-side crimp owner-confirmed.
- Side B: mating-side wire remains "planned" until its own contact part, destination, and inspection evidence are recorded and owner-confirmed.
- A paired wire termination counts as documented only when BOTH sides have the required records.
- Unused cavities need sealing plug details; a planned plug is not treated as installed.
- Mating-family, cavity-count, orientation and keying issues block ready status. A submitted note is user evidence, not independent certification.
- Existing saved projects remain backward-compatible, but absent A-side evidence is NEVER silently upgraded to installed/confirmed.

The UI now includes a staged assembly workflow, two-sided crimp details, readable quality-status cards, responsive manufacturing matrix and CSV export that includes the A-side and B-side proof fields. The 3D inspection view shows confirmation counts for both halves; planned pigtails are illustrative only.

## Manufacturer references

TE Connectivity DEUTSCH DT Inline Connectors:
https://www.te.com/content/dam/te-com/documents/industrial-and-commercial-transportation/global/dt-inline-catalog.pdf

TE DEUTSCH DT Color Connectors:
https://www.te.com/content/dam/te-com/documents/industrial-and-commercial-transportation/global/ict-deutsch-DT-ds-a4-en-0224.pdf

Manufacturer documentation describes plugs/receptacles, contacts, wedgelocks and sealing plugs for unused cavities. Suggested DT04/DT06 housing numbers in WireForge are examples, not claims about installed parts. Verify the precise actual family, cavity numbering, keyed orientation, contact, insulation diameter and current rating before manufacturing.

## Limitations

WireForge does not currently certify physical terminations, real-world continuity, manufacturer CAD, electrical safety, or crimp pull/inspection quality. An "owner-confirmed" record only signifies user-recorded evidence. In particular, the E90 example still needs actual connector photos and physical wire-side cavity mappings before it can be considered production-ready.

## Test gate

Run Node unit tests for the two-sided model and Chromium smoke test for browser persistence, contact evidence, CSV export and mobile layout, in addition to the existing editor, validation, production, and 3D tests.
