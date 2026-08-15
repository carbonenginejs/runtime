# Schema-bound containers

Status: Experimental
Scope: `@carbonenginejs/runtime-resource/formats/schemabound`
Audience: Anyone reading client static data whose layout ships beside it
Summary: Reads a binary record container against the separate schema document that describes its layout, including the variable-length record section that makes a fixed-stride reader silently wrong.

## Why this exists

Some client containers carry no layout at all. They pair a binary payload with a
sibling schema document — YAML — that states every attribute's offset, width and
type, which fields are optional, how lists are strided, and how the container
indexes its own records.

That makes them the opposite of a hash-identified container, where the header
names a layout it does not describe and the layout has to be derived and pinned
per dataset. **Nothing needs deriving here.** Supply the schema and the payload
decodes.

It also makes them unusually easy to read wrongly. The bytes carry no signature,
no version and no field names, so given the wrong schema they decode into
plausible nonsense rather than failing — there is nothing in them to disagree
with. Pair each payload with the schema that shipped beside it.

## Use

```js
import { CjsSchemaBoundFormat } from
    "@carbonenginejs/runtime-resource/formats/schemabound";

const records = CjsSchemaBoundFormat.read(payloadBytes, { schema: schemaBytes });
```

`schema` accepts the schema document in any form it arrives in: YAML bytes, YAML
text, or an already-parsed object. YAML is parsed with `CjsYamlFormat`, and
anchors and aliases are rejoined — these schemas share repeated declarations that
way, and left unresolved an anchor reads as one more field.

**The schema does not always ship as a separate file.** Some containers embed it:
a `uint32` schema length, then the schema as a protocol-0 pickle, then the
payload. Read the pickle with [`CjsPickleFormat`](pickle.md) and hand the result
in as `schema`, with the payload being everything past `4 + length`. It is the
same format either way — only the schema's own encoding differs, and the type
vocabulary is a little richer because those schemas name what a number means
rather than only how wide it is.

- `read` / `readJSON` — plain JSON-compatible values; a wide integer becomes a
  decimal string.
- `readPayload` — the same, with wide integers left as `BigInt`.
- `is` / `isSupported` — **these ask about the schema, not the payload.** These
  containers have no signature, so claiming to recognize the bytes would be a
  claim this format cannot support. Which family a `.static` file belongs to is
  [`CjsStaticFormat`](static.md)'s question.

The root is whatever the schema declares: a keyed map decodes to an object, a
list decodes to an array.

## The format

Four properties are worth knowing before writing anything that consumes the
result. Each of them is a way to get a plausible wrong answer.

**A keyed container's index is at the end, and nothing points at it.** The last
four bytes of the block are the index's own size; the index starts that far back,
and begins with its entry count. Reading forward from the header will not find
it.

**Record offsets are relative to the four-byte length header, not to the file.**
Decoding from the file start reads one field early, and produces zeroes that look
like a wrong layout rather than a wrong base.

**The per-record offset table varies in length.** After the fixed attributes come
a presence bitfield and then one offset per attribute *actually present* — an
optional attribute whose bit is clear takes no slot. Consecutive records
therefore hold their variable data at different distances from their own start,
so a reader written around a constant stride decodes the first record correctly
and then drifts.

**A list has two framings and the schema says which.** `fixedItemSize` means the
items are packed at that stride. Its absence means they are variable, so the
count is followed by one offset per item, measured from the start of the list.

Two smaller rules:

- The presence bitfield is written whenever a record has a variable section at
  all, including where nothing in it is optional and the field is always zero.
  It is the offset table that shrinks, never the bitfield.
- An absent optional takes the default its schema declares. Where no default is
  declared the attribute is left off the record entirely.

## Types

| Schema type | Decoded as |
|---|---|
| `int` | number at the declared width; signed unless `min` is zero or more; `BigInt` beyond the safe range |
| `float` | number, single or double by declared size |
| `bool` | boolean |
| `enum` | the member's name, or its number when `readEnumValue` is set |
| `vector2`, `vector3` | an object keyed by the schema's own component aliases |
| `string`, `resPath`, `unicode` | length-prefixed UTF-8 |
| `localizationID`, `typeID`, `factionID` and other `*ID` names | four-byte unsigned key into another table |
| `list` | array, strided or offset-indexed as above |
| `dict` | object, framed exactly as the file's own root |
| `object` | record, as above |

## Evidence

The reader was verified field for field against the published static data export
for every container of this family in one build, and cross-checked between
containers that describe the same relationships from different sides. The
detailed measurements are recorded in the organization documentation rather than
here.

The tests in this package hold the structure instead, on containers laid out byte
by byte: the shrinking offset table, both list framings, declared defaults,
nested maps, anchors in the schema, and the widths ordinary data never reaches.

## Related documentation

- [Client `.static` container identification](static.md) — which family a file holds
- [Formats](README.md)
