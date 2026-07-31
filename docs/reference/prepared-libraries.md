# Prepared character libraries

Status: Evolving
Scope: `@carbonenginejs/runtime-character` prepared-library input and hydration
Audience: Library producers, runtime integrators, and maintainers
Summary: Defines the current normalized and compact character-library contract and its opaque fields.

## Current inputs

`CjsCharacterLibrary` accepts normalized schema-v1 data and compact schema-v2
artifacts supplied by the caller. Compact catalogs and shared part sources are
expanded before `CjsCharacterLibraryData` hydration.

```js
import {
  CjsCharacterLibrary
} from "@carbonenginejs/runtime-character";

const library = new CjsCharacterLibrary(preparedLibraryData);
const normalized = CjsCharacterLibrary.expandData(preparedLibraryData);
```

`expandData()` returns schema-v1 input unchanged because that form is already
normalized. It returns a detached normalized record when expanding schema-v2
input. The library hydrates its own model graph and does not mutate the
producer's artifact.

## Opaque authored values

Several records are preserved for lossless interchange but have no runtime
applicator semantics:

- `CjsCharacterProjection.mode` is an opaque numeric authored value.
- Bone-pose `orientation` and `rotation` remain distinct authored vectors. The
  package does not collapse them or invent an application order.
- Face-control tuples and presentation payloads are retained without assigning
  undocumented element meanings.
- Part-metadata `soundTag` and `wap` values are retained but are not interpreted
  by this package.
- Modifier names remain ordered discovery aids. They are not a runtime
  whitelist and do not prove that a named morph or control is present.

Callers must not infer package ownership, texture role, or material operation
from a directory or filename alone. Those meanings require explicit prepared
metadata or a source-backed adapter.

## Catalog identity

Selectable parts use the library's `id` as their primary key and may also carry
an exact external `typeID` and display `name`. A name resolves only when it is
unambiguous. Prepared recipe links are aligned to authored entry indexes and
keep unresolved or ambiguous choices as typed issues.

Strict graph construction rejects blocking resolution issues. Diagnostic tools
may request an explicitly incomplete graph.

## Atomic model selection

Each `CjsCharacterLodBundle` pairs one configuration path with its matching
geometry path. Resolution prefers an exact complete bundle, then an unsuffixed
base, then the nearest complete numbered bundle. It never falls back the two
paths independently.

Alternate LOD resources are not copied into the selected dependency set.
Capability inspection must be repeated after a model, geometry, or skeleton
identity changes.

## Producer boundary

Tools-core owns prepared-library discovery, normalization, linking, and
deterministic artifact generation. This package owns hydration and runtime
interpretation of the published contract. It does not read YAML, inspect an
installed client, acquire resources, or write producer output.
