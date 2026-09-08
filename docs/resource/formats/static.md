# Client `.static` container identification

Status: Experimental
Scope: `@carbonenginejs/runtime/resource/formats/static`
Audience: Resource integrators reading client static data
Summary: Identifies which of three unrelated containers a `.static` file holds, so a caller can route it to the format that decodes it.

## Why this exists

`.static` names a role, not a format. Three unrelated containers ship under the
single extension, and each fails differently when guessed at. Measured across
the 45 `.static` files in one build:

| Family | Count | Signature |
|---|---:|---|
| SQLite 3 | 14 | `SQLite format 3\0` |
| Embedded schema | 25 | four-byte schema LENGTH, then `(d` or `(l` |
| Sibling schema | 6 | no signature; has a `.schema` companion |

The six unidentified files are exactly the six with a `.schema` companion —
`constellations`, `dialogs`, `factionsowningsolarsystems`, `jumps`, `regions`
and `systems` — so the detector's "unknown" set is not a gap in coverage but the
family that cannot be read without its companion.

## Boundary

`CjsStaticFormat` identifies. It decodes nothing.

- **SQLite** containers hold `cache(key, value, time)` and
  `indexes(key, value)`, with a JSON document per record.
- **Embedded-schema** containers put a schema, not a record, behind that prefix.
  The prefix is the schema's LENGTH: read `[4, 4 + length)` with
  `CjsPickleFormat` and hand the rest to `CjsSchemaBoundFormat`.
- **Sibling-schema** containers report `unknown` with `requires: "schema"`, and
  are decoded by `CjsSchemaBoundFormat` once the caller has that companion.

Detection is signature-based. It never trusts a file name and never executes
anything.

## This format identifies; it does not decode

It reports the family, where the payload starts, and what is still missing. The
caller takes that to the format that owns the family:

```js
const metadata = CjsStaticFormat.inspect(bytes);

if (metadata.family === CJS_STATIC_FAMILIES.SQLITE)
{
  return CjsSqliteFormat.readJSON(bytes);
}

if (metadata.family === CJS_STATIC_FAMILIES.PICKLE)
{
  // The prefix is the SCHEMA's length, not a wrapper to skip. Handing the whole
  // remainder to a pickle reader throws CJS_PICKLE_FORMAT_TRAILING_DATA, on the binary
  // payload, long after the schema has parsed.
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true);

  return CjsSchemaBoundFormat.read(bytes.subarray(4 + length), {
    schema: CjsPickleFormat.read(bytes.subarray(4, 4 + length))
  });
}
```

**This changed on 2026-08-15.** A `read()` here dispatched to those two formats
itself, and the SQLite family additionally required a driver injected through
`options.sqlite`. Both are gone. An identification format should not be the
routing table for two others, and deciding what to decode belongs to whoever
asked. Nothing outside this format's own tests ever called `read()`.


## Both of the remaining families are the same container

The schema is encoded differently; the payload behind it is identical.

**The pickle behind that prefix is a SCHEMA, not a record.** Protocol 0's `c`
(`GLOBAL`) and `R` form an import-and-call execution path. These files require
only `collections.OrderedDict` to preserve schema field order; the reader
rebuilds it as a plain object and refuses every other global. See
[the pickle format](pickle.md).

**The sibling-schema family states its layout in YAML:** sizes, types, optional
flags, list item sizes, vector precision and a key-to-offset footer.
**Nothing needs deriving** or pinning from an externally defined layout;
[`CjsSchemaBoundFormat`](schemabound.md) reads the supplied schema. All six
datasets decode the map skeleton of regions, constellations and systems.
Celestial detail (moons, planets, belts, stars, gates) belongs to the
embedded-schema family.

## Use

Identification uses the shared synchronous inspection seam; see
[format capabilities](../concepts/format-capabilities.md).

```js
import { CjsStaticFormat, CJS_STATIC_FAMILIES } from
    "@carbonenginejs/runtime/resource/formats/static";

const metadata = CjsStaticFormat.inspect(bytes);

if (metadata.family === CJS_STATIC_FAMILIES.PICKLE)
{
    // See the routing example above: the prefix is a schema length.
}
```

`is()` is the boolean routing predicate and `inspect()` returns the identified
family. `getSupport()` reports `recognized: true` for SQLite and prefixed
pickle, but `supported: false`: `CjsStaticFormat` deliberately declares no
outputs and decodes nothing. `verifySupport()` therefore returns
`CJS_FORMAT_OUTPUT_UNDECLARED` instead of pretending family identification is
a decoder capability.

`describe()` returns the underlying
`{ family, byteLength, payloadOffset, prefix, decodable, requires, reason }` without
building a probe. `payload()` slices at `payloadOffset`: for embedded-schema
input this removes only the four-byte length prefix, leaving the pickled schema
and binary payload together. Use the explicit split above or
`ReadEmbeddedSchemaContainer` to decode that family.

## Reading a container, rather than identifying one

Identifying a family and then routing it to the format that owns it is the same
twenty lines in every caller, so they are written once here and exported from the
same subpath:

```js
import {
    ReadStaticContainer,          // SQLite family
    ReadEmbeddedSchemaContainer,  // schema length, pickled schema, payload
    ReadSchemaBoundContainer,     // payload plus its .schema sibling
} from "@carbonenginejs/runtime/resource/formats/static";

const skins = await ReadStaticContainer(bytes, "res:/staticdata/skins.static");
```

The `path` argument only ever names the file in an error.

The routing helpers import the wrapped pickle, schema-bound and SQLite formats;
they reach nothing outside `formats/`.

`CjsStaticFormat` imports the shared `CjsFormat` base, but no concrete decoding
formats, and decodes nothing. Routing remains in a sibling module, separate from
the identification role established on 2026-08-15.

### Errors

| Code | When |
| --- | --- |
| `CJS_STATIC_FORMAT_FAMILY_UNSUPPORTED` | the bytes are a `.static` of a family this reader does not read; carries `family` |
| `CJS_STATIC_FORMAT_SHAPE_INVALID` | right family, wrong container - no `cache` table, or a schema length running past the end |
| `CJS_STATIC_FORMAT_RECORD_INVALID` | one stored value is not JSON; carries `key` |

The family check is kept even on `ReadSchemaBoundContainer`, where the caller has
already supplied a schema: those bytes carry no signature at all, so given the
wrong schema they decode into plausible nonsense rather than failing.

## Related documentation

- [Formats](README.md)
- [Data-only pickle protocol 0](pickle.md)
- [Schema-bound containers](schemabound.md)
