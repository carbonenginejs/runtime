# Runtime global foundation

Status: Evolving
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, integrators, and maintainers
Summary: Explains the consolidated shared runtime foundation and its public families.

## Purpose

The global foundation supplies browser-safe primitives shared by runtime
domains without a dependency on another CarbonEngineJS package.

## Use this package when

Use it for stable, policy-free primitives with a demonstrated shared need;
[architecture](./architecture.md#admission-rules) owns the admission rules.
Browser demos, clients and inspectors live in `@carbonenginejs/demos`;
[runtime tools](../tools/README.md) owns the residual file-index surface.

## Where it fits

The global layer has no higher runtime dependencies. It uses `gl-matrix` for the math
families; its subpaths remain side-effect-free and independently importable.
The `math` barrel also exposes `carbon`: a literal port of Carbon's own math
library (matrix, quaternion, vectors, plane, sphere, boxes, ellipsoid, ray,
color, float16) keeping Carbon's names, argument orders, row-vector
composition semantics, and exact arithmetic. Its values share gl-matrix's
byte layout, so the two vocabularies interoperate freely; only the
composition conventions differ. It changes and depends on none of the
existing math families, and no runtime code consumes it yet: mixing the two
composition conventions across call sites is deliberately avoided, so
adoption waits for a single coordinated migration rather than happening
piecemeal. Until then, composition code continues in gl-matrix convention.
The `/utils/errors` family supplies coded operational failures without defining
logging, transport, HTTP, or retry policy.
The `/contracts` family supplies narrow nominal identities whose required base
methods throw until a concrete owner overrides them, including the engine
lifecycle required by core's frame driver.

## Start here

The aggregate package root includes these utilities and runtime domains:

```js
import {
    encodeJson,
    isPlainObject,
    normalizePath
} from "@carbonenginejs/runtime";
```

Use a public subpath when a consumer needs one focused family:

```js
import { asUint8Array } from "@carbonenginejs/runtime/utils/bytes";
```

## Documentation map

- [Architecture and admission rules](./architecture.md) defines dependency
  direction, ownership, and the test for adding code.
- [Current API reference](./reference/api.md) lists the implemented subpaths and
  exports.
- [Class reference](./reference/classes/README.md) catalogs maintained Carbon
  foundation classes.
- [Foundation consolidation](./architecture.md#foundation-consolidation) records the
  implemented ownership move and consumer migration map.
- [Model lifecycle](./concepts/model-lifecycle.md) defines dirty settlement,
  initialization, traversal, resources, and optional lifecycle state.

The Carbon type/model/document guide is retained under
[core-types/README.md](./core-types/README.md) with updated package paths.
