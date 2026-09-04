# Granny GR2 and GSF

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource/formats/gr2`
Audience: Users and integrators  
Summary: Defines the pure-JavaScript GR2/GSF reader, CMF-first GR2 writer, output modes, conversion options, graph shape, and class-hydration boundary.

## Purpose

`CjsGr2Format` reads Granny 3D `.gr2` geometry, skeleton, animation, and
morph-target data, plus Granny State `.gsf` profiles. It runs in Node and the
browser without `granny2.dll`, native addons, a GPU, or private assets.

It also writes geometry and animation GR2 files from native CMF or shared
geometry. Writing is pure JavaScript and uses CMF as the interchange boundary;
cameras and lights are outside this geometry-format contract.

The reader owns Granny container parsing, reflected type-tree walking, section
decompression, shared graph projection, JSON output, optional curve and
vertex-channel conversion, GSF projection, and caller-class hydration. Resource
caching and publication remain with `CjsResMan`; GPU realization remains with
engine packages.

Supported section compression is None, Oodle1, and the in-project clean-room
BitKnit2 decoder. Licensing and migration history are recorded in
[format provenance](provenance.md).

## Import and basic use

Import the runtime wrapper from its explicit resource format subpath:

```js
import { CjsGr2Format } from "@carbonenginejs/runtime/resource/formats/gr2";

const graph = CjsGr2Format.read(bytes);
const summary = CjsGr2Format.inspect(bytes);
const asynchronousGraph = await CjsGr2Format.readAsync(bytes);
```

`CjsGr2Format` is the one public class: the reader engine plus the normal
resource format metadata and the boolean `is(bytes)` magic probe.
The barrel exports nothing else.

Register it with `CjsResMan` when GR2/GSF should participate in ordinary
resource loading:

```js
import { CjsResMan } from "@carbonenginejs/runtime/resource";
import { CjsGr2Format } from "@carbonenginejs/runtime/resource/formats/gr2";

const resMan = new CjsResMan().Register({
  source,
  formats: [ CjsGr2Format ]
});

const resource = resMan.GetResource("res:/model/ship.gr2");
const graph = await resource.Ready();
```

Concrete formats are not imported or registered by the package root.

## Output modes

`emit` selects the representation:

| Value | Result |
|---|---|
| `"json"` | Default stable GR2 graph with plain objects |
| `"gr2Json"` | Explicit alias for the JSON graph |
| `"gr2"` | GR2 graph hydrated with caller-supplied classes |
| `"cmf"` | CMF-shaped graph hydrated with caller-supplied classes |
| `"raw"` | Low-level reflected `granny_file_info` result |

`"gr2"` and `"cmf"` require a non-empty `classes` map. Classes may also be
supplied with `"json"`/`"gr2Json"` to hydrate selected JSON nodes while
leaving omitted nodes as plain objects.

JSON is an output, not a CMF interchange format. After raw reflection the read
path branches: JSON passes the shared projection to the JSON adapter, while CMF
passes that projection directly to the CMF builder and hydrator. CMF therefore
does not call or pass through the JSON output adapter.

## Conversion options

| Option | Default | Effect |
|---|---:|---|
| `decompressCurves` | `false` | Adds decoded `knots`, `controls`, and `dimension` to supported compressed animation curves while retaining the raw curve fields |
| `unpackTangents` | `false` | Converts packed CCP tangent frames into separate normal, tangent, and binormal channels |
| `rebuildMissingNormals` | `false` | Generates absent normals from positions and triangle indices |
| `rebuildMissingTangents` | `false` | Generates absent tangents from positions, normals, UVs, and triangle indices |
| `rebuildMissingBiNormals` | `false` | Generates absent binormals from normals and tangents |
| `classes` | `{}` | Maps supported graph node keys to constructors |

Tangent unpacking and missing-channel rebuild options may be functions when a
caller needs per-mesh policy. Packed primary and morph-target frames are
preserved through CMF by default; when `unpackTangents` selects a mesh, both are
expanded together. Reflected three-component tangent and binormal members keep
their authored width rather than being padded to four before packed-frame
classification. Rebuild options fill absent data; they do not repair authored
channels that are present but incorrect.

A reusable reader profile can hold these defaults:

```js
const reader = new CjsGr2Format({
  decompressCurves: true,
  unpackTangents: true
});

