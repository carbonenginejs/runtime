# Runtime utilities documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-utils`
Audience: Runtime authors, integrators, and maintainers
Summary: Explains the consolidated shared runtime foundation and its public families.

## Purpose

`@carbonenginejs/runtime-utils` is the bottom shared layer of the
CarbonEngineJS runtime dependency graph. It owns browser-safe primitives that
are useful across runtime libraries and do not depend on another
CarbonEngineJS package.

The package is deliberately strict about what enters this layer so it can
remain stable and low-changing after the Carbon-to-JavaScript conversion.

## Use this package when

Use `runtime-utils` when code:

- is a general runtime primitive used by more than one package;
- has stable behavior that can be described without domain policy;
- is safe in browsers and does not import Node built-ins;
- can remain independent of every other CarbonEngineJS package.

Do not use it merely as a convenient home for code without an owner.
Browser-facing demos, clients, inspectors, and usable application helpers have
the planned owner `@carbonenginejs/tools-browser`; that package is not
currently released.

## Where it fits

The package has no organization dependencies. It uses `gl-matrix` for the math
families; its subpaths remain side-effect-free and independently importable.
The `/errors` family supplies coded operational failures without defining
logging, transport, HTTP, or retry policy.

```text
runtime libraries       tools-browser (planned; unreleased)
        \                    /
         \                  /
          v                v
             runtime-utils
                  |
                  v
      Web-standard platform APIs
```

Runtime packages consume this foundation directly. The planned, unreleased
`tools-browser` package will do the same. Math, constant, type, schema, model,
document, hydration, and lifecycle ownership is consolidated here.

## Start here

Use the root export when a library consumes several utility families:

```js
import {
    encodeJson,
    isPlainObject,
    normalizePath
} from "@carbonenginejs/runtime-utils";
```

Use a public subpath when a consumer needs one focused family:

```js
import { asUint8Array } from "@carbonenginejs/runtime-utils/bytes";
```

## Documentation map

- [Architecture and admission rules](architecture.md) defines dependency
  direction, ownership, and the test for adding code.
- [Current API reference](reference/api.md) lists the implemented subpaths and
  exports.
- [Class reference](reference/classes/README.md) catalogs maintained Carbon
  foundation classes.
- [Foundation consolidation](concepts/foundation-consolidation.md) records the
  implemented ownership move and consumer migration map.

The Carbon type/model/document guide is retained under
[core-types/README.md](core-types/README.md) with updated package paths.
