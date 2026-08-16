# Container readers

Status: Experimental
Scope: `@carbonenginejs/runtime-resource/containers`
Audience: Anyone reading a client `.static` file, whoever published it
Summary: Identifies a `.static` container's family and decodes it with the format that owns it, in one call, for all three families.

## What this is

`.static` names a **role**, not a format. Three unrelated containers wear the
extension, so every caller has to identify the family before it can decode
anything, and every caller writes the same twenty lines to do it. They are
written once here.

| Family | Reader | What it holds |
| --- | --- | --- |
| SQLite | `ReadStaticContainer` | `cache(key, value, time)`, each value a JSON document |
| embedded schema | `ReadEmbeddedSchemaContainer` | `uint32` schema length, a protocol-0 pickle schema, then the payload |
| `.schema` sibling | `ReadSchemaBoundContainer` | the same payload container, with the layout supplied separately as YAML |

The last two are the **same container**; only the schema's encoding and location
differ.

```js
import {
    ReadStaticContainer,
    ReadEmbeddedSchemaContainer,
    ReadSchemaBoundContainer,
} from "@carbonenginejs/runtime-resource/containers";

const skins = await ReadStaticContainer(bytes, "res:/staticdata/skins.static");
const certs = ReadEmbeddedSchemaContainer(bytes, "res:/staticdata/certificates.static");
const regions = await ReadSchemaBoundContainer(bytes, schemaBytes, "res:/staticdata/regions.static");
```

The `path` argument is only ever used to name the file in an error.

## Why this is not part of `formats/static`

Every format in this package is independently exportable and imports nothing
outside itself. `CjsStaticFormat` has **zero imports**, and importing
`formats/static` gets exactly one self-contained file that identifies a family
and decodes nothing.

These readers know four formats between them. Putting them inside
`formats/static` would mean importing that format dragged in pickle,
schema-bound and SQLite whether the caller wanted them or not. So they live at
their own subpath, and a caller opts into the weight knowingly.

That also preserves a decision made on 2026-08-15: `CjsStaticFormat.read()` used
to dispatch to two other formats, which made an identification format the routing
table for others. Routing is a separate module that happens to know all four —
not a format that reaches sideways.

## Nothing here is publisher-specific

Measured 2026-08-16 across three publishers at builds 3466501, 3466054 and
3466057: **45 `.static` files on each, split 14 SQLite, 25 embedded-schema and 6
schema-companion, with not one file unique to a publisher and not one that
changes family between them.**

Family detection is by signature and never by file name, so nothing here depends
on where the bytes came from.

## Errors

| Code | When |
| --- | --- |
| `CJS_STATIC_FORMAT_FAMILY_UNSUPPORTED` | the bytes are a `.static` container of a family this reader does not read; carries `family` |
| `CJS_STATIC_FORMAT_SHAPE_INVALID` | the family is right and the container is not what it must be — no `cache` table, or an embedded schema length that runs past the end |
| `CJS_STATIC_FORMAT_RECORD_INVALID` | one stored value is not JSON; carries `key` |

The family check is kept even on `ReadSchemaBoundContainer`, where the caller has
already supplied a schema. Those bytes carry no signature at all, so given the
wrong schema they decode into plausible nonsense rather than failing — the one
cheap guard available belongs in the path.

## Related documentation

- [The `.static` container](formats/static.md) — the identification format
- [Schema-bound containers](formats/schemabound.md)
- [Data-only pickle protocol 0](formats/pickle.md)
