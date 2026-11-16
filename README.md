# @carbonenginejs/runtime

**Coming Soon™.** Pre-alpha, published under the `alpha` tag; the API will change without notice.

JavaScript ports of CarbonEngine, the engine behind EVE Online, with readers for the files it uses. The format
readers are the part to build on today; the object graph, the renderer and the character layer are a port in
progress.

## Install

```sh
npm install @carbonenginejs/runtime@alpha
```

## Quick start

Each format is its own subpath, so importing one brings that reader and the shared code it needs, not the
renderer or a GPU. Read a Granny mesh file (GR2) and project it into the shared mesh form:

```js
import { readFile } from "node:fs/promises";
import { CjsGr2Format } from "@carbonenginejs/runtime/resource/formats/gr2";
import { CjsCmfFormat } from "@carbonenginejs/runtime/resource/formats/cmf";

const bytes = new Uint8Array(await readFile("ship.gr2"));

// The Granny graph as plain objects: { grannyFileFormatRevision, grannyFileSource, meshes, models, animations }
const granny = CjsGr2Format.read(bytes);
const shared = CjsCmfFormat.loadShared(granny);

for (const mesh of shared.meshes)
{
  console.log(mesh.name, mesh.lods.length, mesh.areas.length);
}
```

The other readers are the `./resource/formats/*` subpaths in `package.json`.

## Documentation

Start with the [package documentation](docs/README.md) and the [runtime architecture](docs/architecture.md).

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
