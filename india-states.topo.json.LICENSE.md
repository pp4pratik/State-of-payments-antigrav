Source: [geohacker/india](https://github.com/geohacker/india) — `state/india_telengana.geojson`, MIT License.

Simplified from ~23MB to ~193KB via `mapshaper -simplify 4% keep-shapes -clean`
(topology preserved, only vertex density reduced) and reprojected to TopoJSON.
Only the `NAME_1` property (state/UT name) was retained.

State names in this file are pre-2019 (no separate Ladakh; Dadra and Nagar
Haveli / Daman and Diu still split; "Orissa"/"Uttaranchal" old spellings).
`src/components/IndiaMap.tsx` normalizes these against NPCI's current state
names before matching.
