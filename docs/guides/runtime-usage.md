# Runtime character usage

Status: Evolving
Scope: `@carbonenginejs/runtime-character` usage and current runtime surface
Audience: Character-runtime integrators and maintainers
Summary: Provides extended examples and current contracts for prepared libraries, controls, rig binding, and runtime ownership.

## Boundary

`runtime-character` owns runtime classes, recipes, parts, materials, poses,
morph controls, projections, state, metadata, inert resource dependencies, and
construction of character graphs from prepared library data. It does not fetch,
cache, decode, normalize source profiles, build libraries, or render resources.

Offline character discovery, normalization, catalog linking, coverage reports,
and JSON export belong to `@carbonenginejs/tools-core/character`. Approved
private research readers remain local tooling and are never runtime dependencies.

```text
tools-core/character -> prepared character JSON
                         |
                         v
runtime-character -> CjsCharacterLibrary -> CjsCharacterGraph
                         |
                         v
runtime-resource adapter -> selected engine backend
```

Graph classes extend `CjsModel` and register `CjsSchema` type and persistence
metadata, so `SetValues`, `GetValues`, normalization, nested hydration, dirty
state, and document tooling follow the shared library contract.

Reusable class-level utilities are public camel-case static methods. Free
functions within a class module are implementation-private and are never
exported as an alternate API surface.

## Prepared libraries

`CjsCharacterLibrary` accepts both normalized schema-v1 data and compact
schema-v2 artifacts. Compact keyed catalogs and shared `partSources` are
expanded internally before `CjsCharacterLibraryData` hydration. Consumers can
call the camel-case static `CjsCharacterLibrary.expandData(data)` to normalize
either form. Schema-v1 input is already normalized and is returned unchanged;
schema-v2 input expands to a detached normalized record. The supporting
routines remain private to the class module.

Model-backed parts expose `lodBundles`, with each `CjsCharacterLodBundle`
carrying one configuration path and its matching geometry path. Compact and
hydrated libraries use the same bundle field names. Flat `resourcePaths` remain
available for schema-v1 compatibility.

```js
const bundles = library.GetPartLodBundles(partID);
const selected = library.ResolvePartLodBundle(partID, requestedLod);

const graph = library.BuildGraphFromParts([
  { selection: { typeID }, lod: requestedLod }
]);
```

Resolution prefers an exact complete bundle, then an unsuffixed base bundle,
then the nearest complete numbered bundle. It never falls back configuration
and geometry independently. The result records both `requestedLod` and
`resolvedLod`, plus `fallbackReason` when a fallback was required.

Prepared libraries may include ordered `visemeSets`. Each set preserves the
exact case-sensitive state-graph parameter names, optional skeletal animation
identity, authored range/default, neutral control, and facial-mask bone names.
The animation resource is optional because an authored neutral/cancellation
control can reuse a default face animation rather than own a viseme clip.

`BuildGraphFromParts()` accepts explicit internal IDs, unique `typeID` values,
or unambiguous names and emits typed `CjsCharacterResolvedPart` records. Model
dependencies contain only the selected bundle's matching configuration and
geometry; alternate LOD model paths are not copied into the graph.

Schema-v2 libraries may also contain compiler-prepared `recipeLinks`, aligned
to each preset by entry index. `ResolveRecipe()` consumes only those explicit
links and returns typed resolved parts, morphs, rule nodes, materials, and
blocking issues. It never chooses an ambiguous candidate or invents a mapping
for an unresolved authored path.

```js
const resolution = library.ResolveRecipe("pilot", { lod: 1 });

// Strict by default: throws while any blocking issue remains.
const graph = library.BuildGraphFromResolution(resolution);

// Diagnostic tooling may inspect an explicitly incomplete graph.
const partial = library.BuildGraphFromResolution(resolution, { strict: false });
```

`BuildGraphFromRecipe()` combines those two calls. Configuration-only parts
remain valid supporting-resource nodes; parts containing geometry require one
complete atomic configuration/geometry LOD bundle.

The verified Trinity owner cannot derive projected size from its open base
class because `GetBoundingSphere()` deliberately returns false. Hero avatars
should use `CjsCharacterLodController.SelectPrimary()` (or explicit
`SelectLod(..., 0)`) so their complete model remains the target. LOD 1/2 may
have reduced bone and morph coverage and are deliberate crowd-performance
tiers, not transparent substitutes for LOD 0.

