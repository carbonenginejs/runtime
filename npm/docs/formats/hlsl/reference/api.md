# API reference

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` supported reader API
Audience: Users and integrators
Summary: Documents the reader class, options, output modes, and Node adapters.

## Imports

The package root exports `CjsHlslFormat` as both the default and a named
export:

```js
import CjsHlslFormat from "@carbonenginejs/runtime-resource/formats/hlsl";
import { CjsHlslFormat as NamedReader } from "@carbonenginejs/runtime-resource/formats/hlsl";
```

Additional named exports intended for advanced tooling are documented
separately in [advanced-analysis.md](advanced-analysis.md).

The versioned `@carbonenginejs/runtime-resource/formats/hlsl/portable` subpath exposes exact
version-15 body-index reflection plus first-seen exact-byte unique-body
enumeration for backend packagers. See
[portable-reflection.md](portable-reflection.md).

## Constructor

```js
const reader = new CjsHlslFormat({
    emit: "json",
    source: "effect.sm_hi",
    permutation: null,
    classes: {}
});
```

Options are reusable on an instance and can be overridden per call:

- `emit`: `"json"` (default), `"metadata"`, or advanced `"raw"` output.
- `source`: a caller-supplied label used in diagnostics and output.
- `permutation`: a `Map` or an array of `{ name, value }` selections.
- `classes`: constructors used for caller-selected JSON-node projection; this
  is not canonical runtime shader hydration.

## Instance methods

- `SetValues(options)` updates the reusable profile and returns the reader.
- `GetValues(options)` returns effective values with optional overrides.
- `SetClasses(classes)` and `SetClass(type, Class)` configure hydration.
- `GetClass(type)` and `HasClass(type)` inspect hydration registrations.
- `Read(input, options)` parses input and emits the configured graph.
- `Inspect(input, options)` returns header and technique summary data.
- `ToJSON(value)` converts reader output to JSON-compatible data.

## Static methods

- `CjsHlslFormat.isSupported(input)` performs a header-level support check.
- `CjsHlslFormat.read(input, options)` performs a one-shot read.
- `CjsHlslFormat.inspect(input, options)` performs a one-shot inspection.
- `CjsHlslFormat.toJSON(value)` converts output to JSON-compatible data.
- `CjsHlslFormat.readFile(path, options)` reads and parses a file in Node.

Inputs may be `Uint8Array`, `ArrayBuffer`, `Buffer`, or `DataView` values.
Supported container versions are 8 through 15.

## Constants

The class exposes `OUTPUT_JSON`, `OUTPUT_METADATA`, `OUTPUT_RAW`,
`CLASS_KEYS`, `type`, `mediaTypes`, `inputTypes`, `outputTypes`, and
`debugOutputTypes`. `inputTypes` contains `sm_hi`, `sm_lo`, and `sm_depth`.

## Output stability

The `json` and `metadata` modes are the supported data contracts described in
[json-graph.md](json-graph.md). `raw` returns internal parser-DTO
`Tr2EffectRes` objects, not the canonical runtime-resource class, and may
change without a major version bump.

## Repository metadata adapter

The repository provides a development script that writes metadata JSON. It is
not installed as a package `bin`:

```sh
npm run metadata:hlsl -- effect.sm_hi
npm run metadata:hlsl -- effect.sm_hi effect.json
```

When the output path is omitted, the CLI writes `<input-name>.json` in the
current working directory.

## Related documentation

- [Reading effects](../guides/reading-effects.md)
- [Hydrating JSON output](../guides/hydrating-json-output.md)
- [Advanced analysis exports](advanced-analysis.md)
- [Portable body reflection](portable-reflection.md)
- [Class catalog](classes/README.md)
