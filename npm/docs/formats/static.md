# Client `.static` container identification

Status: Experimental
Scope: `@carbonenginejs/runtime-resource/formats/static`
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
const probe = await CjsStaticFormat.resolveType(bytes);

if (probe.preferred === CJS_STATIC_FAMILIES.SQLITE)
{
  return CjsSqliteFormat.readJSON(bytes);
}

if (probe.preferred === CJS_STATIC_FAMILIES.PICKLE)
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
(`GLOBAL`) names a module and an attribute for the unpickler to import, and
`R` then calls it — the remote-execution vector — so `CjsPickleFormat` refuses
globals by design. These files need exactly one: `collections.OrderedDict`,
because a schema's attribute order is its field order. That one name is rebuilt
as a plain object and every other global is still refused. See
[the pickle format](pickle.md).

**The sibling-schema family states its layout in YAML.** The `.schema` file is
YAML and states the whole binary layout — sizes, types, optional flags, list item
sizes, vector precision and a key-to-offset footer — so **nothing needs
deriving**, unlike a container whose layout is defined outside the file and has
to be worked out and pinned. `CjsSchemaBoundFormat` reads it:
[schema-bound containers](schemabound.md). All six datasets decode — the map
skeleton of regions, constellations and systems. The celestial detail (moons,
planets, belts, stars, gates) is in the embedded-schema family, not this one.

## Use

Identification goes through the shared type-resolution seam rather than a
private entry point — see [format type resolution](../concepts/format-type-resolution.md).

```js
import { CjsStaticFormat, CJS_STATIC_FAMILIES } from
    "@carbonenginejs/runtime-resource/formats/static";

const probe = await CjsStaticFormat.resolveType(bytes);

if (probe.preferred === CJS_STATIC_FAMILIES.PICKLE)
{
    // See the routing example above: the prefix is a schema length.
}
```

`isSupported()` and its `inspect()` alias report on the declaration seam;
`resolveType()` is the content-verified one. This format is an unusual case for
that contract: `.static` carries no in-band declaration at all, so there is
nothing for the content to disagree with. The signature is both claim and
evidence, `resolveType()` is therefore always `verified`, and `metadata.declared`
is `null` with `mismatch` always false.

`describe()` returns the underlying
`{ family, byteLength, payloadOffset, prefix, decodable, requires, reason }` without
building a probe. `payload()` returns the bytes past any wrapper, which is what a
caller hands to the format that owns the family.

## Related documentation

- [Formats](README.md)
- [Data-only pickle protocol 0](pickle.md)
- [Schema-bound containers](schemabound.md)