`SelectProjectedSize()` is the opt-in scene/camera seam for automatic crowd
selection: its caller supplies the projected pixel diameter, and the controller
asks `Tr2SkinnedObject` to swap one complete high, medium, or low model.
`SelectLod()` still lets the verified proxy helper choose an available/resident
fallback; it never combines resources from different LODs. Equal-distance
library fallback prefers lower detail, matching native medium-LOD fallback
order.

In the audited female foundation asset, the LOD 0 body actively references 69
bone bindings. The current legacy GLES avatar carrier holds only 58 packed 3x4
matrices. That is a shader-capacity defect to fix, not a reason to remove body
geometry. The counts describe that concrete asset and shader contract; they
are not universal character limits.

Selectable parts use a CarbonEngineJS-owned `id` as their library primary key
and may also carry an exact external `typeID` plus a display `name`. No external
identity is invented when source enrichment is unavailable. Direct and name
lookups share the types/skins identity pattern:

```js
const part = library.GetPartByTypeID(typeID);
const candidates = library.LookupName("Long Hair");
const normalized = library.SearchName("long-hair");
const identity = library.ResolveName("Long Hair");
const selected = library.ResolvePartLodBundle({ typeID }, requestedLod);
```

`LookupName()` retains every exact case-insensitive candidate as
`{ kind: "character", typeID, partID }`. `SearchName()` additionally folds
punctuation and spacing. `ResolveName()` and `ResolveSearchName()` require one
unambiguous identity.

Material links in prepared libraries follow the authored paperdoll layout. A
`.type` color variant may resolve in its logical part folder, beside the
physical `.type` family, or in the part category's shared `colors` folder.
Authored `.base` tuples can contribute unvaried hair and regional palettes.
Those discovery and linking rules are implemented and tested in
`tools-core/character`; runtime-character consumes their prepared result.

Private character research data is optional enrichment rather than a runtime
dependency. Any enrichment requires reviewed provenance and must be projected
into the public prepared-library contract without exposing private record shapes
or identifiers.

## Live controls

`CjsCharacterControlApplicator` composes authored graph morphs with ordered
`CjsCharacterControlLayer` values. Layers can drive morphs, scalar parameters,
translation-only bone offsets, and a symbolic active pose. They have stable
priority/caller ordering, an influence, and either `replace` or `add` blending.
The pure composer returns a detached `CjsCharacterControlState`; it never
mutates the graph, fetches resources, or touches a renderer.

```js
const controls = new CjsCharacterControlApplicator().Compose(graph, [
  {
    id: "expression",
    priority: 10,
    morphs: { Smile: 0.8 },
    parameters: { Blink: 0.2 }
  },
  {
    id: "viseme",
    priority: 20,
    blendMode: "add",
    morphs: { JawOpen: 0.5 }
  }
], { limits: exactHeadLimits });
```

Values are not implicitly clamped to zero-to-one. When an exact
`CjsCharacterBlendshapeLimits` record is supplied, only its named controls are
clamped. A layer pose of `null` has no opinion; an empty string explicitly
clears the pose selected by a lower-priority layer.

`CjsCharacterControlLayer.fromUniqueCharacter(record)` converts one authored
unique-character record into a detached neutral layer. Its blendshape weights
become morph controls and its post-animation translation offsets become bone
offset controls. The conversion does not claim a native high-level PaperDoll
owner; none is present in the available source tree.

```js
const binding = new CjsCharacterControlBinding({
  SetMorph(name, value) { renderer.SetMorph(name, value); },
  ResetMorph(name) { renderer.ResetMorph(name); },
  SetParameter(name, value) { controller.SetParameter(name, value); },
  ResetParameter(name) { controller.ResetParameter(name); }
});

binding.Apply(controls);
```

`CjsCharacterControlBinding` treats every state as a complete desired snapshot.
It emits only changes, resets controls that disappear, and requires paired
`Set*`/`Reset*` sink methods so it never guesses that zero is a renderer or
controller default. The binding uses a structural sink and deliberately has no
dependency on concrete animation, mesh, camera, or GPU classes. Bone rotations
and authored face-control tuples remain uninterpreted until their semantics are
proven. Camera trackers, speech/viseme systems, and agent-avatar drivers remain
replaceable adapters that emit neutral layers.

`CjsCharacterMorphTargetSink` is the structural adapter for mesh targets that
expose `GetMorphTargetNames`, `GetMorphTargetWeight`, and
`SetMorphTargetWeight`. It captures each target's authored weight on first use
and restores that value on reset, so a missing control is never guessed to
mean zero.

