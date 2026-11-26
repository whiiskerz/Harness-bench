# HD30 demonstration — not a manufacturing specification

Open Design → Design actions → Load Demo Harness → MaxxECU Race / HD30.
Existing working projects are saved separately after confirmation; the new demo is saved in My Projects. Import CSV accepts existing uniquely named connectors with exact cavity identifiers, using the headers in wireforge-hd30-demo.js. For two-sided abstract bulkheads add FromSide/ToSide (L/R). A row error aborts the entire import before mutation.

## Manufacturer review (2026-11-25)
- MaxxECU Gen1: https://www.maxxecu.com/webhelp/wirings-maxxecu_pinout.html — C1 V1/RACE/PRO column, 48 cavities, Molex 643203311. CSV circuit aliases are illustrative; particularly J2 is a temperature input and requires configuration/compatibility review.
- TE product pages: https://www.te.com/en/product-HD36-24-47SE.html and https://www.te.com/en/product-HD34-24-47PE.html — socket plug and pin receptacle, 47 positions, E seal.
- TE drawing 0425-014-2400 rev H sheet 2 shows matching numbered 24-47 arrangements from the grommet (rear) side, five size 16 and 42 size 20 contacts. Physical per-cavity size assignments are not encoded/approved. See drawing linked under Product Specification on both product pages.
- TE HD30/HDP20 catalog: https://www.te.com/content/dam/te-com/documents/industrial-and-commercial-transportation/global/ict-hd30-hdp20-cat-a4-en.pdf — gauge and seal selection is contact dependent. 22 AWG requires special attention for size 16; exact terminal P/N, conductor and insulation OD, loads, grounds, fuse and shield terminations remain TBD. All example wire rows remain unverified. Do not energize or manufacture from this sample.
- Mate interface has zero added physical wire objects. Wire lengths are CSV examples; 450 mm is the nominal route, not a verified cut measurement.

## Tests
Run node tests/hd30-demo.cjs and the touch-emulation browser suite tests/hd30-demo-browser.cjs. Real iPad Safari still requires manual validation.
