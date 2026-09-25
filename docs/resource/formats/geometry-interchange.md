# CMF, FBX, and glTF geometry interchange

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/{cmf,fbx,gltf}`
Audience: Runtime authors and geometry-pipeline integrators
Summary: Defines the validated CMF boundary and the explicit FBX/glTF compatibility policies used to reach it.

## CMF is the interchange boundary

CMF-native data is the geometry interchange representation. JSON is an output
adapter, not an intermediate conversion step. FBX and glTF readers build the
shared geometry graph and pass it directly to the canonical CMF builder;
format-specific code does not maintain a second CMF builder.

The same Carbon-derived validator runs before geometry decompression, again on
decoded/raw CMF graphs, and before CMF writes. It checks the v1 file and graph invariants: section and span bounds,
vertex declarations and buffer views, LOD/area/morph consistency, skeleton
references and transforms, animation curve storage and dimensions, metadata
keys, and finite floating-point vertex, morph, skeleton, and animation data.
The writer then reads its completed file back as a postcondition. A zero CRC is
not an exemption.

The validator deliberately does not invent checks Carbon does not perform. In
particular, it does not require normalized skin-weight sums or finite mesh
bounds and UV densities. Destination writers may impose stricter requirements
when their target format needs them.

## glTF import contract

`CjsGltfFormat` defaults to `emit: "shared"`; `emit: "cmf"` uses the same
canonical CMF builder. JSON and `gltfJson` are explicit projections, not the
conversion boundary.

- **Vertex channels:** glTF `TANGENT` is XYZ plus handedness, not an EVE packed
  tangent frame. Import produces separate tangent and binormal vectors from
  the matching normal and handedness; a tangent without a matching normal channel is
  rejected. Invalid direction vectors use the exporter's fixed fallbacks.
  Indexed UV/color channels retain their usage indices and three/four-component
  color width. Optional tangent packing is applied independently to every LOD.
- **Skinning:** `JOINTS_0` stays relative to the mesh's palette. Positive-weight
  indices must address that palette; zero-weight indices become zero. Skins
  sharing `skin.skeleton` share the full skeleton, including unused bones;
  skins without it remain separate. `inverseBindMatrices` must be FLOAT MAT4,
  one per joint, and map by joint-node identity without transpose. Conflicting
  matrices for a shared bone reject; an absent accessor means identity.
- **Morphs:** CMF buffers are absolute. Deltas are added to each LOD's own base;
  omitted components copy that base, and authored absolute targets stay
  absolute. Non-empty morph declarations include Position and are subsets of
  the base declaration. Displacement is measured against the base and aggregated
  across LODs. Weight animations become scalar MorphTarget channels:
  `FooShape` maps to `Foo`. Carbon's exporter omits original target names, so
  unnamed exported targets become `target_n`, not reconstructed original names.
- **Animation:** missing TRS channels stay absent. Explicit one-key identity
  channels retain `preserveIdentity`, since they may override a non-identity
  rest pose. Track groups follow shared skeleton identity rather than duplicating
  channels per mesh. Matrix decomposition is checked by recomposition; rotation
  and reflected scale survive, but shear is rejected.
- **Scene and LOD:** when scenes exist, import uses mesh nodes reachable from
  the default scene and reconstructs lower LODs through `MSFT_lod.ids`.
  Coverage `[c0, c1, ..., sentinel]` becomes thresholds
  `[0xffffffff, round(c0 * 2048), round(c1 * 2048), ...]`, strictly descending;
  the sentinel creates no LOD. Export-clamped thresholds above 2048 are not
  recoverable. LODs must agree on topology, declaration, material-area count,
  joint palette, and morph declarations/names.
- **Topology:** non-indexed POINTS become PointList without an index buffer;
  strips and fans are triangulated. CMF construction fills UV densities through
  the highest TexCoord usage index, leaving missing usage indices zero.

Carbon's exporter loses source declarations, packed-frame storage, bounds,
metadata, morph names and some LOD information. Round trips are comparisons of
representable geometry/animation semantics, not byte-exact recovery.

## FBX compatibility modes

FBX reads accept `compatibility: "source" | "carbon"`. The default is
`"source"`.

`"source"` preserves FBX bind poses and `TransformLink` matrices, preserves
absolute root rest transforms and animation, accepts authored binormals, and
preserves Step interpolation.

`"carbon"` reproduces Carbon's FBX import policy:

- bind-pose overrides are ignored and inverse binds are derived from the final
  rest hierarchy;
- root rest position and rotation become zero and identity while root scale is
  retained;
- root position and rotation animation are relative to their first key;
- every animated bone is emitted as a Linear position/rotation/scale triplet,
  including position induced by FBX rotation and scaling pivots;
- arbitrary authored binormals are ignored and derived from matching normal and
  tangent channels;
- numeric user properties animated on a skeleton root become morph channels;
- BlendShapeChannel `DeformPercent` animation is ignored; and
- Step curves become Linear curves with equal-time transition keys, matching
  Carbon's baked representation rather than claiming exact Step metadata.

The FBX writer recognizes that canonical equal-time representation and emits a
component-specific combination of Constant and Linear FBX keys, so
Carbon-read animation remains writable without flattening every component to
one interpolation mode. An equal-time scalar pair that combines a linear
arrival with an instantaneous jump cannot be represented by unique-time FBX
keys and is rejected explicitly.

FBX writes also accept `compatibility: "carbon"`. Morph animation is then
dual-authored: the ordinary `DeformPercent` curve is written in percent units
for DCC tools, while a separate raw 0..1 curve is written on one skeleton-root
numeric property for Carbon. The writer selects the unique skeleton referenced
by meshes carrying animated morph targets. Ambiguous or unskinned cases fail;
`morphAnimationRoot` can select a skeleton by index, skeleton name, or unique
root-bone name. The writer never fabricates a skeleton merely to carry a curve.

When both curve forms are read in `"source"` mode, identical pairs collapse to
one CMF channel and disagreement is an error. The root property also remains a
Carbon bone-mask input; that side effect is part of the compatibility contract.

## Supported vertex and animation extensions

Source-mode FBX import and FBX export preserve indexed normal, tangent,
binormal, UV, and color sets through CMF usage indices. Import uses each
`LayerElement` reference's `TypedIndex`, not the enclosing `Layer` number. This
source-preserving behavior is broader than Carbon's FBX importer, which imports
only authored tangent space 0 and generates later tangent spaces from their UV
sets. In `"carbon"` mode authored binormals are ignored and derived as described
above. Usage indices are limited to CMF's unsigned-byte range `0..255`; readers
and writers reject out-of-range sets rather than dropping them. Three-component
glTF/CMF colors are expanded to FBX RGBA with alpha `1`.

glTF import recognizes Carbon's indexed direction names such as `_NORMAL_1`
and `_TANGENT_1`; an indexed tangent without an indexed normal uses `NORMAL_0`,
matching Carbon's exporter. It also adaptively bakes glTF `CUBICSPLINE` translation,
rotation, scale, and weight channels to the Linear curves CMF can represent;
quaternion samples are normalized and compared by sign-invariant angular error.
Quarter, midpoint, and three-quarter probes prevent symmetric cubic error from
escaping subdivision. This is a deliberate approximation with a bounded
subdivision limit, not silent reinterpretation of cubic controls.

## Explicit non-features

The following inputs remain hard errors rather than lossy conversions:

- glTF `JOINTS_n`/`WEIGHTS_n` above zero, pending an explicit influence-reduction
  policy;
- indexed glTF POINTS, pending coordinated unindexing of base and morph channels;
- non-identity glTF mesh-node transforms, pending a complete bake through
  geometry, morphs, bounds, directions and skinning;
- multiple or weighted FBX animation layers and FBX cubic tangent semantics;
  Carbon delegates these to `ufbx_bake_anim`, and the runtime has no equivalent
  evaluator;
- authored multi-LOD FBX export; Carbon generates LODs through an external
  simplifier rather than encoding a reversible FBX convention;
- FBX export of morph tangent or binormal deltas; standard FBX has no exact
  carrier and Carbon regenerates tangent space; and
- equal-time scalar animation that requires both a linear arrival and a jump
  at the same instant; unique-time FBX keys cannot carry both values; and
- multi-root skeleton export, because the Carbon morph-property carrier and
  current FBX skeleton contract require one unambiguous root.

These boundaries are tested. They should change only with a real evaluator,
an explicitly registered extension, or a newly verified Carbon convention.

## Related documentation

- [Format subpaths](README.md)
- [Granny GR2 and GSF](gr2.md)
