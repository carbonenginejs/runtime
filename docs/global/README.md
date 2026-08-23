# Runtime global foundation

Status: Evolving
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, integrators, and maintainers
Summary: Explains the consolidated shared runtime foundation and its public families.

## Purpose

`@carbonenginejs/runtime` is the bottom shared layer of the
CarbonEngineJS runtime dependency graph. It owns browser-safe primitives that
are useful across runtime libraries and do not depend on another
CarbonEngineJS package.

The package is deliberately strict about what enters this layer so it can
remain stable and low-changing after the Carbon-to-JavaScript conversion.

## Use this package when

Use the runtime global foundation when code:

- is a general runtime primitive used by more than one package;
- has stable behavior that can be described without domain policy;
- is safe in browsers and does not import Node built-ins;
- can remain independent of every other CarbonEngineJS package.

Do not use it merely as a convenient home for code without an owner.
Browser-facing demos, clients, inspectors, and reusable browser helpers belong
to this repository's `demo` and `src/tools` layers, respectively; their donor
source has not migrated yet.

## Where it fits

The global layer has no higher runtime dependencies. It uses `gl-matrix` for the math
families; its subpaths remain side-effect-free and independently importable.
The `/utils/errors` family supplies coded operational failures without defining
logging, transport, HTTP, or retry policy.
The `/contracts` family supplies narrow nominal identities whose required base
methods throw until a concrete owner overrides them.

```text
runtime domains          browser tools
        \                   /
         \                 /
          v               v
            global foundation
                  |
                  v
      Web-standard platform APIs
```

Runtime domains, engines, and browser tools consume this foundation directly.
Math, constant, contract, type, schema, model, document, hydration, and
lifecycle ownership is consolidated here.

## Start here

Use the root export when a library consumes several utility families:

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
- [Foundation consolidation](./concepts/foundation-consolidation.md) records the
  implemented ownership move and consumer migration map.
- [Model lifecycle](./concepts/model-lifecycle.md) defines dirty settlement,
  initialization, traversal, resources, and optional lifecycle state.

The Carbon type/model/document guide is retained under
[core-types/README.md](./core-types/README.md) with updated package paths.