const first = reader.Read(firstBytes);
const second = reader.Read(secondBytes);
```

## Writing GR2

`write` accepts a native CMF v1 graph. `writeShared` accepts shared geometry or
the GR2 JSON shape and converts it through CMF first:

```js
const bytesFromCmf = CjsGr2Format.write(cmf, {
  tangentMode: "preserve",
  compressedCurves: true
});

const bytesFromShared = CjsGr2Format.writeShared(sharedGeometry);

const writer = new CjsGr2Format();
const instanceBytes = writer.Write(cmf);
```

The output is a version-7, 32-bit little-endian Granny container with the
standard reflected `granny_file_info` geometry and animation graph. It uses one
outer section, canonical pointer and mixed-marshalling fixups, a version-2.12
type tag, and the required file CRC. The default section is uncompressed; the
writer can also experimentally frame the section and both fixup tables as
BitKnit2 raw quanta for the in-project reader.
Animation curves are independently compressed; outer section storage and curve
compression are separate concerns.

| Writer option | Default | Effect |
|---|---:|---|
| `tangentMode` | `"preserve"` | `"packed"` writes one normalized-uint8 `Tangent[4]` frame, `"unpacked"` writes separate float normal/tangent/binormal channels, and `"preserve"` retains the source layout when it is known |
| `sectionCompression` | `"none"` | `"bitknit2Raw"` experimentally emits format-4 raw-quantum storage accepted by the in-project reader; this adds framing bytes and is not size compression |
| `compressedCurves` | `true` | Selects the smallest validated Granny constant, identity, D3I1 float/8/16, D3 8/16, D4n 8/16, D9I1/D9I3 8/16, or general DaK 8/16 representation; `false` writes float knot/control curves |
| `tolerance` | `0.1` | Maximum accepted packing error for scalar and other general-dimensional curves before float fallback |
| `positionTolerance` | `0.1` | Maximum accepted position packing error before float fallback |
| `orientationTolerance` | `0.1` degrees in radians | Maximum accepted shortest quaternion angular error before fallback |
| `scaleShearTolerance` | `0.1` | Maximum accepted scale/shear packing error before float fallback |
| `sourceName` | `""` | Value written to `FromFileName` |

CMF's `PackedTangent` quaternion and `PackedTangentLegacy` angle encodings are
both accepted. Packed GR2 output uses the legacy angle frame found in the EVE
ship corpus. `writeShared` retains an incoming GR2 packed frame as CMF
`PackedTangentLegacy`, so the CMF interim does not erase this choice.

Each curve candidate is decoded through the shared reader implementation and
compared with the source at its control knots, decoded knots, animation-domain
boundaries, and representative interval samples. Orientation validation reuses
the shared quarter/midpoint sampling policy and checks every stationary point
of the normalized-linear segment error. The writer therefore moves from 8-bit
to 16-bit to float storage as needed to satisfy the relevant tolerance. Granny
format 0
(`DaKeyframes32f`) has a reflected serializer, but is not selected
automatically: its implicit timing and interpolation depend on file-level
`TimeStep` semantics that have not yet been established from a real format-0
asset or the Granny SDK.

The writer expands CMF LOD geometry into separate Granny meshes, writes
materials and mesh bindings, skin and inverse-bind data, morph targets, and
skeletal or scalar-morph animation channels. Current boundaries are explicit:

- When GR2 is converted to CMF, exact in-file siblings named
  `BaseName LOD <decimal threshold>` are reassembled beneath the unique
  unsuffixed base mesh. `_lowdetail` resource names are separate files and do
  not participate in this rule.
- Granny may attach a rigid one-bone palette to vertices which have no
  `BoneIndices`. CMF retains the model/skeleton relationship but omits that
  palette because CMF requires bone bindings and bone indices together.
- Scalar Granny vector tracks become CMF morph channels only when their names
  resolve to morph targets in the converted geometry. Other numeric-property
  tracks, including DCC bind and camera metadata, are dropped as arbitrary
  vector tracks rather than mislabeled as morph animation. An animation with
  no channels after that filtering is omitted from the CMF result.
- Carbon's Granny publishing path retains position, rotation, and scale for
  every authored transform track, including constant identity components; the
  GR2-to-CMF path does the same.

- CMF v1 stores Step and Linear curves only. Incoming Granny degree-2 curves
  are adaptively baked while entering CMF, then repacked as degree 0 or 1;
  original B-spline controls cannot be reconstructed.
- All explicit-knot compressed curve families are emitted. Granny-style
  degree-2 fitting and control reduction are a later size optimization.
- CMF v1 does not retain Granny track-group layering, accumulation and loop
  metadata, text tracks, or arbitrary vector tracks.
- EVE `MeshBoundsInfo` extended data is not emitted yet, so LOD threshold,
  bounds, area metadata, and UV-density parity are not complete.
- GSF writing, cameras, lights, and textures are not part of this writer pass.
  The reader supports Oodle1 and coded BitKnit2 sections, but the runtime does
  not contain their corresponding size-reducing encoders. `"bitknit2Raw"`
  supplies format-4 framing without claiming size compression. Its section
  width-stop metadata and native Granny SDK compatibility are not yet proven.

Generated files round-trip through the JavaScript reader and the pinned
FAUX/T3 corpus. Qualification through the proprietary Granny 2.12 SDK remains
pending because no SDK validator is installed; the in-project reader cannot by
itself prove native pointer-size marshalling.

## JSON graph and hydration

The default graph has this general shape:

```text
Root
|-- grannyFileFormatRevision, grannyFileSource
|-- meshes
|   |-- boneBindings, morphTargets
|   |-- vertex: flat numeric channels
|   `-- indices: triangle index groups
|-- models
|   `-- skeleton -> bones
`-- animations
    `-- trackGroups -> transformTracks -> curves
