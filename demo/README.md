# Runtime demos

This directory owns standalone, non-engine examples and demonstration apps for
the combined runtime.

Reusable browser logic belongs under `src/tools`. Engine-specific GPU harnesses
stay with their engine layer. Generators, builders, source schemas, catalogs,
artifact acquisition, and Node.js or native dependencies belong in
`@carbonenginejs/tools-core`.

Reviewed generated source needed by runtime readers belongs beneath its owning
runtime layer under `src/**/generated`, not in this directory.