```js
const sink = new CjsCharacterMorphTargetSink(characterMeshes);
const binding = new CjsCharacterControlBinding(sink);
binding.Apply(controls);
```

Create a fresh sink and binding when a whole-model LOD swap replaces the mesh
target set; reset the old binding before releasing those targets.

### Skeletal speech controls

The audited female speech graph exposes 17 independent float parameters under
the exact node `Visemes`. Sixteen parameters drive masked skeletal facial
animations; `x` is a separate authored neutral/cancellation control. All
defaults are zero. Simultaneous weights are deliberately neither normalized
nor reduced to one winner because the authored graph layers them in order.

One exact public parameter is lowercase `l` while its animation is named with
an uppercase `I`. Runtime callers must preserve the parameter spelling rather
than deriving or correcting it from the animation filename.

```js
const set = library.GetVisemeSet("female-speech-03");
const layer = CjsCharacterVisemeSet.createControlLayer(set, {
  AA: 0.8,
  l: 0.25
});
const state = new CjsCharacterControlApplicator().Compose(
  new CjsCharacterGraph(),
  [ layer ]
);

const sink = new CjsCharacterGStateParameterSink(gStateAnimation);
new CjsCharacterControlBinding(sink).Apply(state);
```

`CjsCharacterGStateParameterSink` updates the persisted
`Tr2GStateParameter` records that native `PrePhysicsAnimation` copies into the
state graph before sampling. It captures each live pre-control value and
restores that value on reset instead of guessing zero or invoking the native
all-parameter default reset. The sink resolves
`node/parameter` names exactly and does not implement state-graph evaluation
itself.

Construct the sink only after the target has instantiated its character and
populated `parameters`; an empty list is rejected. In this package's current
JavaScript `Tr2GStateAnimation` shell, applying the binding updates those
records only—it does not sample a pose. A native host performs the copy and
sample on its next `PrePhysicsAnimation`; a future JavaScript state-graph
evaluator must provide the equivalent lifecycle.

The sample intentionally composes a parameter-only state. This sink implements
only the paired parameter methods; a state that also carries morphs, bone
offsets, or an active pose requires a composite sink that delegates those
channels to their owning adapters.

`CjsCharacterVisemeSet.createNeutralLayer()` drives only the authored neutral
control. Omitting a viseme from the next complete control snapshot resets it to
the value captured by the sink; it is not equivalent to applying neutral.
Filename parsing through `getIDFromAnimationPath()` is a public discovery
helper only and never remaps a filename suffix into a graph parameter.

`CjsCharacterVisemeTimeline` adds a backend-neutral time axis without owning
speech synthesis, text-to-phoneme conversion, audio, or rendering. Its ordered
frames retain simultaneous authored weights, and `sample()` linearly blends
the union of adjacent controls. `createControlLayer()` projects one sample into
the same complete-snapshot binding path used by live trackers and native hosts.

Authored canned dialogue, including Aura-specific performances in the audited
female graph, is a separate masked state-machine input. External viseme values
layer over that result; those dialogue clips do not generate viseme weights.
The animation names and resource paths in a viseme set are state-graph metadata;
the parameter sink does not attach or play them through the separate generic
named-animation-layer API.

The authored state-graph updater and the generic named-animation-layer updater
are alternative playback paths today: a skinned object owns one animation
updater, and no current compositor joins them. A generic-layer fallback would
also require one masked layer per simultaneous skeletal viseme and cannot be
treated as equivalent to the authored graph's blend chain.

### LOD capability evidence

`CjsCharacterLodCapability.inspect()` ties evidence to one selected atomic
LOD bundle while reporting skeleton, declared mesh palette, actively referenced
mesh palette, and morph coverage independently. Each axis is
`complete`, `partial`, `none`, or `unknown` and retains its exact matched and
proven-missing names. Unobserved names remain `unresolvedNames` whenever the
source evidence is incomplete. Missing blend-index evidence therefore stays
unknown rather than becoming a false absence claim.

For `activeBoneNames`, adapters must include only bindings referenced by a
vertex influence lane whose weight is non-zero. Merely appearing in a blend
index lane is not active evidence because zero-weight lanes may contain default
or otherwise irrelevant indices.

```js
const requirement = CjsCharacterVisemeSet.createCapabilityRequirement(set);
const report = CjsCharacterLodCapability.inspect({
  lodBundle,
  requirement,
  skeletonBoneNames,
  meshes: [{
    id: "head",
    declaredBoneNames,
    activeBoneNames,
    morphTargetNames
  }]
});
```

