# @carbonenginejs/runtime

A browser-safe JavaScript runtime for EVE Online's resources: format readers, the
Space Object Factory, and a renderer built on EVE's own shaders.

**Pre-alpha.** Published under the `alpha` tag. The API will
change without ceremony and most of the engine is unfinished. Two parts are worth
using today:

- **The resource and format readers**, which are why most people are here. They
  read real client files and need no GPU.
- **The Space Object Factory (SOF)**, which turns a DNA string such as
  `af1_t1:amarrbase:amarr` into a described ship — hull, faction, materials and
  their parameters.
- **The audio domain**, which is headless by default and realizes through Web
  Audio when a host attaches one.

The pipelines that translate EVE's DX11 shaders to **WebGPU** and **WebGL** work,
and are how the renderer draws, including post-processing, lights and shadows.

## EVE content and CCP's terms

**The code is MIT. EVE's content is not.** This package contains no game files.
It reads the EVE files you point it at: ships, shaders, textures, geometry, audio
and static data. Using those files means you have accepted CCP Games'
[EVE Online Content Creation Terms of Use](https://support.eveonline.com/hc/en-us/articles/8563917741084-EVE-Online-Content-Creation-Terms-of-Use)
(revision of 10 June 2026) and are bound by them. In short, work made from EVE
content must be non-commercial and carry CCP's disclaimer. The official page
controls, not this summary, and this is not legal advice.

EVE Online and all related assets are the property of CCP hf. CarbonEngineJS is
not affiliated with or endorsed by CCP Games or Fenris Creations.

CCP Games is now Fenris Creations. Wherever this package, its docs or
its notices say "CCP Games" or "CCP", read it as also meaning Fenris Creations.

## Install

```sh
npm install @carbonenginejs/runtime
```

## Choose an import

The default entry and focused subpaths use per-file JavaScript modules. Each
module keeps its source map, and a bundler can select the modules your app uses:

```js
import { CjsDdsFormat } from "@carbonenginejs/runtime/resource/formats/dds";
```

For the default runtime surface in one minified ESM bundle, use:

```js
import { EveSOF, blue } from "@carbonenginejs/runtime/min";
```

This entry is `dist/carbonenginejs.min.js` with its own adjacent source map.
It has the same exports as the default package entry; optional domains retain
their existing subpaths. Use one form for a shared runtime graph: mixing bundle
objects with per-file objects creates separate copies of classes and registries.
Resource workers remain separate package files, resolved relative to the bundle.

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

Working from a clone rather than the package? The resource layer, including its
format readers, is directly importable from authored source; see its
source layout (the `src/resource/index.js` module comment). Other layers still
use decorator syntax that Node cannot parse and need the `npm/dist` build from
`npm run build:npm`. The published package is already built.

## Documentation

Start with the [package documentation](docs/README.md) and the
[runtime architecture](docs/architecture.md).

The parts described above are documented in
resource, [SOF](docs/sof/README.md) and
audio, each with its ownership boundary and class
catalog.

**Work in progress, documented but not ready to build against:** the Trinity/EVE
object graph, the renderer and its WebGPU backend, and the character and input
domains. Their pages are under [docs/](docs/README.md) and describe what exists
rather than what is finished — read them as a port in flight, not as an API.

The tracked [migration manifest](migration/sources.json) records donor revisions,
import order, and pre-migration test evidence.

## License

MIT, with some third-party portions under their own permissive licences. The
package's SPDX expression is
`MIT AND BSD-3-Clause AND BSL-1.0 AND FTL AND blessing AND LicenseRef-Brumme-MD5`:

| Licence | Covers |
|---|---|
| MIT | CarbonEngineJS's own code, CarbonEngine ports, and other MIT material |
| BSD-3-Clause | the Wwise Vorbis repacker and codebook data, from ww2ogg |
| BSL-1.0 | the GR2 Oodle1 section decompressor, from nwn2mdk |
| FTL | the CFF glyph hinter and font metrics in the OpenType reader, from FreeType |
| blessing | the LEMON parser driver in the shader compiler |
| LicenseRef-Brumme-MD5 | the shader compiler's MD5, after Stephan Brumme |

Each file names its origin, and the full terms are in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and `format-notices/`. If you
bundle this package, carry those notices with it. See [LICENSE](LICENSE) and
[NOTICE](NOTICE) for provenance and attribution.
CarbonEngineJS includes JavaScript ports and adaptations of CarbonEngine
behavior plus independently implemented interoperability code where noted. It
is not affiliated with or endorsed by Fenris Creations or CCP Games.
