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
  `indexes(key, value)`, with a JSON document per record. Opening one needs a
  database driver, which is a caller concern rather than a browser-capable one,
  so `detect()` reports the family and `read()` refuses.
- **Prefixed pickle** containers are decoded through `CjsPickleFormat` after
  the four-byte prefix. Many carry class-construction opcodes, which the
  data-only reader refuses by design; that refusal is surfaced rather than
  worked around.
- **Schema-bound** containers report `unknown` and are never guessed at.

Detection is signature-based. It never trusts a file name and never executes
anything.

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