```

Vertex channels include positions, normals, tangents, binormals, UVs, blend
indices, and blend weights when available. `IndexGroup.faces` is a flat array
of triangle indices. Sparse morph targets carry `vertexIndices`; native and
annotation-set morph targets share the same projected shape. Morph tangent and
binormal channels retain an authored three- or four-component width; a
four-component tangent is recognized as a packed frame only when normal and
binormal are both absent.

The raw output retains reflected non-finite numbers. The shared projection used
by JSON and CMF cannot preserve useful non-finite transforms, so it uses the
semantic identity for their components: zero position, identity orientation,
and identity scale/shear. Untyped non-finite projected values retain the
established scalar-zero fallback. This does not weaken CMF validation of
genuinely authored zero quaternions.

Compressed Granny knot scales may decode a terminal knot slightly beyond the
animation duration. A positive duration remains the playable boundary, while
degree-0/1 knots and controls are preserved exactly; degree-2 curves are baked
only over the playable interval. Curves that begin outside the interval, and
zero-duration curves with later knots, remain conversion errors.

For each registered class key, hydration constructs the class without
arguments and calls:

```js
new Class().SetValues(nodeFields);
```

Constructors must therefore support zero-argument construction and
`SetValues(values)`. Supported GR2 and CMF keys are exposed through
`CjsGr2Format.CLASS_KEYS`; use `SetClass`, `SetClasses`, `GetClass`, and
`HasClass` on reusable reader instances.

`ToJSON(value)` and static `toJSON(value)` convert hydrated output into a
JSON-compatible value. They do not return JSON text; binary output uses
`Write`/`write`.

## Granny State

GSF uses the ordinary Granny container with a GState root schema. The reader
provides dedicated classification, projection, and inspection:

```js
if (CjsGr2Format.isGsf(bytes)) {
  const state = CjsGr2Format.readGsf(bytes);
  const dependencies = CjsGr2Format.inspectGsf(bytes);
}
```

The stable GSF projection contains container revision data, model and
retarget hints, the state machine, animation slots and sets, referenced
relative `.gr2` files, token count, editor data, and extended data.
`readGsfAsync` provides the equivalent promise-facing entry point.

Reflected object traversal retains a finite malformed-input depth guard. The
limit is above the deepest valid GState graph in the pinned corpus; object
identity caching is installed before member traversal so ordinary cycles do not
consume that depth repeatedly.

## Related documentation

- [Format subpaths](README.md)
- [Architecture and boundaries](../architecture.md)
- [Resource lifecycle](../concepts/resource-lifecycle.md)
- [Format ownership and provenance](provenance.md)
