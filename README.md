# @carbonenginejs/runtime

A browser-safe JavaScript runtime for EVE Online's resources: format readers, the
Space Object Factory, and a renderer built on EVE's own shaders.

**Pre-alpha.** Published as `0.1.0-alpha.0` under the `alpha` tag. The API will
change without ceremony and most of the engine is unfinished. Two parts are worth
using today:

- **The resource and format readers**, which are why most people are here. They
  read real client files and need no GPU.
- **The Space Object Factory (SOF)**, which turns a DNA string such as
  `af1_t1:amarrbase:amarr` into a described ship — hull, faction, materials and
  their parameters.

The pipelines that translate EVE's DX11 shaders to **WebGPU** and **WebGL** work,
and are how the renderer draws. The renderer around them is still being
assembled: post-processing, dynamic lights and shadows are not done.

## Install

```sh
npm install @carbonenginejs/runtime
```

## Quick start

Every format is its own subpath, so importing one pulls that format and the
shared foundation it needs — not the renderer, not a GPU, not the object graph.
The two people ask for are **GR2**, EVE's Granny mesh container, and **CMF**,
this organization's container for the same geometry.

```js
import { readFile } from "node:fs/promises";
import { CjsGr2Format } from "@carbonenginejs/runtime/resource/formats/gr2";
import { CjsCmfFormat } from "@carbonenginejs/runtime/resource/formats/cmf";

const bytes = new Uint8Array(await readFile("af1_t1.gr2"));

// The Granny graph as plain objects, following the file:
// { grannyFileFormatRevision, grannyFileSource, meshes, models, animations }
const granny = CjsGr2Format.read(bytes);

// Projected into the shared mesh form, which is what the engine consumes.
const shared = CjsCmfFormat.loadShared(granny);

for (const mesh of shared.meshes)
{
  // name, decl, lods, areas, boneBindings, morphTargets, uvDensities,
  // bounds, audioOcclusionMesh, topology, skeleton, vertex, indices
  console.log(mesh.name, mesh.lods.length, mesh.areas.length);
}
```

CMF also writes, so it is the format to use when you want geometry back out.

Two things that will otherwise cost you an afternoon. `emit: "cmf"` is **not**
the standalone path despite the name — it hydrates engine class instances and
throws without them in `options.classes`, so use the default emit and
`loadShared`. And `write` wants the native graph rather than a shared projection,
which has no section table to write from.

Other readers include `dds` for textures, `black` and `red` for EVE's object
serializations, `fsd` for static data, `fbx`/`gltf`/`obj`/`stl` for geometry,
`bnk`/`wem` for Wwise audio, and `png`/`jpeg`/`tga`/`gif`/`webp` for images. The
full set is the `./resource/formats/*` block of `package.json`.

Working from a clone rather than the package? Roughly 860 modules under `src` use
decorator syntax Node cannot parse, so import SOF, Trinity and character from
`npm/dist` after `npm run build:npm`. The published package is already built, so
this affects only this repository; the format readers above are plain JavaScript
and work either way.

## Documentation

Start with the [package documentation](docs/README.md) and the
[runtime architecture](docs/architecture.md). Ownership and class catalogs are
documented per domain: [resource](docs/resource/README.md),
[SOF](docs/sof/README.md), [Trinity](docs/trinity/README.md),
[WebGPU](docs/trinityal/webgpu/README.md), [audio](docs/audio/README.md),
[character](docs/character/README.md), [input](docs/input/README.md) and
[core](docs/core/README.md). The tracked
[migration manifest](migration/sources.json) records donor revisions, import
order, and pre-migration test evidence.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for provenance and attribution.
CarbonEngineJS includes JavaScript ports and adaptations of CarbonEngine
behavior plus independently implemented interoperability code where noted. It
is not affiliated with or endorsed by Fenris Creations or CCP Games.
