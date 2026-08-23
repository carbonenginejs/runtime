# Format identification and capabilities

Status: Stable
Scope: `CjsFormat`, `CjsResourceProbe`, and every concrete format facade
Audience: Format authors, runtime integrators, and diagnostics tooling
Summary: Separates synchronous routing facts from advisory output support and exact asynchronous proof.

## One format contract

Every concrete format extends the decorator-free `CjsFormat` base and declares:

- `id`: stable format identity;
- `mediaTypes`: canonical runtime media categories;
- `extensions`: lowercase dotted file suffixes used for routing;
- `outputs`: a frozen map of exact output selectors and their capabilities;
- `requestResponseType`: source acquisition response type; and
- `worker`: `null` or a frozen browser-worker execution descriptor.

An output descriptor records `output`, `payloadType`, `role`, `readMode`,
`decoded`, `passthrough`, `default`, `probes`, and `requires`. It declares a
reader path; it never claims that path has run for a particular input.

The former parallel statics and result flags are retired. In particular,
formats do not declare `type`, `inputTypes`, `outputTypes`,
`debugOutputTypes`, or `implementationStatus`, and payloads do not use
`containerOnly`, `isDecoded`, or codec-specific decode booleans. Consumers ask
the format for the relevant output capability instead.

## The four questions

`Format.is(input, options)` is a synchronous routing predicate. It returns only
a boolean and answers whether this format recognizes the input. It does not
claim that a requested decoder output works.

`Format.inspect(input, options)` is synchronous and returns structural
metadata. It describes what the bytes contain without making runtime support
or verification claims.

`Format.getSupport(input, options)` is synchronous advice. It combines the
format's structural probe with its declared output map and returns a plain,
frozen report. `options.emit` selects one exact output; omitting it selects the
declared default. Every returned capability has `verified: false` because no
decode has been executed.

`await Format.verifySupport(input, options)` is exact proof. It calls the real
`readAsync(input, { ...options, emit })` path for the selected output. Success
returns `supported: true` and `verified: true`. Failure returns
`supported: false`, `verified: true`, and a structured error with name, code,
message, details, and cause.

Normal resource loading does not call `verifySupport()` and then decode again.
A successful ordinary `readAsync()` is already proof for that load;
`verifySupport()` exists for diagnostics, setup checks, and consumers that need
to establish capability before committing to a route.

For example, the `core` layer can prove that the actual DDS RGBA path works for a
specific payload and environment:

```js
const report = await CjsDdsFormat.verifySupport(bytes, { emit: "rgba" });

if (!report.supported)
{
  throw new Error(report.error.message);
}
```

That result says nothing about DDS `texture`, `image`, or `raw`; support is
always output-specific.

## Decorator boundary

Format subpaths must remain importable from authored source, so they return
plain report objects and never import decorated model code. A resource-layer
consumer that needs persistence or model metadata calls
`CjsResourceProbe.from(report)`. The model exposes `canUseSelected()` and
`canUse(output)` without changing the format-layer contract.

## Routing rule

`CjsFormatStore` and `CjsResMan` use `Format.is()` only when content must break
an extension tie. Support reports do not select routes: a truthy report object
must never become an accidental match, and a decoder limitation must not make
the system forget which format the bytes are.

## Related documentation

- [Format subpaths](../formats/README.md)
- [Resource lifecycle](resource-lifecycle.md)
- [Browser worker execution](../reference/workers.md)
