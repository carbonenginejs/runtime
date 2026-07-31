# @carbonenginejs/runtime-utils

Browser-safe foundations shared across CarbonEngineJS packages.

The package owns:

- neutral arrays, bytes, compression, JSON, lookup, paths, text, predicates,
  validation, and structured operational errors;
- scalar, vector, quaternion, matrix, geometry, mesh, tangent, curve, and
  noise math;
- shared media, graphics, render-context, audio, shader, D3D, and WebGPU
  constants;
- Carbon type descriptors, schema metadata, models, lifecycle state,
  documents, hydration, and dehydration.

Browser clients, remote readers, inspectors, and browser integrations belong
in `@carbonenginejs/tools-browser`. Node automation belongs in
`@carbonenginejs/tools-core`.

## Install

```sh
npm install @carbonenginejs/runtime-utils
```

## Quick start

Prefer direct subpaths so unrelated families are not initialized:

```js
import { normalizePath } from "@carbonenginejs/runtime-utils/path";
import { CjsError } from "@carbonenginejs/runtime-utils/errors";
import { cross, normalize } from "@carbonenginejs/runtime-utils/vec3";
import { PixelFormat } from "@carbonenginejs/runtime-utils/graphics";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
```

Former package imports map as follows:

- `@carbonenginejs/core-math` becomes
  `@carbonenginejs/runtime-utils/math`;
- `@carbonenginejs/core-math/<subpath>` becomes
  `@carbonenginejs/runtime-utils/<subpath>`;
- `@carbonenginejs/runtime-const` becomes
  `@carbonenginejs/runtime-utils/const`;
- `@carbonenginejs/runtime-const/<subpath>` becomes
  `@carbonenginejs/runtime-utils/<subpath>`;
- `@carbonenginejs/core-types/<subpath>` becomes the matching
  `@carbonenginejs/runtime-utils/<subpath>`; replace former root imports with
  the direct type/model/document subpaths they use.

Carbon type and model primitives use `/types`, `/schema`, `/model`,
`/document`, `/hydration`, and `/lifecycle`.

The root export is intentionally limited to common neutral utilities, math,
and non-conflicting constants. Import Carbon type/model/document families from
their direct subpaths.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and admission rules](docs/architecture.md)
- [API reference](docs/reference/api.md)
- [Foundation consolidation](docs/concepts/foundation-consolidation.md)
- [Constant vocabulary notes](docs/const-kb.md)

## License

MIT. See [LICENSE](LICENSE), [NOTICE](NOTICE), and
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
