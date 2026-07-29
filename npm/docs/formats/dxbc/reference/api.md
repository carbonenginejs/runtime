# Public API reference

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/dxbc`
Audience: Shader-tool authors and lowering-backend authors
Summary: Defines the public `CjsDxbcFormat` profile, one-shot helpers, options, and failure behavior.

## Export

The package root exports `CjsDxbcFormat` as both a named and default export:

```js
import CjsDxbcFormat, {
    CjsDxbcFormat as DxbcFormat
} from "@carbonenginejs/runtime-resource/formats/dxbc";
```

No internal container, signature, program, decoder, or error class is exposed
through the package export map.

## Reusable profile

```js
const reader = new DxbcFormat({
    emit: "json",
    source: "example.dxbc",
    decodeInstructions: true
});

const decoded = reader.Read(shaderBytes);
const summary = reader.Inspect(shaderBytes);
```

| Instance method | Purpose |
| --- | --- |
| `SetValues(options)` | Merges reusable profile defaults and returns the profile. |
| `GetValues(options?)` | Returns effective values with optional per-call overrides. |
| `Read(bytes, options?)` | Reads one DXBC payload using the effective profile. |
| `Inspect(bytes, options?)` | Returns container, stage, shader-model, and signature counts without instruction decoding. |

## One-shot helpers

| Static helper | Purpose |
| --- | --- |
| `isDxbc(bytes)` | Returns `true` when input starts with the DXBC magic; invalid input returns `false`. |
| `read(bytes, options?)` | Reads one DXBC payload. |
| `inspect(bytes, options?)` | Inspects one payload without instruction decoding. |
| `toJSON(value)` | Deep-converts supported values to JSON-compatible data. |

The class also exposes `OUTPUT_JSON`, `OUTPUT_RAW`, input/output media metadata,
and the format's supported input type.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `emit` | `"json"` | `"json"` returns plain data; `"raw"` returns internal decoder objects. |
| `source` | `"memory"` | Caller-owned label included in error details; no path is opened. |
| `decodeInstructions` | `true` | When false, reads the container, signatures, and program header without decoding instructions. |

Inputs may be `Uint8Array`, `ArrayBuffer`, Node `Buffer`, `DataView`, or another
array-buffer view.

## Errors

Invalid options and unsupported input types throw `TypeError`. Malformed DXBC
throws an internal `DxbcReadError` carrying a stable human-readable message and
a `details` record with relevant source, offset, size, chunk, or opcode
information.

`isDxbc` is the non-throwing sniff operation.

## Related documentation

- [Decoded output contract](decoded-output.md)
- [Architecture and boundaries](../architecture.md)
- [Class-purpose catalog](classes/README.md)
