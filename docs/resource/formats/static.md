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

`CjsStaticFormat` identifies the family, payload offset and missing inputs by
signature, never by filename. It decodes and executes nothing.

- **SQLite** holds `cache(key, value, time)` and `indexes(key, value)`,
  with a JSON document per record.
- **Embedded schema** has a four-byte schema length, then a pickled schema
  and binary payload; split them as shown below.
- **Sibling schema** reports `unknown` with `requires: "schema"`;
  `CjsSchemaBoundFormat` decodes it with the supplied companion.

## This format identifies; it does not decode

Route the inspected family to its decoder:

```js
import { CjsStaticFormat, CJS_STATIC_FAMILIES } from
    "@carbonenginejs/runtime/resource/formats/static";

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

**Changed 2026-08-15:** the former dispatching `read()` and its injected
`options.sqlite` driver were removed; only this format's own tests called it.
Callers choose decoders, or use the separate routing helpers below.

## Both of the remaining families are the same container

Both share the binary payload layout; only schema encoding differs.
Embedded schemas use the pickle reader's
[closed OrderedDict exception](pickle.md#one-global-is-rebuilt-and-it-is-a-closed-set),
not executable Python reconstruction. Sibling YAML declares sizes, types,
optional flags, list item sizes, vector precision and a key-to-offset footer;
[schema-bound decoding](schemabound.md) needs no externally derived layout.
The six sibling-schema datasets decode the regions/constellations/systems map
skeleton; embedded-schema datasets hold celestial detail (moons, planets,
belts, stars and gates).

## Use

See [format capabilities](../concepts/format-capabilities.md) for the shared
synchronous inspection seam.

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

Separate routing helpers share the identification subpath:

```js
import {
    ReadStaticContainer,          // SQLite family
    ReadEmbeddedSchemaContainer,  // schema length, pickled schema, payload
    ReadSchemaBoundContainer,     // payload plus its .schema sibling
} from "@carbonenginejs/runtime/resource/formats/static";

const skins = await ReadStaticContainer(bytes, "res:/staticdata/skins.static");
```

The `path` argument only names the file in errors. Helpers in a sibling
module import the wrapped pickle, schema-bound and SQLite formats, reaching
nothing outside `formats/`. `CjsStaticFormat` imports the shared
`CjsFormat` base, not concrete decoders: the 2026-08-15 identification
boundary remains intact.

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
