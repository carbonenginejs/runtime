# Granny GR2 and GSF

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource/formats/gr2`  
Audience: Users and integrators  
Summary: Defines the pure-JavaScript GR2/GSF reader, its output modes, conversion options, graph shape, and class-hydration boundary.

## Purpose

`CjsGr2Format` reads Granny 3D `.gr2` geometry, skeleton, animation, and
morph-target data, plus Granny State `.gsf` profiles. It runs in Node and the
browser without `granny2.dll`, native addons, a GPU, or private assets.

The reader owns Granny container parsing, reflected type-tree walking, section
decompression, JSON projection, optional curve and vertex-channel conversion,
GSF projection, and caller-class hydration. Resource caching and publication
remain with `CjsResMan`; GPU realization remains with engine packages.

Supported section compression is None, Oodle1, and the in-project clean-room
BitKnit2 decoder. Licensing and migration history are recorded in
[format provenance](provenance.md).

## Import and basic use

Import the runtime-resource wrapper from its explicit format subpath:

```js
import { CjsGr2Format } from "@carbonenginejs/runtime-resource/formats/gr2";

const graph = CjsGr2Format.read(bytes);
const summary = CjsGr2Format.inspect(bytes);
const asynchronousGraph = await CjsGr2Format.readAsync(bytes);
```

`CjsGr2Format` is the one public class: the reader engine plus the normal
runtime-resource format metadata and the `isSupported(bytes)` magic probe.
The barrel exports nothing else.

Register it with `CjsResMan` when GR2/GSF should participate in ordinary
resource loading:

```js
import { CjsResMan } from "@carbonenginejs/runtime-resource";
import { CjsGr2Format } from "@carbonenginejs/runtime-resource/formats/gr2";

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
caller needs per-mesh policy. Rebuild options fill absent data; they do not
repair authored channels that are present but incorrect.

A reusable reader profile can hold these defaults:

```js
const reader = new CjsGr2Format({
  decompressCurves: true,
  unpackTangents: true
});

const first = reader.Read(firstBytes);
const second = reader.Read(secondBytes);
```

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
annotation-set morph targets share the same projected shape.

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
JSON-compatible value. They do not write a binary `.gr2` file or return JSON
text.

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

## Related documentation

- [Format subpaths](README.md)
- [Architecture and boundaries](../architecture.md)
- [Resource lifecycle](../concepts/resource-lifecycle.md)
- [Format ownership and provenance](provenance.md)
