# @carbonenginejs/runtime

The consolidated browser-safe CarbonEngineJS runtime and renderer engines.
This repository is public; the npm package is not released yet.

Source consolidation completed on 2026-08-23. The first npm version, its
publication, and the consumer cutover remain pending. This repository
provides the executable layer boundary, migration metadata, the maintained
global foundation, the resource/format capability, the Trinity/EVE object
graph, the standalone SOF data and graph builder, the
complete headless-by-default audio domain, and the GPU-free character domain.
The browser-facing input domain remains headless until a
host is explicitly attached. The WebGPU engine is available only through its
explicit engine subpath and remains inert unless a consumer imports it. The
GPU-free composition core is also maintained here and exposes its browser
platform snapshots through a focused subpath. The file index is the only
tooling kept here, behind the explicit `/tools`
surface. `@carbonenginejs/tools-core` remains a separate Node.js package, and
the demo suite and the realtime protocol moved to `@carbonenginejs/demos`.

## Install

The source is public here, but the package is not on npm yet, so it is not
installable by name. Clone this repository and install its development
dependencies with:

```sh
npm install
```

## Quick start

Current validation checks the internal dependency graph, package maps, the
migrated foundation, all resource/format implementations, Trinity, SOF, audio,
character, input, WebGPU, composition core, and browser tools:

```sh
npm test
```

Current foundation imports include `@carbonenginejs/runtime/math`,
`@carbonenginejs/runtime/utils`, `@carbonenginejs/runtime/consts`,
`@carbonenginejs/runtime/schema`, and `@carbonenginejs/runtime/model`.
Resource consumers use `@carbonenginejs/runtime/resource`; concrete readers,
including FSD, are opt-in subpaths below
`@carbonenginejs/runtime/resource/formats/*`.
Trinity consumers use `@carbonenginejs/runtime/trinity` and its focused family
subpaths such as `/core`, `/eve`, `/renderJob`, and `/generated`.
SOF consumers use `@carbonenginejs/runtime/sof`; its `/data` subpath retains the
former lightweight data-model surface.
Audio consumers use `@carbonenginejs/runtime/audio`; graph-only users can use
`/audio/trinity`, while metadata, document, and acquisition-free builder
surfaces remain available through focused audio subpaths.
Character consumers use `@carbonenginejs/runtime/character`; acquisition-free
library building and reviewed generated source are also exposed through
`/character/library-builder` and `/character/generated`.
Input consumers use `@carbonenginejs/runtime/input` for host-window state,
keyboard and pointer normalization, and browser cursor adapters.
WebGPU consumers use `@carbonenginejs/runtime/trinityal/webgpu`; the default
runtime import does not acquire a GPU or load the engine.
Composition consumers use `@carbonenginejs/runtime/core`; browser platform and
adapter snapshots are also available through `/core/platform`.
The file index uses
`@carbonenginejs/runtime/tools` and its focused subpath; it remains absent
from the aggregate runtime export. The WebGPU engine likewise
has no root re-export, and no WebGL placeholder is advertised before a
maintained implementation exists.

## Reading EVE formats on their own

Every format reader is its own subpath under
`@carbonenginejs/runtime/resource/formats/*`, and importing one pulls in that
format plus the shared foundation it needs - not the renderer, not a GPU, and
not the object graph. For most people the geometry readers are the whole
reason to be here, so they are worth showing directly.

GR2 is EVE's mesh container. Its default read gives you the Granny graph as
plain objects:

```js
import { readFile } from "node:fs/promises";
import { CjsGr2Format } from "@carbonenginejs/runtime/resource/formats/gr2";

const bytes = new Uint8Array(await readFile("af1_t1.gr2"));
const granny = CjsGr2Format.read(bytes);

// { grannyFileFormatRevision, grannyFileSource, meshes, models, animations }
console.log(granny.meshes.length);
```

That shape follows the file. For geometry you can actually draw, project it
into the shared mesh form, which is the one the engine itself consumes:

```js
import { CjsCmfFormat } from "@carbonenginejs/runtime/resource/formats/cmf";

const shared = CjsCmfFormat.loadShared(granny);

for (const mesh of shared.meshes)
{
  // name, decl, lods, areas, boneBindings, morphTargets, bounds, topology,
  // vertex, indices, skeleton
  console.log(mesh.name, mesh.lods.length, mesh.areas.length);
}
```

CMF is this organization's own container for the same geometry, and it reads
the same way - `CjsCmfFormat.read` for the native graph, `readShared` for the
shared form, `readRaw` for sections and offsets without interpretation. It also
writes, so CMF is the format to use when you want geometry back out.

Two things that will otherwise cost you an afternoon:

- **`emit: "cmf"` is not the standalone path.** It hydrates engine class
  instances, so it requires you to pass those classes in `options.classes` and
  throws without them. Use the default emit and `loadShared` instead.
- **`write` wants the native graph, not a shared projection.** A shared
  projection has no section table, so writing one back out fails on its buffer
  references.

Other readers worth knowing: `dds` for textures, `black` and `red` for EVE's
object serializations, `fsd` for static data, `gr2`/`cmf`/`fbx`/`gltf`/`obj`/
`stl` for geometry, `bnk`/`wem` for Wwise audio, and `png`/`jpeg`/`tga`/`gif`/
`webp` for images. The full list is the `./resource/formats/*` block of
`package.json`.

### What does not work standalone yet

The package ships `src` directly, and roughly 860 of those modules use
decorator syntax (`@type.define`, `@io.persist`) that Node cannot parse. So
importing SOF, Trinity, or the character domain straight into Node fails at
parse time rather than at runtime. Those surfaces currently need a build step
that transforms decorators; the format readers above are unaffected because
they do not use them.

## Documentation

Start with the [package documentation](docs/README.md) and the
[runtime architecture](docs/architecture.md). The tracked
[migration manifest](migration/sources.json) records donor revisions, import
order, temporary history prefixes, and pre-migration test evidence.
Trinity ownership and its public class catalog are documented under
[docs/trinity](docs/trinity/README.md).
SOF ownership, boundaries, and class catalog are documented under
[docs/sof](docs/sof/README.md).
Audio ownership, import-time safety, and class catalogs are documented under
[docs/audio](docs/audio/README.md).
Character documents, native ownership, and renderer adoption gates are
documented under [docs/character](docs/character/README.md).
Input ownership and browser capability boundaries are documented under
[docs/input](docs/input/README.md).
WebGPU ownership, API, and verification are documented under
[docs/trinityal/webgpu](docs/trinityal/webgpu/README.md).
Core composition, platform snapshots, and request policy are documented under
[docs/core](docs/core/README.md).

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for provenance and attribution.
CarbonEngineJS includes JavaScript ports and adaptations of CarbonEngine
behavior plus independently implemented interoperability code where noted. It
is not affiliated with or endorsed by Fenris Creations or CCP Games.
