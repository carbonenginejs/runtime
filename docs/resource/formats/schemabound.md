# Schema-bound containers

Status: Experimental
Scope: `@carbonenginejs/runtime/resource/formats/schemabound`
Audience: Anyone reading client static data whose layout ships beside it
Summary: Reads a binary record container against the separate schema document that describes its layout, including the variable-length record section that makes a fixed-stride reader silently wrong.

## Why this exists

These binary payloads pair with a sibling YAML schema declaring attribute
offsets, widths, types and optionality, list strides, and record indexing.
Unlike hash-identified containers whose layouts must be derived and pinned per
dataset, **nothing needs deriving here**.

The bytes carry no signature, version or field names: a wrong schema can decode
plausible nonsense rather than fail. Always pair the payload with the schema
that shipped beside it.

## Use

```js
import { CjsSchemaBoundFormat } from
    "@carbonenginejs/runtime/resource/formats/schemabound";

const records = CjsSchemaBoundFormat.read(payloadBytes, { schema: schemaBytes });
```

`schema` accepts YAML bytes, YAML text or a parsed object. `CjsYamlFormat`
parses YAML and rejoins anchors and aliases used for shared declarations;
unresolved anchors would be misread as fields.

Embedded schemas use the same payload format but a richer type vocabulary
that names semantic meaning, not just width. The
[static-container routing example](static.md#this-format-identifies-it-does-not-decode)
shows how to split the length-prefixed pickle and supply it as `schema`.

- `read` / `readJSON` — plain JSON-compatible values; a wide integer becomes a
  decimal string.
- `readPayload` — the same, with wide integers left as `BigInt`.
- `is` — the synchronous boolean routing predicate. For this format it asks
  whether the supplied schema is structurally recognizable, not whether the
  payload matches it. These containers have no signature, so claiming to
  recognize the bytes would be a claim the format cannot support.
- `getSupport` — an advisory report derived from the schema and requested
  output. Use `verifySupport()` when the caller needs asynchronous proof that a
  particular output can actually be read.

Which family a `.static` file belongs to is
[`CjsStaticFormat`](static.md)'s question.

The root is whatever the schema declares: a keyed map decodes to an object, a
list decodes to an array.

## The format

- **Keyed index:** the block's last four bytes hold the index size; count
  backward by that size to find its entry count. No header pointer identifies it.
- **Record offsets:** relative to the four-byte length header, not the file.
  Using the file start reads one field early and can produce misleading zeroes.
- **Variable record section:** after fixed attributes come a presence bitfield
  and one offset per attribute actually present. An absent optional takes no
  offset slot, so variable data starts at different distances in consecutive
  records; a fixed-stride reader drifts after the first record.
- **List framing:** `fixedItemSize` selects packed, fixed-stride items.
  Otherwise the count is followed by one offset per item, relative to list start.
- A variable section always has a presence bitfield, even with no optional
  attributes and an all-zero field. Only the offset table shrinks.
- An absent optional uses its declared default; without one, omit the attribute.

## Types

| Schema type | Decoded as |
|---|---|
| `int` | number at the declared width; signed unless `min` is zero or more; `BigInt` beyond the safe range |
| `float` | number, single or double by declared size |
| `bool` | boolean |
| `enum` | the member's name, or its number when `readEnumValue` is set |
| `vector2`, `vector3` | an object keyed by the schema's own component aliases |
| `string`, `resPath`, `unicode` | length-prefixed UTF-8 |
| `localizationID`, `typeID`, `factionID`, `groupID`, `categoryID`, `graphicID`, `iconID`, `fsdReference` | unsigned key into another table, four bytes unless the schema says otherwise. A name outside this closed set throws rather than being guessed at |
| `list` | array, strided or offset-indexed as above |
| `dict` | object, framed exactly as the file's own root |
| `object` | record, as above |

## Evidence

The reader was verified field for field against a published static data export,
for every container of this family that HAS a corresponding export table — three
of six, plus the six that carry the celestial data. Two of the remaining three
have no table to check against at all; the third was cross-checked against a
different container describing the same relationships from the other side, which
is evidence but not the same evidence. The measurements are recorded in the
organization documentation rather than here.

The tests in this package hold the structure instead, on containers laid out byte
by byte: the shrinking offset table, both list framings, declared defaults,
nested maps, anchors in the schema, and the widths ordinary data never reaches.

## Related documentation

- [Client `.static` container identification](static.md) — which family a file holds
- [Formats](README.md)
