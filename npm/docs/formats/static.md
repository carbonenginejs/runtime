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
| Prefixed pickle | 25 | four-byte little-endian prefix, then `(d` or `(l` |
| Schema-bound | 6 | no signature; has a `.schema` companion |

The six unidentified files are exactly the six with a `.schema` companion —
`constellations`, `dialogs`, `factionsowningsolarsystems`, `jumps`, `regions`
and `systems` — so the detector's "unknown" set is not a gap in coverage but the
family that cannot be read without its companion.

## Boundary

`CjsStaticFormat` identifies. It decodes nothing.

- **SQLite** containers hold `cache(key, value, time)` and
  `indexes(key, value)`, with a JSON document per record.
- **Prefixed pickle** containers are decoded through `CjsPickleFormat` after
  the four-byte prefix.
- **Schema-bound** containers report `unknown` with `requires: "schema"`, and
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
  return CjsPickleFormat.read(CjsStaticFormat.payload(bytes));
}
```

**This changed on 2026-08-15.** A `read()` here dispatched to those two formats
itself, and the SQLite family additionally required a driver injected through
`options.sqlite`. Both are gone. An identification format should not be the
routing table for two others, and deciding what to decode belongs to whoever
asked. Nothing outside this format's own tests ever called `read()`.


## The pickles name classes, and the schemas describe layouts

Two notes that decide how the remaining families get decoded.

**The pickle family carries class-construction opcodes.** Protocol 0's `c`
(`GLOBAL`) names a module and an attribute for the unpickler to import, and
`R`/`i`/`o`/`b` then call it. That is the pickle remote-execution vector, so
`CjsPickleFormat` rejects those opcodes by design. Client `.static` pickles use
them legitimately, to name the classes their records are constructed from, so
decoding this family fully means mapping each named global to an inert
descriptor and never invoking it. **Not implemented**; the rejection is
surfaced rather than worked around, and widening it is a deliberate decision
rather than a bug fix.

**The schema-bound family is self-describing.** Its `.schema` companion is
YAML and states the whole binary layout — sizes, types, optional flags, list item
sizes, vector precision and a key-to-offset footer — so **nothing needs
deriving**, unlike an FSD container. `CjsSchemaBoundFormat` reads it:
[schema-bound containers](schemabound.md). All six datasets decode, the celestial
tables among them.

## Use

Identification goes through the shared type-resolution seam rather than a
private entry point — see [format type resolution](../concepts/format-type-resolution.md).

```js
import { CjsStaticFormat, CJS_STATIC_FAMILIES } from
    "@carbonenginejs/runtime-resource/formats/static";

const probe = await CjsStaticFormat.resolveType(bytes);

if (probe.preferred === CJS_STATIC_FAMILIES.PICKLE)
{
    const value = CjsPickleFormat.read(CjsStaticFormat.payload(bytes));
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
