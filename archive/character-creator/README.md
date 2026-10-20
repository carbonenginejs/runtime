# Archived character creator

Reference source from runtime revision `5999245b4`. The creator and its
GLES/WebGL2 integrations are excluded from the live entry points and npm package.
This directory is not an executable compatibility package.

Files under `src/` retain their original text from `src/character/`.
Files under `test/` retain their original text from
`test/character/runtime-character/`, with a `.reference` suffix so the test
runner does not execute archived integration tests.

The active library, library builder, records, catalog readers, modifier order,
resolution/planning and Carbon-derived scene classes remain under
`src/character/`. Modifier-order tests remain active separately.
The rig-binding helper remains live because the skinned object uses it.

Original relative imports are preserved for provenance; do not import this
archive from live modules or add it to package exports.
