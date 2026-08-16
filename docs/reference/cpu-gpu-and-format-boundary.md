# Character CPU, GPU, and format boundary

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Character-runtime, format, and engine maintainers
Summary: Defines one CPU doll-planning system and the schemas available to format and realization adapters.

## One doll plan, multiple realizers

`runtime-character` owns the backend-neutral meaning of a doll. A complete
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

The plan must not contain a canvas, rendering context, device, command encoder,
live resource handle, decoded byte buffer, cache lease, or renderer callback.
Pass-array order is authoritative, but the implementation used to execute a
pass is not part of the character format.

Current `src/trinity` records remain on the CPU side of this boundary. They are
native scene-graph state, LOD selection, skeleton binding, light/per-object
data layouts, and neutral batch intent. A field typed as a texture, effect,
geometry resource, or render target is a hydrated reference contract; this
package does not allocate or submit the corresponding GPU object.

`test/cpu-gpu-boundary.test.js` guards the package source against engine,
resource-runtime, and browser/Node tool imports and against concrete
WebGL/WebGPU allocation, upload, and draw operations. Shared model, schema,
path, and math functions remain GPU-free imports from `runtime-utils`.

## Format pipeline

Runtime formats decode bytes; they do not own character meaning and must not
import `runtime-character`. Registration or an outer adapter selects a
character target after decoding:

```text
bytes -> generic format reader -> plain values/inspection
                              -> Target or Identify adapter
                              -> character schema/model
```

The intended package split is:

- `runtime-utils` owns the shared GPU-free model, schema, path, and math
  functions used by character models; and
- `tools-browser` owns browser-facing acquisition, remote readers, indexes,
  and application tooling that may supply decoded values to the character
  runtime.

`runtime-character` must not import `tools-browser`. A browser application may
compose both packages and pass the resulting plain values or inspections across
the boundary.

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
`src/trinity` when their authored class identity is present. The smaller
`src/incarna` set may hydrate only the specifically documented historical
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
