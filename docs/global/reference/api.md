# Runtime global foundation API

Status: Evolving
Scope: `@carbonenginejs/runtime` version 0.1
Audience: Library users and runtime authors
Summary: Lists the consolidated public API families and utility primitives.

## Import contract

The package root re-exports neutral utilities, math namespaces, and
non-conflicting constants. Contracts, type, schema, model, document, hydration,
and lifecycle APIs remain direct-subpath only.

```js
import {
    asUint8Array,
    encodeJson,
    isArrayLike,
    normalizePath
} from "@carbonenginejs/runtime";
```

Every documented subpath can also be imported independently. Subpath imports
make a narrow dependency explicit:

```js
import { encodeUtf8 } from "@carbonenginejs/runtime/utils/text";
```

## Source-implemented exports

These exports are implemented and tested in the consolidated source tree. The
package remains private until the atomic consumer and registry cutover.

| Subpath | Purpose | Exports |
| --- | --- | --- |
| `.` | Neutral utilities, math namespaces/scalars, and non-conflicting constants. | Common root surface. |
| [`./utils/arrays`](../../../src/global/utils/arrays.js) | Normalizes nullable values and mutates writable array-like targets. | `toArray`, `copyArrayLike`, `fillArrayLike` |
| [`./utils/bytes`](../../../src/global/utils/bytes.js) | Creates byte views, owned copies, exact buffers, and prefix checks. | `asUint8Array`, `copyBytes`, `toArrayBuffer`, `hasBytePrefix` |
| [`./utils/compression`](../../../src/global/utils/compression.js) | Detects and decompresses gzip through Web-standard streams. | `isGzip`, `decompressBytes`, `decompressGzip`, `decompressGzipIfNeeded` |
| [`./contracts`](../../../src/global/contracts/index.js) | Declares dependency-floor nominal obligations whose required base methods throw. | `CjsBackendCandidate`, `CjsConstantPayload`, `CjsFrameLifecycle`, `CjsInstancedMeshManager`, `CjsScriptCallback`, `ITr2BoundingBox`, `withITr2BoundingBox`, `ITr2RenderNode`, `withITr2RenderNode` |
| [`./utils/errors`](../../../src/global/utils/errors/index.js) | Represents coded operational failures and Web-compatible cancellation without logging or transport policy. | `CjsError`, `CjsCancellationError`, `CJS_OPERATION_CANCELLED` |
| [`./utils/is`](../../../src/global/utils/is.js) | Provides shared literal-boolean value predicates. | `isTypedArray`, `isArrayLike`, `isFunction`, `isNullish`, `isObject`, `isObjectLike`, `isPlainObject`, `isPromiseLike` |
| [`./utils/json`](../../../src/global/utils/json.js) | Encodes and decodes JSON with explicit UTF-8 behavior. | `encodeJson`, `decodeJson` |
| [`./utils/lookup`](../../../src/global/utils/lookup.js) | Supplies stable string ordering and duplicate-safe map construction. | `compareCodeUnits`, `sortStrings`, `indexBy` |
| [`./math`](../../../src/global/math/index.js) | Aggregates scalar and container math. | Scalar exports plus math namespaces. |
| [`./math/scalar`](../../../src/global/math/scalar.js) | Supplies scalar limits, interpolation, angle conversion, wrapping, and smooth steps. | `defaultEpsilon`, `tau`, `clamp`, `saturate`, `lerp`, `approximatelyEqual`, `degreesToRadians`, `radiansToDegrees`, `wrapDegrees`, `wrapRadians`, `cubicHermite`, `cubicHermiteDerivative`, `smoothStep`, `smootherStep` |
| [`./utils/object`](../../../src/global/utils/object.js) | Provides promise-aware own-property lookup without changing the caller's object. | `hasOwnThen` |
| [`./utils/path`](../../../src/global/utils/path.js) | Normalizes generic and case-insensitive resource paths without filesystem access or dot-segment resolution. | `normalizePath`, `normalizeResourcePath`, `getResourceExtension`, `normalizeResourceExtension` |
| [`./utils/text`](../../../src/global/utils/text.js) | Encodes and decodes UTF-8 through Web-standard codecs. | `encodeUtf8`, `decodeUtf8` |
| [`./utils/validation`](../../../src/global/utils/validation.js) | Provides small labelled assertions for shared input contracts. | `isPlainObject`, `assertPlainObject`, `assertNonEmptyString`, `assertSupportedVersion` |

Math containers use focused subpaths such as `./math/num`, `./math/vec2`,
`./math/vec3`, `./math/vec4`, `./math/quat`, `./math/mat3`, `./math/mat4`,
`./math/geometry`, `./math/mesh`, and `./math/tangent`.

Constant families use `./consts/media`, `./consts/graphics`,
`./consts/render-context`, `./consts/audio`, `./consts/shader`, `./consts/d3d`,
and `./consts/webgpu`. `render-context` stays out of the root because its numeric
`PixelFormat` intentionally differs from graphics' string vocabulary.
`./consts/trinity` exports the shared `Tr2Lod` vocabulary.

Dependency-floor identities use `./contracts`. Carbon foundation families use
`./schema`, `./schema/types`, and `./model`. Transitional graph hydration stays
nested at `./model/document`, `./model/hydration`, and `./model/lifecycle`;
there is no top-level document capability.

## Operational error contract

`CjsError` represents an operation that failed after valid input reached a
runtime boundary. Package owners define their own stable uppercase `CJS_*`
codes; this family does not maintain a central code registry.

```js
import { CjsError } from "@carbonenginejs/runtime/utils/errors";

throw new CjsError(
    "CJS_EXAMPLE_PROVIDER_FAILED",
    "The example provider could not resolve the requested item.",
    {
        cause,
        details: {
            itemId,
            provider
        }
    }
);
```

The optional `cause` retains its original identity. Optional `details` must be
a plain record containing JSON-safe values; the constructor clones and deeply
freezes it. It does not redact details, so callers must exclude credentials,
private payloads, and other sensitive values.

Use native `TypeError`, `RangeError`, and `SyntaxError` for programmer-contract
violations. An expected `Find*` miss may return `null`; use a coded operational
error when acquisition, provider, state, or resolution work actually fails.
Native `AggregateError` remains the aggregate mechanism.

`CjsCancellationError` has stable code `CJS_OPERATION_CANCELLED`, uses the
Web-compatible name `AbortError`, and accepts the same cause/details options.
`CjsCancellationError.is(error)` also recognizes platform abort errors.
`CjsError.hasCode(error, code)` works with both `CjsError` and legacy errors
that expose a stable `code`.

These classes do not log, serialize, choose HTTP status, prescribe retries, or
translate errors for user interfaces.

## Environment contract

The source uses standard ECMAScript and browser APIs. Compression requires
`DecompressionStream` and `Response`; text helpers require `TextEncoder` and
`TextDecoder`. When an API is unavailable, the relevant helper reports an
explicit unsupported-environment error rather than importing a Node fallback.

## Detailed family references

See the package README, the retained
[Carbon type/model guide](../core-types/README.md),
[model lifecycle](../concepts/model-lifecycle.md), and the source-backed
subpath tests for the complete per-family surface.
