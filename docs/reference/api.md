# Runtime utilities API

Status: Evolving
Scope: `@carbonenginejs/runtime-utils` version 0.1
Audience: Library users and runtime authors
Summary: Lists the consolidated public API families and utility primitives.

## Import contract

The package root re-exports neutral utilities, math namespaces, and
non-conflicting constants. Type, schema, model, document, hydration, and
lifecycle APIs remain direct-subpath only.

```js
import {
    asUint8Array,
    encodeJson,
    isArrayLike,
    normalizePath
} from "@carbonenginejs/runtime-utils";
```

Every documented subpath can also be imported independently. Subpath imports
make a narrow dependency explicit:

```js
import { encodeUtf8 } from "@carbonenginejs/runtime-utils/text";
```

## Current exports

| Subpath | Purpose | Exports |
| --- | --- | --- |
| `.` | Neutral utilities, math namespaces/scalars, and non-conflicting constants. | Common root surface. |
| [`./arrays`](../../src/arrays.js) | Normalizes nullable values and mutates writable array-like targets. | `toArray`, `copyArrayLike`, `fillArrayLike` |
| [`./bytes`](../../src/bytes.js) | Creates byte views, owned copies, exact buffers, and prefix checks. | `asUint8Array`, `copyBytes`, `toArrayBuffer`, `hasBytePrefix` |
| [`./compression`](../../src/compression.js) | Detects and decompresses gzip through Web-standard streams. | `isGzip`, `decompressBytes`, `decompressGzip`, `decompressGzipIfNeeded` |
| [`./errors`](../../src/errors/index.js) | Represents coded operational failures and Web-compatible cancellation without logging or transport policy. | `CjsError`, `CjsCancellationError`, `CJS_OPERATION_CANCELLED` |
| [`./is`](../../src/is.js) | Provides shared literal-boolean value predicates. | `isTypedArray`, `isArrayLike`, `isFunction`, `isNullish`, `isObject`, `isObjectLike`, `isPlainObject`, `isPromiseLike` |
| [`./json`](../../src/json.js) | Encodes and decodes JSON with explicit UTF-8 behavior. | `encodeJson`, `decodeJson` |
| [`./lookup`](../../src/lookup.js) | Supplies stable string ordering and duplicate-safe map construction. | `compareCodeUnits`, `sortStrings`, `indexBy` |
| [`./math`](../../src/math/index.js) | Aggregates scalar and container math. | Scalar exports plus math namespaces. |
| [`./math/scalar`](../../src/math/scalar.js) | Supplies scalar limits, interpolation, angle conversion, wrapping, and smooth steps. | `defaultEpsilon`, `tau`, `clamp`, `saturate`, `lerp`, `approximatelyEqual`, `degreesToRadians`, `radiansToDegrees`, `wrapDegrees`, `wrapRadians`, `cubicHermite`, `cubicHermiteDerivative`, `smoothStep`, `smootherStep` |
| [`./path`](../../src/path.js) | Normalizes slash direction without filesystem access or dot-segment resolution. | `normalizePath` |
| [`./text`](../../src/text.js) | Encodes and decodes UTF-8 through Web-standard codecs. | `encodeUtf8`, `decodeUtf8` |
| [`./validation`](../../src/validation.js) | Provides small labelled assertions for shared input contracts. | `isPlainObject`, `assertPlainObject`, `assertNonEmptyString`, `assertSupportedVersion` |

Math containers retain top-level subpaths such as `./num`, `./vec2`, `./vec3`,
`./vec4`, `./quat`, `./mat3`, `./mat4`, `./geometry`, `./mesh`, and
`./tangent`. Matching `./math/*` aliases are also exported.

Constant families use `./media`, `./graphics`, `./render-context`, `./audio`,
`./shader`, `./d3d`, and `./webgpu`; matching `./const/*` aliases are
available. `render-context` stays out of the root because its numeric
`PixelFormat` intentionally differs from graphics' string vocabulary.

Carbon foundation families use `./types`, `./schema`, `./model`,
`./document`, `./hydration`, and `./lifecycle`.

## Operational error contract

`CjsError` represents an operation that failed after valid input reached a
runtime boundary. Package owners define their own stable uppercase `CJS_*`
codes; this family does not maintain a central code registry.

```js
import { CjsError } from "@carbonenginejs/runtime-utils/errors";

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
[Carbon type/model guide](../core-types/README.md), and the source-backed
subpath tests for the complete per-family surface.
