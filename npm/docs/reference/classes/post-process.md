# Post-process classes

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/postProcess`
Audience: Runtime and engine authors
Summary: Catalogs maintained post-process graph settings and execution boundaries.

<!-- class:Tr2SSAO -->
## `Tr2SSAO`

Owns Carbon's SSAO and CORTAO settings and their portable quality policy.

Physical filtering remains an explicit engine obligation.

- Export: `@carbonenginejs/runtime-trinity/postProcess`
- Source: `src/postProcess/Tr2SSAO.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PostProcessRenderer -->
## `Tr2PostProcessRenderer`

Owns Carbon's post-process renderer quality and authored effect references.
Physical execution remains an explicit engine obligation.

- Export: `@carbonenginejs/runtime-trinity/postProcess`
- Source: `src/postProcess/Tr2PostProcessRenderer.js`
- Visibility: Public
- Kind: Carbon
