# Runtime character documentation

Status: Evolving
Scope: `@carbonenginejs/runtime/character`
Audience: Character-runtime integrators and maintainers
Summary: Documents model-shaped character JSON, backend-neutral appearance
construction, realization ALs, and current native character/interior classes.

## Purpose

The combined runtime's character layer owns a source-neutral schema-v10 character document format,
a separate schema-v4 resolved appearance-plan format, and the current Carbon
character/interior identities assigned to this package. Its root CPU/data
surface is GPU-free; backend realization ALs may live in isolated `gles/`,
`webgl2/`, or future `webgpu/` subdirectories without being re-exported by the
root entry point. A realizer receives one resolved plan and owns every live
resource, texture, buffer, pipeline, and stage it creates. Its builder reads
the twelve modern cFSD source documents through fetch or an
injected byte source, while applications retain endpoint and asset-lifecycle
policy.

The builder decodes or accepts caller-supplied record fields, names each source map key as
`recordID`, and adds only established relationships. The resulting JSON has
the same shape as `CjsCharacterLibrary`; inherited `from`, `SetValues`, and
`GetValues` own hydration and serialization of its direct source-backed
`CjsModel` records under `src/character/model`. Current source-backed
native classes live under `src/character/trinity`. Historical Incarna-only
identities belong under `src/character/incarna` when reviewed records prove
they are required.

The removed character-library schema-v1/v2 `CjsCharacter*` model family is not
a compatibility surface. The appearance-plan schema-v4 is a distinct
standalone model graph under `src/character/model/planning`. Its initial resolver
projects exact paper-doll selections and colour selections, preserves every
exact source-version contribution, follows bounded exact typed dependencies,
suppresses active selections through exact typed modifier-location occlusions
and typed clothing-removal relationships, and retains proved utility-shape
requests. It fills part candidates only when
uniquely determined. Recursive dependency policy, LOD, material, texture-role,
coverage, pass ordering, and rendering remain unresolved. They must not inherit
a prototype renderer's unproven filename heuristics.

Earlier renderer implementations remain useful parity evidence, but their
heuristic discovery rules are not runtime contracts. The current library
retains direct source records and decoded definition values before adding typed
projections. Renderer adoption is gated on typed inputs, deterministic tests,
and explicit replacement of any filename rule or fixed fallback.

Decoded authoring definitions remain first-class records in the combined
library. Typed catalogs are additive projections for known relationships; an
unrecognized definition is retained as JSON rather than omitted.

The package also exposes verified GPU-free modifier-order and shared-atlas
layout policy. These utilities supply resolver inputs; they do not add renderer
lifecycle commands to the serializable appearance plan.

## Documentation map

- [Architecture and ownership](architecture.md)
- [Runtime usage](guides/runtime-usage.md)
- [Combined library pipeline](guides/combined-library-pipeline.md)
- [Character document contract](reference/prepared-libraries.md)
- [Character appearance plans](reference/character-appearance-plans.md)
- [Character CPU, GPU, and format boundary](reference/cpu-gpu-and-format-boundary.md)
- [Renderer adoption gates](reference/renderer-adoption-gates.md)
- [Class catalog](reference/classes/README.md)
- [Roadmap](roadmap.md)
