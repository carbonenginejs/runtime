# Character CPU, GPU, and format boundary

Status: Evolving
Scope: `@carbonenginejs/runtime/character`
Audience: Character-runtime, format, and engine maintainers
Summary: Defines one CPU doll-planning system and the schemas available to format and realization adapters.

## One doll plan, multiple realizers

`@carbonenginejs/runtime/character` owns the backend-neutral meaning of a doll. A complete
resolver produces one `CjsCharacterAppearancePlan`; different engines may
realize that same plan without changing its character semantics.

```text
decoded source values + prepared library
                  |
                  v
       CPU selection and resolution
                  |
                  v
      CjsCharacterAppearancePlan JSON
          /          |           \
         v           v            v
   GLES/WebGL     WebGPU      offline/editor
    realizer      realizer       realizer
```

The shared CPU system owns:

- source-library hydration and named identity relationships;
- selection, dependency, LOD, coverage, material-role, and composition policy
  when each decision has proved data or an explicitly labelled policy source;
- logical texture assets, channels, atlas placement, ordered composition
  targets and passes;
- exact morph-target requests, rig-name binding, and CPU 3x4 palette packing;
- final consumer and sampler identities without live consumer objects; and
- serializable diagnostics and provenance.

A realizer owns:

- resource acquisition and decoded image or geometry payloads;
- live textures, buffers, render targets, pipelines, shader programs, bind
  groups, uploads, and draw submission;
- executing logical composition passes in its backend;
- matching logical consumer/sampler identities to live materials and effects;
- mesh replacement/finalization and animation attachment; and
- backend limits, fallbacks, and readiness or loss handling.

Backends may be implemented beneath `src/character/gles`,
`src/character/webgl2`, or `src/character/webgpu` when they exist. Those
folders are isolated realization ALs: the root `@carbonenginejs/runtime/character`
entry point remains CPU/data-only and does not eagerly import or re-export a
backend. A character CPU coordinator retains an opaque realized stage and calls
the injected AL lifecycle (`Prepare`, `Commit`, `Release`, and optional handoff,
morph, warmup, or diagnostics methods); it never reads or mutates GPU state.

The GLES reference helpers make this concrete. `CjsCharacterGlesAtlasPlacement`
and `CjsCharacterGlesAtlasPlanning` are pure metadata/planning code;
`CjsCharacterGlesAtlasRenderer` receives all target/effect work from an
injected atlas host. `CjsCharacterGlesPaletteCompatibility`,
`CjsCharacterGlesTriangleCoverage`, and `CjsCharacterGlesMorphDeformation`
may inspect the decoded mesh shape needed for their policy, but receive all
native operations through an injected geometry host. The host supplies:
The `CjsCharacterGlesAppearanceAL` receives scene/resource work
through separate injected resource, visual, and configured-operation hosts.

- `GetMeshes(geometryResource)` and `EnsureSystemMirror(geometryResource)`;
- `UploadIndices(mesh)` and `UploadVertices(mesh)`;
- `GetVertexChannelDeclaration(mesh, channel)` for backend vertex-layout
  interpretation; and
- `RebuildMeshBounds(mesh)` and `RebuildBounds(geometryResource)`.

This lets the GLES adapter bridge existing Tw2/GR2/WebGL objects today without
making those objects, their global facade, or a local-file fallback part of the
CPU library or plan contract. A WebGL2 or WebGPU AL supplies an equivalent host
for its own live representation.

The plan must not contain a canvas, rendering context, device, command encoder,
live resource handle, decoded byte buffer, cache lease, or renderer callback.
Pass-array order is authoritative, but the implementation used to execute a
pass is not part of the character format.

Current `src/character/trinity` records remain on the CPU side of this boundary. They are
native scene-graph state, LOD selection, skeleton binding, light/per-object
data layouts, and neutral batch intent. A field typed as a texture, effect,
geometry resource, or render target is a hydrated reference contract; this
package does not allocate or submit the corresponding GPU object.

`test/character/runtime-character/cpu-gpu-boundary.test.js` guards the CPU/data
surface against engine, resource-runtime, browser/Node tool imports, local Node
file loading, and concrete WebGL/WebGPU allocation, upload, or draw operations.
It permits those operations only beneath an isolated character backend AL
folder; every backend still uses injected browser/resource access rather than a
Node fallback. Shared model, schema, path, and math functions remain GPU-free
imports from the `global` layer.

## Format pipeline

Runtime formats decode bytes; they do not own character meaning and must not
import `@carbonenginejs/runtime/character`. Registration or an outer adapter selects a
character target after decoding:

```text
bytes -> generic format reader -> plain values/inspection
                              -> Target or Identify adapter
                              -> character schema/model
```

The intended package split is:

- the `global` layer owns the shared GPU-free model, schema, path, and math
  functions used by character models;
- `@carbonenginejs/runtime/resource` owns the generic FSD pipeline and schema-driven cFSD
  readers; and
