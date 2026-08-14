# Client `.static` container identification

Status: Experimental
Scope: `@carbonenginejs/runtime-resource/formats/static`
Audience: Resource integrators reading client static data
Summary: Identifies which of three unrelated containers a `.static` file holds, and decodes the one this package owns.

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

`CjsStaticFormat` identifies; it decodes only what this package owns.

- **SQLite** containers hold `cache(key, value, time)` and
  `indexes(key, value)`, with a JSON document per record.
- **Prefixed pickle** containers are decoded through `CjsPickleFormat` after
  the four-byte prefix.
- **Schema-bound** containers report `unknown` and are never guessed at.

Detection is signature-based. It never trusts a file name and never executes
anything.

## SQLite needs a driver, not an environment

SQLite is readable anywhere given a driver. A WebAssembly build opens these
bytes in a browser and the result can be persisted to OPFS or IndexedDB; Node's
own driver opens the file by path. This package ships no driver, because a
format package should not choose its callers' dependencies, so one is injected:

```js
CjsStaticFormat.read(bytes, { sqlite: openWithYourDriver });
```

Without it, `read()` throws `CJS_STATIC_DRIVER_REQUIRED` rather than claiming the
container is unreadable.

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
YAML — readable today with `CjsYamlFormat` — and it states the whole binary
layout:

```yaml
keyTypes: {min: 0, size: 4, type: int}
type: dict
valueTypes:
  attributes:
    regionID: {min: 0, size: 4, type: int}
    nameID: {min: 0, size: 4, type: int}
    center: {precision: double, size: 24, type: vector3, aliases: {x: 0, y: 1, z: 2}}
    descriptionID: {isOptional: true, min: 0, size: 4, type: int}
    neighbours: {fixedItemSize: 4, itemTypes: {min: 0, size: 4, type: int}, type: list}
keyFooter:
  fixedItemSize: 8
  itemTypes:
    attributes:
      key: {min: 0, size: 4, type: int}
      offset: {min: 0, size: 4, type: int}
```

Sizes, types, optional flags, list item sizes, vector precision and a
key-to-offset footer are all declared, so **nothing needs deriving** — unlike an
FSD container, the build ships its own layout. A generic decoder driven by this
YAML would read all six datasets, the celestial tables among them. **Not
implemented.**

## Use

```js
import { CjsStaticFormat, CJS_STATIC_FAMILIES } from
    "@carbonenginejs/runtime-resource/formats/static";

const detected = CjsStaticFormat.detect(bytes);

if (detected.family === CJS_STATIC_FAMILIES.PICKLE)
{
    const value = CjsStaticFormat.read(bytes);
}
```

`detect()` returns `{ family, byteLength, payloadOffset, prefix, decodable,
reason }`. `payload()` returns the bytes past any wrapper, which is what a
caller hands to a SQLite driver or another decoder.

`read()` throws `CJS_STATIC_FAMILY_UNSUPPORTED` for a family this package does
not own, naming the family and the reason, so a caller can route rather than
retry.

## Related documentation

- [Formats](README.md)
- [Data-only pickle protocol 0](pickle.md)