A compatible render skeleton does not prove facial deformation. The audited
low-detail whole model contains every facial animation joint in its skeleton,
but its actively used mesh palette contains none of them. LOD selection and
capability inspection therefore remain separate operations, and callers must
reinspect after a whole-model, geometry-resource, or skeleton identity change.

## CPU rig binding

`CjsCharacterRigBinding` extracts the source-backed CPU portion of skinned-rig
binding without claiming to implement the full native `UpdateBones` lifecycle.
It maps animation bones to render joints by exact name, multiplies animation
world transforms by render-rig inverse-bind transforms, and packs one 3x4
palette entry per animation bone. Unmapped bones and a `null` animation pose
produce explicit identity entries.

```js
const rig = new CjsCharacterRigBinding();
rig.Bind(renderJoints, animationUpdater.GetAnimationBoneList());
rig.Update(animationUpdater.GetAnimationTransforms());

const palette = rig.GetPalette();
const revision = rig.GetRevision();
```

The revision changes only when the rig mapping changes or is reset, which lets
an outer renderer invalidate bindings after a whole-model LOD swap. The helper
does not fetch geometry, submit GPU work, or maintain cloth-delay queues.

The verified `Tr2SkinnedModel`/`Tr2SkinnedObject` surface now consumes that
same immediate CPU behavior: exact named skeleton selection, mesh-binding
invalidation, animation-to-render rig mapping, skeleton-tag changes, and a
detached packed palette. `UpdateBones()` is explicitly adapted rather than
claimed complete; native cloth synchronization, delayed matrix queues,
dynamic-bounds updates, and backend upload remain outside this package.

## Runtime/resource ownership

- `runtime-character` owns graph meaning and declared dependencies.
- `runtime-resource` owns paths, fetching, caching, decoding, preparation,
  retries, and lifecycle.
- An outer adapter walks `GetDependencies()` and associates prepared results.
- Prepared resource objects are not persisted graph fields.

`runtime-character` works in editors, servers, tests, and headless composition
tools without a resource manager or GPU.

## Development

Decorated JavaScript under `src` is canonical source. The package transforms it
with Babel and Rollup into runnable ESM under `npm/dist`.

```powershell
npm run build:npm
npm test
npm run lint
npm run proof:decorators
```

## Current runtime scope

The graph covers paperdoll recipes, authored bone poses, projected/decal state,
material color and pattern selections, morph weights, inert dependency
declarations, presentation profiles, unique-character defaults, modifier-name
inventories, face setup, and canonical runtime catalogs.

Important incomplete runtime work remains:

- Explicit library selections produce typed `CjsCharacterResolvedPart`
  values. Prepared recipe links now resolve the deterministic subset and keep
  every ambiguous or unknown entry as a typed blocker; complete client-owned
  recipe semantics remain future work.
- Prepared part definitions now pair Black mesh/effect layout with geometry in
  atomic LOD bundles. The future graph applicator must consume those bundles;
  cross-LOD area indices remain non-interchangeable.
- Texture normal channels need typed composition operations rather than one
  collapsed generic normal input.
- The Carbon `Tr2GStateAnimation` and `Tr2GStateParameter` character runtime
  shapes are owned here. Parameter records and the structural character sink
  work, and prepared libraries can carry ordered viseme-set contracts. Authored
  state transitions and GSF-driven pose evaluation remain outside the current
  JavaScript shell.
- Geometry skeleton lookup and immediate CPU bone-palette construction are now
  connected through the structural `TriGeometryRes` query surface. Material and
  effect binding, delayed palettes, cloth, and backend realization are not yet
  complete typed runtime layers.

One long-term input goal is live expression driving from computer vision, for
example OpenCV-based face tracking. The tracker belongs behind an optional
adapter that converts landmarks or tracker-specific coefficients into a
backend-neutral, calibrated set of named character expression controls.
`runtime-character` will consume those controls without depending on camera
APIs, OpenCV, raw video frames, or one vendor's coefficient layout. These
CarbonEngineJS input and calibration records stay outside `src/trinity`; only
verified Trinity classes, interfaces, and enums may live in that tree.

A related embodied-agent goal is to give Codex, or another interactive agent,
a character face it can talk through and control. An outer agent-avatar driver
will translate speech timing and structured intent into the same neutral
expression controls, plus gaze, viseme, and gesture channels. The character
runtime will not depend on Codex, a model vendor, speech synthesis, or a
transport protocol; those integrations remain replaceable drivers of the
shared control contract.

Detailed corpus, format, and rendering evidence belongs with the package that
owns it, not in this runtime contract.