- `@carbonenginejs/runtime/character` owns the twelve-reader character composition and accepts
  fetch or an injected byte source. Applications own endpoint and target
  selection; tools-core may supply validated local/cache bytes.

`@carbonenginejs/runtime/character` does not import `src/tools` or tools-core. A browser
application may call the runtime builder directly; src/tools remains demos
and application tooling, not a required data layer.

There are four different target categories. They must not be treated as one
interchangeable set.

### Direct decoded source-document targets

The twelve static-data readers currently correspond one-for-one with the
required character-library document families:

| Decoded document | Character record target |
| --- | --- |
| `ancestries` | `CjsCharacterAncestry` |
| `archetypes` | `CjsCharacterArchetype` |
| `bloodlines` | `CjsCharacterBloodline` |
| `characterAvatarBehaviors` | `CjsCharacterAvatarBehavior` |
| `characterColorLocations` | `CjsCharacterColorLocation` |
| `characterColorNames` | `CjsCharacterColorName` |
| `characterModifierLocations` | `CjsCharacterModifierLocation` |
| `characterPortraitResources` | `CjsCharacterPortraitResource` |
| `characterResources` | `CjsCharacterResource` |
| `characterSculptingLocations` | `CjsCharacterSculptingLocation` |
| `paperdolls` | `CjsCharacterPaperdoll` |
| `races` | `CjsCharacterRace` |

The reader output is plain JSON keyed by source record identity. The library
builder adds the named `recordID` and projects proved relationships. The reader
itself remains outside this package; these classes describe decoded values, not
the binary layout or schema identity.

Nested source values hydrate through their owning records:
`CjsCharacterColorSelection`, `CjsCharacterSculptSelection`, and
`CjsCharacterModifierSelection`.

### Lossless loose-definition target

`CjsCharacterDefinition` is the general retained envelope for an indexed,
decoded character authoring file. It stores `sourcePath`, `extension`, and the
JSON-valid decoder output in `values`. It is suitable for `.type`, `.color`,
`.proj`, YAML, and other decoded definition families when no direct typed
target has been proved.

This envelope is deliberately not a format reader. The format supplies the
plain value; the producer supplies the exact source path and extension. Keeping
the envelope means an additive typed projection can be corrected later without
discarding the decoded source.

### Producer-derived typed indexes

These schemas are character-specific, but they are not generally direct
format targets:

- `CjsCharacterPartType`;
- `CjsCharacterPartSource` and `CjsCharacterPartSourceVersion`;
- `CjsCharacterPartMetadata` and `CjsCharacterModifierReference`;
- `CjsCharacterMaterialProfile` and `CjsCharacterColorValue`;
- `CjsCharacterProjectionProfile`;
- `CjsCharacterRecipeProfile` and `CjsCharacterRecipeEntry`; and
- `CjsCharacterTextureMetadata`.

The producer creates these indexes after qualifying paths, identities,
versions, dependencies, exact resource candidates, or image placement facts.
For example, decoded `metadata.yaml` is retained unchanged as a
`CjsCharacterDefinition`, while tools may additionally project its understood
fields into `CjsCharacterPartMetadata`. A YAML reader must not silently claim
that every YAML object is that class.

`CjsCharacterTextureMetadata.fromPngInspection(...)` is the current explicit
bridge from a generic PNG inspection result to character-atlas placement. PNG
chunk parsing remains generic format behavior; interpreting the retained
`oFFs` and `pHYs` millionths as character placement is character policy.

### Hydrated object-format targets

Decoded Black/Red object graphs may target registered classes under
`src/character/trinity` when their authored class identity is present. The smaller
`src/character/incarna` set may hydrate only the specifically documented historical
identities. These are object-graph schemas, not replacements for the combined
character library or appearance plan.

## Appearance-plan schemas supplied to realizers

The realizer-facing schema is the `CjsCharacterAppearancePlan` graph:

- selection and provenance: `CjsCharacterOrigin`,
  `CjsCharacterAppearanceSelection`, and
  `CjsCharacterAppearanceColorSelection`;
- resolved inventory: `CjsCharacterResolvedPart`,
  `CjsCharacterAppearanceLayer`, `CjsCharacterTextureAsset`, and
  `CjsCharacterTextureChannel`;
- visibility and deformation: `CjsCharacterCoverage` and
  `CjsCharacterMorphTargetWeight`;
- composition: `CjsCharacterCompositionTarget`,
  `CjsCharacterCompositionPass`, and `CjsCharacterCompositionInput`;
- final use: `CjsCharacterAppearanceBinding` and
  `CjsCharacterBindingAlpha`; and
- unresolved or fallback state: `CjsCharacterAppearanceDiagnostic`.

These records are the contract that lets doll construction remain one system
while WebGL, WebGPU, editor, or offline implementations create the concrete
result differently.
